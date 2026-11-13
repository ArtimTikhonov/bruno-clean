const { _electron: electron, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-clean-smoke-'));
  let app;
  try {
    app = await electron.launch({
      executablePath: path.join(__dirname, '../../packages/bruno-electron/out/linux-unpacked/bruno-clean'),
      args: [`--user-data-dir=${profile}`, '--no-sandbox'],
      timeout: 60000
    });
    const window = await app.firstWindow();
    await expect(window).toHaveTitle('Bruno Clean', { timeout: 60000 });
    await expect(window.getByText('Welcome to Bruno', { exact: true })).toBeVisible({ timeout: 60000 });
    await expect(window.getByLabel('Check all Notifications')).toHaveCount(0);
    await expect(window.getByText('Golden Edition', { exact: true })).toHaveCount(0);
    await window.screenshot({ path: 'bruno-clean-smoke.png' });
    console.log('Packaged app starts and renders the welcome screen without promotions.');
  } finally {
    if (app) await app.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
