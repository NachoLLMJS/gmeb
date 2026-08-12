import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 4173);
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID?.trim() || '';
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET?.trim() || '';
const REDDIT_REDIRECT_URI = process.env.REDDIT_REDIRECT_URI?.trim() || `http://127.0.0.1:${PORT}/auth/reddit/callback`;
const SESSION_SECRET = process.env.SESSION_SECRET?.trim() || '';
const OAUTH_CONFIGURED = Boolean(REDDIT_CLIENT_ID && REDDIT_CLIENT_SECRET && SESSION_SECRET.length >= 32);
const isProduction = process.env.NODE_ENV === 'production';
const sessionCookieName = isProduction ? '__Host-gmeb_session' : 'gmeb_session';
const eligibilityAttempts = new Map();

if (isProduction && SESSION_SECRET.length < 32) {
  throw new Error('Production requires SESSION_SECRET with at least 32 characters.');
}

app.disable('x-powered-by');
app.use(express.json({ limit: '8kb' }));
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://www.reddit.com");
  next();
});

const base64url = value => Buffer.from(value).toString('base64url');
const unbase64url = value => Buffer.from(value, 'base64url');
const sessionKey = SESSION_SECRET ? crypto.createHash('sha256').update(SESSION_SECRET).digest() : null;

function seal(payload) {
  if (!sessionKey) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', sessionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map(base64url).join('.');
}

function unseal(value) {
  if (!sessionKey || !value) return null;
  try {
    const [iv, tag, ciphertext] = value.split('.').map(unbase64url);
    if (!iv || !tag || !ciphertext) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', sessionKey, iv);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8'));
  } catch { return null; }
}

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(part => {
    const index = part.indexOf('=');
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))];
  }));
}

function setSession(res, payload, maxAgeSeconds = 3600) {
  const flags = [`${sessionCookieName}=${encodeURIComponent(seal(payload))}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSeconds}`];
  if (isProduction) flags.push('Secure');
  res.setHeader('Set-Cookie', flags.join('; '));
}

function clearSession(res) {
  res.setHeader('Set-Cookie', `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? '; Secure' : ''}`);
}

function getSession(req) {
  const session = unseal(cookies(req)[sessionCookieName]);
  if (!session || session.expiresAt < Date.now()) return null;
  return session;
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function eligibilityRateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const recent = (eligibilityAttempts.get(key) || []).filter(timestamp => now - timestamp < 60_000);
  if (recent.length >= 5) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too many eligibility checks. Please wait one minute.' });
  }
  recent.push(now);
  eligibilityAttempts.set(key, recent);
  next();
}

async function redditRequest(url, accessToken) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'web:gmeb-claim:v0.1 (by /u/gmeb-app)'
    },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Reddit API returned ${response.status}`);
  return response.json();
}

app.get('/api/session', (req, res) => {
  const session = getSession(req);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ configured: OAUTH_CONFIGURED, authenticated: Boolean(session?.user), user: session?.user || null });
});

app.get('/auth/reddit', (req, res) => {
  if (!OAUTH_CONFIGURED) return res.redirect('/?auth=setup');
  const state = crypto.randomBytes(24).toString('base64url');
  setSession(res, { oauthState: state, expiresAt: Date.now() + 10 * 60_000 }, 600);
  const params = new URLSearchParams({
    client_id: REDDIT_CLIENT_ID,
    response_type: 'code',
    state,
    redirect_uri: REDDIT_REDIRECT_URI,
    duration: 'temporary',
    scope: 'identity history read'
  });
  res.redirect(`https://www.reddit.com/api/v1/authorize?${params}`);
});

app.get('/auth/reddit/callback', async (req, res) => {
  const pending = getSession(req);
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  if (!OAUTH_CONFIGURED || !code || !state || !pending?.oauthState || !safeEqual(state, pending.oauthState)) {
    clearSession(res);
    return res.redirect('/?auth=error');
  }
  try {
    const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDDIT_REDIRECT_URI });
    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'web:gmeb-claim:v0.1 (by /u/gmeb-app)'
      },
      body,
      signal: AbortSignal.timeout(12000)
    });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || !token.access_token) throw new Error('Token exchange failed');
    const me = await redditRequest('https://oauth.reddit.com/api/v1/me', token.access_token);
    if (!me?.name || !me?.id) throw new Error('Identity response was incomplete');
    const expiresIn = Math.min(Number(token.expires_in || 3600), 3600);
    setSession(res, {
      user: { id: String(me.id), name: String(me.name), createdUtc: Number(me.created_utc || 0) },
      accessToken: String(token.access_token),
      expiresAt: Date.now() + expiresIn * 1000
    }, expiresIn);
    res.redirect('/#vault');
  } catch (error) {
    console.error('Reddit OAuth callback failed:', error.message);
    clearSession(res);
    res.redirect('/?auth=error');
  }
});

app.post('/auth/logout', async (req, res) => {
  const session = getSession(req);
  if (session?.accessToken && OAUTH_CONFIGURED) {
    try {
      await fetch('https://www.reddit.com/api/v1/revoke_token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'web:gmeb-claim:v0.1 (by /u/gmeb-app)'
        },
        body: new URLSearchParams({ token: session.accessToken, token_type_hint: 'access_token' }),
        signal: AbortSignal.timeout(5000)
      });
    } catch (error) {
      console.warn('Reddit token revocation did not complete:', error.message);
    }
  }
  clearSession(res);
  res.status(204).end();
});

app.post('/api/eligibility', eligibilityRateLimit, async (req, res) => {
  const session = getSession(req);
  res.setHeader('Cache-Control', 'no-store');
  if (!session?.accessToken || !session?.user) return res.status(401).json({ error: 'Connect Reddit before checking eligibility.' });
  try {
    let after = '';
    let match = null;
    let scanned = 0;
    for (let page = 0; page < 10 && !match; page += 1) {
      const params = new URLSearchParams({ limit: '100', raw_json: '1' });
      if (after) params.set('after', after);
      const listing = await redditRequest(`https://oauth.reddit.com/user/${encodeURIComponent(session.user.name)}/comments?${params}`, session.accessToken);
      const children = Array.isArray(listing?.data?.children) ? listing.data.children : [];
      scanned += children.length;
      match = children.map(child => child?.data).find(comment => String(comment?.subreddit || '').toLowerCase() === 'wallstreetbets') || null;
      after = listing?.data?.after || '';
      if (!after || children.length === 0) break;
    }
    res.json({
      eligible: Boolean(match),
      scanned,
      comment: match ? {
        id: String(match.id || ''),
        createdUtc: Number(match.created_utc || 0),
        permalink: `https://www.reddit.com${String(match.permalink || '')}`,
        subreddit: String(match.subreddit || '')
      } : null,
      claimReady: false
    });
  } catch (error) {
    console.error('Eligibility check failed:', error.message);
    res.status(502).json({ error: 'Reddit could not complete the comment check. Please reconnect and retry.' });
  }
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: isProduction ? '1h' : 0 }));
app.get('/health', (_req, res) => res.json({ ok: true, oauthConfigured: OAUTH_CONFIGURED, claimReady: false }));
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, '127.0.0.1', () => console.log(`GMEB frontend listening on http://127.0.0.1:${PORT} (Reddit OAuth: ${OAUTH_CONFIGURED ? 'configured' : 'setup required'})`));
}

export { app, seal, unseal };
export default app;
