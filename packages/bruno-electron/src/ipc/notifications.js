const { ipcMain } = require('electron');

// Keep the IPC contract, but never load announcements from the upstream service.
// Sending an empty list also clears any announcements already held by the renderer.
const pushNotifications = (mainWindow) => {
  mainWindow.webContents.send('main:load-notifications', []);
};

const registerNotificationsIpc = (mainWindow) => {
  mainWindow.webContents.on('did-finish-load', () => pushNotifications(mainWindow));
  ipcMain.on('renderer:notifications-opened', () => pushNotifications(mainWindow));
};

module.exports = registerNotificationsIpc;
