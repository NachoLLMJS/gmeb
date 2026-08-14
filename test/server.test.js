import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { app, parseRss, NEWS_CACHE_MS } from '../server.js';

test('RSS parser extracts safe headline records', () => {
  const xml = `<?xml version="1.0"?><rss><channel><item><title>GME expands treasury</title><link>https://example.com/gme</link><pubDate>Fri, 14 Aug 2026 10:00:00 GMT</pubDate><source>Example Wire</source></item></channel></rss>`;
  assert.deepEqual(parseRss(xml), [{
    title: 'GME expands treasury',
    url: 'https://example.com/gme',
    publishedAt: 'Fri, 14 Aug 2026 10:00:00 GMT',
    source: 'Example Wire'
  }]);
});

test('market news cache is exactly twelve hours', () => {
  assert.equal(NEWS_CACHE_MS, 12 * 60 * 60 * 1000);
});

test('health endpoint describes pending contracts and RSS cadence', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address();
  try {
    const health = await fetch(`http://127.0.0.1:${port}/health`).then(response => response.json());
    assert.equal(health.ok, true);
    assert.equal(health.contractsReady, false);
    assert.equal(health.newsCacheHours, 12);
  } finally {
    server.close();
  }
});

test('Vercel upload keeps dependency manifests and excludes local research artifacts', async () => {
  const ignore = await readFile(new URL('../.vercelignore', import.meta.url), 'utf8');
  assert.doesNotMatch(ignore, /(^|\/)package(?:-lock)?\.json$/m);
  assert.match(ignore, /^vendor\/$/m);
  assert.match(ignore, /^research\/$/m);
  assert.match(ignore, /^qa-office-\*\.png$/m);
});

test('static page remains reachable', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /GMEB OFFICE TERMINAL/);
  } finally {
    server.close();
  }
});
