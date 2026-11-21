// One-off export check: loads the editor, clicks Export all, and verifies
// four PNG downloads land with the right names and dimensions.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/home/hatch/workspace/makefun/tools/node_modules/playwright/index.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(root, 'tmp', 'export-check');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const port = 8124;
const server = spawn(process.execPath, ['serve.ts', '--port', String(port)], { cwd: root, stdio: 'ignore' });
async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/`);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('server did not come up');
}

const chromePath = join(process.env.HOME, '.cache/ms-playwright/chromium-1255/chrome-linux64/chrome');
const expected = {
  'vice-cover-1080x1080.png': [1080, 1080],
  'vice-cover-1280x720.png': [1280, 720],
  'vice-cover-1080x1350.png': [1080, 1350],
  'vice-cover-1920x1080.png': [1920, 1080],
};

let bad = 0;
try {
  await waitForServer();
  const browser = await chromium.launch({ executablePath: chromePath, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/?shot=editor&photo=pier&caption=Export%20Test`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 15000 });

  const downloads = [];
  page.on('download', async (dl) => {
    const path = join(outDir, dl.suggestedFilename());
    await dl.saveAs(path);
    downloads.push(path);
  });
  await page.click('#exportAll');
  await page.waitForTimeout(4000);
  await browser.close();

  for (const [name, dims] of Object.entries(expected)) {
    const file = join(outDir, name);
    if (!existsSync(file)) {
      console.log(`${name}: MISSING`);
      bad += 1;
      continue;
    }
    const buf = readFileSync(file);
    // PNG header: width at bytes 16-19, height at 20-23, big-endian.
    const pw = buf.readUInt32BE(16);
    const ph = buf.readUInt32BE(20);
    const ok = pw === dims[0] && ph === dims[1];
    console.log(`${name}: ${statSync(file).size} bytes, ${pw}x${ph}${ok ? '' : `  WRONG SIZE (want ${dims[0]}x${dims[1]})`}`);
    if (!ok) bad += 1;
  }
  if (errors.length) {
    console.log('console errors: ' + errors.join(' | '));
    bad += 1;
  }
} finally {
  server.kill();
}
if (bad) {
  console.error(`${bad} export check(s) failed`);
  process.exit(1);
}
console.log('export check ok');
