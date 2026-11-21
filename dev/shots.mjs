// Re-takes screenshots/ from shots.json with headless Chromium.
// Usage: node dev/shots.mjs [--port=8123]
// Serves app/ itself on a throwaway port, visits each ?shot= scene,
// waits for window.__shotReady, and saves a JPEG under the 256 KiB cap.
import { spawn } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/home/hatch/workspace/makefun/tools/node_modules/playwright/index.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
const portArg = process.argv.find((a) => a.startsWith('--port='));
const port = portArg ? Number(portArg.slice(7)) : 8123;

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

const chromePath = process.env.CHROME_PATH
  || join(process.env.HOME, '.cache/ms-playwright/chromium-1255/chrome-linux64/chrome');

let failures = 0;
try {
  await waitForServer();
  const browser = await chromium.launch({ executablePath: chromePath, args: ['--no-sandbox'] });
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: { width: shot.w, height: shot.h } });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${port}/${shot.query}`, { waitUntil: 'load' });
    try {
      await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 15000 });
    } catch {
      errors.push('__shotReady never fired');
    }
    const file = join(root, 'screenshots', shot.name);
    await page.screenshot({ path: file, type: 'jpeg', quality: 80 });
    const size = statSync(file).size;
    const over = size > 262144 ? '  OVER THE 256 KiB CAP' : '';
    const errs = errors.length ? '  console errors: ' + errors.join(' | ') : '';
    console.log(`${shot.name}  ${size} bytes${over}${errs}`);
    if (errors.length || size > 262144) failures += 1;
    await page.close();
  }
  await browser.close();
} finally {
  server.kill();
}
if (failures) {
  console.error(`${failures} shot(s) failed`);
  process.exit(1);
}
console.log('all shots ok');
