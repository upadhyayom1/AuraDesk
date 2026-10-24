/**
 * Settings IPC Handlers
 * Handles: settings:get, settings:set
 */

const { ipcMain } = require('electron');
const { ipcSuccess, ipcError } = require('../../utils/ipcResponse');

/**
 * Registers all settings IPC channels
 * @param {import('../../services/settings/AppSettings')} appSettings
 */
function registerSettingsHandlers(appSettings) {
  // 1. settings:get
  ipcMain.handle('settings:get', async () => {
    try {
      const current = appSettings.get();
      return ipcSuccess(current);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 2. settings:set
  ipcMain.handle('settings:set', async (_event, payload) => {
    try {
      const patch = payload && payload.patch ? payload.patch : payload;
      const updated = await appSettings.save(patch);
      return ipcSuccess(updated);
    } catch (err) {
      if (err.message && err.message.startsWith('VALIDATION:')) {
        return ipcError('VALIDATION', err.message.replace('VALIDATION:', '').trim());
      }
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });
}

module.exports = {
  registerSettingsHandlers
};
