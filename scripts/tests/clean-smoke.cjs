const { _electron: electron, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { version } = require('../../package.json');

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-clean-smoke-'));
  const environment = {
    ...process.env,
    XDG_CONFIG_HOME: profile,
    APPDATA: profile,
    LOCALAPPDATA: profile,
    DISABLE_SAMPLE_COLLECTION_IMPORT: 'true'
  };
  let app;
  let currentWindow;
  try {
    const executable = process.platform === 'win32'
      ? '../../packages/bruno-electron/out/win-unpacked/bruno.exe'
      : '../../packages/bruno-electron/out/linux-unpacked/bruno';
    app = await electron.launch({
      executablePath: process.env.BRUNO_CLEAN_EXECUTABLE || path.join(__dirname, executable),
      env: environment,
      args: [`--user-data-dir=${profile}`, '--no-sandbox'],
      timeout: 60000
    });
    const window = await app.firstWindow();
    currentWindow = window;
    expect(await app.evaluate(({ app }) => app.getVersion())).toBe(version);
    await expect(window).toHaveTitle('Bruno', { timeout: 60000 });
    await expect(window.getByRole('button', { name: 'Открыть настройки', exact: true })).toBeVisible({ timeout: 60000 });
    // Onboarding is intentionally omitted when an existing profile is detected.
    if (await window.getByTestId('welcome-modal').isVisible()) {
      await expect(window.getByText('Добро пожаловать в Bruno', { exact: true })).toBeVisible();
      await window.getByRole('button', { name: 'Пропустить', exact: true }).click();
      await expect(window.getByTestId('welcome-modal')).toHaveCount(0);
    }
    await window.getByRole('button', { name: 'Открыть настройки', exact: true }).click();
    await expect(window.getByText('Основные настройки', { exact: true })).toBeVisible();
    await expect(window.getByTestId('interface-language')).toHaveValue('ru');
    await expect(window.locator('#english-it-terms')).not.toBeChecked();
    await expect(window.getByRole('tab', { name: 'AI', exact: true })).toHaveCount(0);
    await expect(window.getByRole('tab', { name: 'Прокси', exact: true })).toBeVisible();
    await expect(window.getByLabel('Check all Notifications')).toHaveCount(0);
    await expect(window.getByText('Golden Edition', { exact: true })).toHaveCount(0);
    await window.screenshot({ path: 'bruno-clean-smoke.png' });
    await window.locator('#english-it-terms').check();
    await app.close();
    app = await electron.launch({
      executablePath: process.env.BRUNO_CLEAN_EXECUTABLE || path.join(__dirname, executable),
      env: environment,
      args: [`--user-data-dir=${profile}`, '--no-sandbox'],
      timeout: 60000
    });
    const termsWindow = await app.firstWindow();
    currentWindow = termsWindow;
    await termsWindow.getByRole('button', { name: 'Открыть настройки', exact: true }).click({ timeout: 60000 });
    await expect(termsWindow.getByTestId('interface-language')).toHaveValue('ru');
    await expect(termsWindow.locator('#english-it-terms')).toBeChecked();
    await expect(termsWindow.getByRole('tab', { name: 'Proxy', exact: true })).toBeVisible();
    await expect(termsWindow.getByRole('tab', { name: 'Cache', exact: true })).toBeVisible();
    await termsWindow.screenshot({ path: 'bruno-clean-smoke.png' });
    await termsWindow.getByTestId('interface-language').selectOption('en');
    await app.close();
    app = await electron.launch({
      executablePath: process.env.BRUNO_CLEAN_EXECUTABLE || path.join(__dirname, executable),
      env: environment,
      args: [`--user-data-dir=${profile}`, '--no-sandbox'],
      timeout: 60000
    });
    const englishWindow = await app.firstWindow();
    currentWindow = englishWindow;
    await expect(englishWindow.getByRole('button', { name: 'Open Preferences', exact: true })).toBeVisible({ timeout: 60000 });
    await englishWindow.getByRole('button', { name: 'Open Preferences', exact: true }).click();
    await expect(englishWindow.getByText('General Settings', { exact: true })).toBeVisible();
    await expect(englishWindow.getByTestId('interface-language')).toHaveValue('en');
    console.log('Russian UI, persisted IT terminology and English selection work in the packaged application.');
  } catch (error) {
    if (currentWindow) {
      await currentWindow.screenshot({ path: 'bruno-clean-smoke.png' }).catch(() => {});
      console.error(await currentWindow.locator('body').innerText().catch(() => 'Window unavailable'));
    }
    throw error;
  } finally {
    if (app) await app.close();
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
