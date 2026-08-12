import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import { seal, unseal } from '../server.js';

test('encrypted session roundtrip works when configured', () => {
  if (!process.env.SESSION_SECRET) return;
  const payload = { user: { id: 'abc', name: 'deepfvalue' }, expiresAt: Date.now() + 1000 };
  const token = seal(payload);
  assert.ok(token.split('.').length === 3);
  assert.deepEqual(unseal(token), payload);
});

test('tampered encrypted session is rejected', () => {
  if (!process.env.SESSION_SECRET) return;
  const token = seal({ expiresAt: Date.now() + 1000 });
  const parts = token.split('.');
  parts[2] = `${parts[2][0] === 'A' ? 'B' : 'A'}${parts[2].slice(1)}`;
  assert.equal(unseal(parts.join('.')), null);
});

test('health and session endpoints fail closed without credentials', async () => {
  const { app } = await import('../server.js');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address();
  try {
    const health = await fetch(`http://127.0.0.1:${port}/health`).then(r => r.json());
    assert.equal(health.ok, true);
    assert.equal(health.claimReady, false);
    const session = await fetch(`http://127.0.0.1:${port}/api/session`).then(r => r.json());
    assert.equal(session.authenticated, false);
  } finally { server.close(); }
});

test('public copy does not promise a queue or claim authorization', async () => {
  const html = await fs.readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const appJs = await fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /claim queue/i);
  assert.doesNotMatch(appJs, /<h3>Eligible<\/h3>/);
  assert.match(html, /does not authorize a token claim/i);
});

test('public login entry uses the native Devvit playtest, not legacy OAuth setup', async () => {
  const appJs = await fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(appJs, /REDDIT SETUP REQUIRED/);
  assert.doesNotMatch(appJs, /href=["']\/auth\/reddit["']/);
  assert.match(appJs, /https:\/\/www\.reddit\.com\/r\/gmeb6900_dev\/\?playtest=gmeb6900/);
});

test('eligibility endpoint rate limits repeated requests', async () => {
  const { app } = await import('../server.js');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address();
  try {
    let status = 0;
    for (let i = 0; i < 7; i += 1) {
      status = (await fetch(`http://127.0.0.1:${port}/api/eligibility`, { method: 'POST' })).status;
    }
    assert.equal(status, 429);
  } finally { server.close(); }
});
