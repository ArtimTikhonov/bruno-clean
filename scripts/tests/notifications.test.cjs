const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('startup and opening notifications clear announcements without contacting upstream', () => {
  const ipcMain = new EventEmitter();
  const webContents = new EventEmitter();
  const messages = [];
  webContents.send = (channel, notifications) => {
    messages.push({ channel, notifications: Array.from(notifications) });
  };
  const module = { exports: {} };
  vm.runInNewContext(
    readFileSync(path.join(__dirname, '../../packages/bruno-electron/src/ipc/notifications.js'), 'utf8'),
    {
      module,
      require: (name) => {
        assert.equal(name, 'electron', 'Announcements must not load a network client');
        return { ipcMain };
      },
      fetch: () => assert.fail('Announcements must not make network requests')
    }
  );

  module.exports({ webContents });
  webContents.emit('did-finish-load');
  ipcMain.emit('renderer:notifications-opened');

  assert.deepEqual(messages, [
    { channel: 'main:load-notifications', notifications: [] },
    { channel: 'main:load-notifications', notifications: [] }
  ]);
});
