// Local verification for Vice Cover Studio (NOT part of the submitted
// app): serves app/, takes the screenshots in shots.json, and tests PNG
// export in all three sizes. Run: node dev/shots.mjs [base-url]
import { chromium } from '/home/hatch/workspace/makefun/tools/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';

const ROOT = '/home/hatch/workspace/makefun/gta6-cover-art-01/record';
const shots = JSON.parse(readFileSync(`${ROOT}/shots.json`, 'utf8'));
const base = process.argv[2] || 'http://localhost:8080';
const outDir = `${ROOT}/screenshots`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

for (const shot of shots) {
  await page.setViewportSize({ width: shot.w, height: shot.h });
  await page.goto(`${base}/${shot.query}`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 30000 });
  } catch {
    console.log(`${shot.name}: SHOT NOT READY`);
    continue;
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/${shot.name}`, type: 'jpeg', quality: 82 });
  console.log(`${shot.name}: saved ${shot.w}x${shot.h}`);
}

// Export test: load the editor, pick the Pier sample, export each size.
await page.setViewportSize({ width: 1280, height: 720 });
await page.goto(base, { waitUntil: 'load' });
await page.waitForTimeout(500);
await page.click('[data-sample="pier"]');
await page.waitForTimeout(800);
const state = await page.evaluate(() => ({
  hasPhoto: !!window.__vice.state.photos.hero,
  face: window.__vice.state.photos.hero?.face || null,
  title: window.__vice.state.title,
}));
console.log('editor state:', JSON.stringify(state));
await page.evaluate(() => {
  window.__downloads = [];
  const orig = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download) window.__downloads.push(this.download);
    return orig.call(this);
  };
});
for (const label of ['1:1', '4:5', '16:9']) {
  await page.selectOption('#size', label);
  await page.click('#export');
  await page.waitForTimeout(900);
}
await page.click('#export-all');
await page.waitForTimeout(2000);
console.log('export clicks recorded:', JSON.stringify(await page.evaluate(() => window.__downloads)));
console.log('status:', await page.evaluate(() => document.getElementById('status').textContent));
console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
