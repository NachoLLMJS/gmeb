import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const consoleMessages = new Set();
const failedRequests = [];
page.on('console', message => consoleMessages.add(`${message.type()}: ${message.text()}`));
page.on('requestfailed', request => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText}`));
page.on('response', response => {
  if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
});
await page.goto('http://127.0.0.1:4173/?v=office-pixel-agents-2', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.click('[data-worker="2"]');
await page.click('#replay-mint');
await page.waitForTimeout(1600);
await page.click('#collision-debug');
await page.waitForTimeout(150);
await page.evaluate(() => {
  const scene = window.gmebOffice;
  const worker = scene?.workers?.get(0);
  if (worker) {
    scene.beginWander(worker, 10000);
    scene.goToWork(worker);
  }
});
await page.waitForTimeout(1800);
const diagnostics = await page.evaluate(() => {
  const scene = window.gmebOffice;
  const keys = Object.keys(scene?.textures?.list || {});
  const expected = ['pa-floor-0', 'pa-floor-1', 'pa-floor-3', 'pa-floor-5', 'pa-floor-7', 'pa-wall', 'pa-furn-desk', 'pa-furn-meetingTable', 'pixel-agent-0', 'pixel-agent-1', 'pixel-agent-2', 'pixel-agent-3', 'pixel-agent-4', 'pixel-agent-5'];
  const rejected = ['red-ledger', 'green-candle', 'squeeze-mechanic', 'night-auditor', 'last-holder'];
  return {
    sceneReady: Boolean(scene),
    expectedTextures: expected.map(key => ({ key, exists: scene?.textures?.exists(key), frames: scene?.textures?.get(key)?.frameTotal })),
    rejectedTextures: rejected.map(key => ({ key, exists: scene?.textures?.exists(key) })),
    textureKeys: keys,
    canvasCount: document.querySelectorAll('#office-canvas canvas').length,
    workerCount: scene?.workers?.size,
    phaserTextCount: scene?.children?.list?.filter(child => child.type === 'Text').length,
    furnitureTextureCount: keys.filter(key => key.startsWith('pa-furn-')).length,
    workerAnimations: [...(scene?.workers?.values() || [])].map(sprite => ({
      slug: sprite.workerData?.slug,
      action: sprite.workerData?.action,
      animation: sprite.anims?.currentAnim?.key,
      frame: sprite.frame?.name
    })),
    portraitSources: [...document.querySelectorAll('#selected-portrait, .worker-tab img')].map(image => image.getAttribute('src')),
    selectedWorker: document.querySelector('#selected-worker-name')?.textContent,
    collisionButton: document.querySelector('#collision-debug')?.textContent,
    collisionDebugVisible: scene?.debugVisible,
    seatedWorkerPosition: scene?.workers?.get(0) ? {
      x: Math.round(scene.workers.get(0).x),
      y: Math.round(scene.workers.get(0).y),
      activity: scene.workers.get(0).activity,
      seatIndex: scene.workers.get(0).seatIndex
    } : null,
    horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth
  };
});
await page.click('#collision-debug');
const officeVariants = {};
for (const officeId of ['trading', 'bnb-strategy', 'flap-lab']) {
  await page.selectOption('#office-location', officeId);
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    ready = await page.evaluate(id => window.gmebOffice?.officeId === id && window.gmebOffice?.workers?.size === 6, officeId);
    if (ready) break;
    await page.waitForTimeout(100);
  }
  assert.equal(ready, true, `office ${officeId} did not finish restarting`);
  await page.waitForTimeout(500);
  officeVariants[officeId] = await page.evaluate(() => ({
    officeId: window.gmebOffice.officeId,
    workerCount: window.gmebOffice.workers.size,
    seatCount: window.gmebOffice.workstations.length,
    phaserTextCount: window.gmebOffice.children.list.filter(child => child.type === 'Text').length
  }));
  await page.screenshot({ path: `qa-office-${officeId}.png`, fullPage: true });
}
console.log(JSON.stringify({ diagnostics, officeVariants, failedRequests, consoleMessages: [...consoleMessages].slice(0, 30) }, null, 2));
assert.equal(diagnostics.sceneReady, true);
assert.equal(diagnostics.canvasCount, 1);
assert.equal(diagnostics.workerCount, 6);
assert.equal(diagnostics.phaserTextCount, 0);
assert.ok(diagnostics.furnitureTextureCount >= 20);
assert.equal(failedRequests.length, 0);
assert.equal(diagnostics.horizontalOverflow, 0);
assert.ok(diagnostics.expectedTextures.every(texture => texture.exists));
assert.ok(diagnostics.expectedTextures.filter(texture => texture.key.startsWith('pixel-agent-')).every(texture => texture.frames === 22));
assert.ok(diagnostics.rejectedTextures.every(texture => !texture.exists));
assert.ok(diagnostics.workerAnimations.some(worker => worker.animation?.includes('type-front')));
assert.ok(diagnostics.workerAnimations.some(worker => worker.animation?.includes('read-front')));
assert.ok(diagnostics.workerAnimations.some(worker => worker.animation?.includes('walk-')));
assert.ok(['typing', 'reading'].includes(diagnostics.seatedWorkerPosition?.activity));
assert.notEqual(diagnostics.seatedWorkerPosition?.seatIndex, null);
assert.ok(diagnostics.portraitSources.every(source => source?.includes('/assets/office/portraits/pixel-agent-')));
assert.deepEqual(Object.keys(officeVariants), ['trading', 'bnb-strategy', 'flap-lab']);
assert.ok(Object.values(officeVariants).every(office => office.workerCount === 6 && office.seatCount >= 5 && office.phaserTextCount === 0));
await browser.close();
