import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 4173);
const isProduction = process.env.NODE_ENV === 'production';
const NEWS_CACHE_MS = 12 * 60 * 60 * 1000;
const DEFAULT_RSS_URL = 'https://news.google.com/rss/search?q=(GME%20OR%20NVDA%20OR%20TSLA%20OR%20COIN%20OR%20HOOD)%20stock%20market&hl=en-US&gl=US&ceid=US:en';
const RSS_URL = process.env.MARKET_NEWS_RSS?.trim() || DEFAULT_RSS_URL;
let newsCache = { expiresAt: 0, fetchedAt: null, items: [] };

app.disable('x-powered-by');
app.use(express.json({ limit: '8kb' }));
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  next();
});

function decodeXml(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<[^>]*>/g, '')
    .trim();
}

function tag(item, name) {
  const match = item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return decodeXml(match?.[1] || '');
}

function parseRss(xml) {
  return [...String(xml).matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)]
    .map(match => {
      const item = match[1];
      const url = tag(item, 'link');
      if (!/^https?:\/\//i.test(url)) return null;
      return {
        title: tag(item, 'title'),
        url,
        publishedAt: tag(item, 'pubDate'),
        source: tag(item, 'source') || 'Market wire'
      };
    })
    .filter(item => item?.title)
    .slice(0, 8);
}

async function loadMarketNews() {
  const now = Date.now();
  if (newsCache.expiresAt > now && newsCache.items.length) {
    return { ...newsCache, cached: true, available: true };
  }
  try {
    const response = await fetch(RSS_URL, {
      headers: { 'User-Agent': 'GMEB-Office-Terminal/0.2 (+local prototype)' },
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) throw new Error(`RSS returned ${response.status}`);
    const items = parseRss(await response.text());
    if (!items.length) throw new Error('RSS returned no usable items');
    newsCache = {
      items,
      fetchedAt: new Date(now).toISOString(),
      expiresAt: now + NEWS_CACHE_MS
    };
    return { ...newsCache, cached: false, available: true };
  } catch (error) {
    return {
      items: newsCache.items,
      fetchedAt: newsCache.fetchedAt,
      expiresAt: newsCache.expiresAt,
      cached: Boolean(newsCache.items.length),
      available: Boolean(newsCache.items.length),
      error: 'Market news is temporarily unavailable.'
    };
  }
}

app.get('/api/market-news', async (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json(await loadMarketNews());
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: isProduction ? '1h' : 0 }));
app.get('/health', (_req, res) => res.json({
  ok: true,
  contractsReady: false,
  newsCacheHours: NEWS_CACHE_MS / 3_600_000
}));
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, '127.0.0.1', () => console.log(`GMEB Office Terminal listening on http://127.0.0.1:${PORT}`));
}

export { app, parseRss, NEWS_CACHE_MS, loadMarketNews };
export default app;
