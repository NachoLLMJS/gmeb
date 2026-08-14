import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';

const root = new URL('../public/', import.meta.url);
const read = path => fs.readFile(new URL(path, root), 'utf8');

const workers = [
  'pixel-agent-0',
  'pixel-agent-1',
  'pixel-agent-2',
  'pixel-agent-3',
  'pixel-agent-4',
  'pixel-agent-5'
];

const rejectedWorkers = [
  'red-ledger',
  'green-candle',
  'squeeze-mechanic',
  'night-auditor',
  'last-holder'
];

test('retro terminal is built around a Phaser office rather than a marketing hero', async () => {
  const html = await read('index.html');
  assert.match(html, /GMEB OFFICE TERMINAL/);
  assert.match(html, /id="office-canvas"/);
  assert.match(html, /ONCHAIN STOCK DESK/);
  assert.match(html, /12H MARKET NEWS/);
  assert.match(html, /REPLAY MINT SPAWN/);
  assert.doesNotMatch(html, /class="hero/);
  assert.doesNotMatch(html, /class="nft-card/);
});

test('six Pixel Agents animated sheets replace every rejected worker model', async () => {
  const game = await read('office-game.js');
  const app = await read('app.js');
  const html = await read('index.html');
  for (const slug of workers) {
    assert.match(game, new RegExp(`workers/${slug}\\.png`));
    const image = await fs.readFile(new URL(`assets/office/workers/${slug}.png`, root));
    assert.equal(image.subarray(1, 4).toString(), 'PNG');
  }
  for (const slug of rejectedWorkers) {
    assert.doesNotMatch(game, new RegExp(slug));
    assert.doesNotMatch(app, new RegExp(slug));
    assert.doesNotMatch(html, new RegExp(slug));
  }
  assert.match(game, /frameWidth:\s*16/);
  assert.match(game, /frameHeight:\s*32/);
  assert.match(game, /walk-down/);
  assert.match(game, /walk-up/);
  assert.match(game, /walk-side/);
  assert.match(game, /type-front/);
  assert.match(game, /read-front/);
  assert.match(game, /spawnMintedWorker/);
  assert.match(game, /physics\.add\.staticGroup/);
  assert.match(game, /physics\.add\.collider/);
  assert.match(game, /collision-debug/);
  assert.match(game, /pixel-agents\/floors\/floor_/);
  assert.match(game, /pixel-agents\/walls\/wall_0\.png/);
  assert.match(game, /pixel-agents\/furniture\//);
  assert.doesNotMatch(game, /nameLabel/);
  assert.doesNotMatch(game, /drawDeskCluster/);
  assert.doesNotMatch(game, /`\$\{data\.token\} \$\{data\.brand\}`/);
  assert.match(html, /PIXEL AGENTS MIT/);
});

test('Pixel Agents seating and z-order follow the upstream renderer rules', async () => {
  const game = await read('office-game.js');
  assert.match(game, /CHARACTER_SITTING_OFFSET_PX\s*=\s*6/);
  assert.match(game, /CHARACTER_Z_SORT_OFFSET\s*=\s*0\.5/);
  assert.match(game, /setOrigin\(0\.5, 1\)/);
  assert.match(game, /category\s*===\s*'chairs'/);
  assert.match(game, /orientation\s*===\s*'back'/);
  assert.match(game, /canPlaceOnSurfaces/);
  assert.match(game, /sprite\.y\s*\+\s*TILE\s*\/\s*2\s*\+\s*CHARACTER_Z_SORT_OFFSET/);
});

test('three distinct office layouts are selectable without reloading the page', async () => {
  const game = await read('office-game.js');
  const html = await read('index.html');
  for (const value of ['trading', 'bnb-strategy', 'flap-lab']) {
    assert.match(html, new RegExp(`value="${value}"`));
    assert.match(game, new RegExp(`['"]${value}['"]`));
  }
  assert.match(html, /pixel-agent-5\.png/);
  assert.match(game, /office-location/);
  assert.match(game, /scene\.restart/);
  assert.match(game, /OFFICE_CONFIGS/);
});

test('vault panels are stacked on the right without fake header controls or activity footer', async () => {
  const html = await read('index.html');
  assert.doesNotMatch(html, /AGENT ACTIVITY SUMMARY/);
  assert.match(html, /<div class="titlebar"><span>FLAP VAULT STATUS<\/span><\/div>/);
  assert.ok(html.indexOf('VAULT EVENT FEED') > html.indexOf('FLAP VAULT STATUS'));
});

test('wallet is opt-in and all blockchain writes fail closed', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  assert.match(app, /connect-wallet/);
  assert.match(app, /eth_requestAccounts/);
  assert.doesNotMatch(app, /eth_accounts/);
  assert.doesNotMatch(app, /eth_sendTransaction/);
  assert.match(html, /CONTRACTS PENDING/);
  assert.match(html, /ORACLE PENDING/);
  assert.match(html, /NOT YET DEPLOYED/);
});

test('news UI uses the same-origin cached RSS endpoint', async () => {
  const app = await read('app.js');
  assert.match(app, /\/api\/market-news/);
  assert.match(app, /12 hours/i);
});
