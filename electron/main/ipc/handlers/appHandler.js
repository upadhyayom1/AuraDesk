/**
 * App IPC Handlers
 * Handles: app:minimizeToTray, app:setAutoLaunch, app:openExternal, app:quit
 */

const { ipcMain, shell, app } = require('electron');
const { z } = require('zod');
const { ipcSuccess, ipcError } = require('../../utils/ipcResponse');

const SetAutoLaunchSchema = z.object({
  enabled: z.boolean()
});

const OpenExternalSchema = z.object({
  url: z.string().url()
});

/**
 * Registers all app lifecycle and window IPC channels
 * @param {import('../../services/settings/AppSettings')} appSettings
 * @param {Function} getMainWindow
 * @param {Function} [onShutdown]
 */
function registerAppHandlers(appSettings, getMainWindow, onShutdown) {
  // 1. app:minimizeToTray
  ipcMain.handle('app:minimizeToTray', async () => {
    try {
      const win = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
      if (win && !win.isDestroyed()) {
        win.hide();
      }
      return ipcSuccess({ ok: true });
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 2. app:setAutoLaunch
  ipcMain.handle('app:setAutoLaunch', async (_event, payload) => {
    try {
      const parsed = SetAutoLaunchSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.issues[0]?.message);
      }

      await appSettings.save({ launchOnStartup: parsed.data.enabled });
      return ipcSuccess({ ok: true });
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 3. app:openExternal
  ipcMain.handle('app:openExternal', async (_event, payload) => {
    try {
      const parsed = OpenExternalSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.issues[0]?.message);
      }

      const rawUrl = parsed.data.url;
      // Strict security: only allow https:// protocol to prevent arbitrary scheme execution
      if (!rawUrl.startsWith('https://')) {
        return ipcError('VALIDATION', 'Only secure https:// URLs are allowed');
      }

      await shell.openExternal(rawUrl);
      return ipcSuccess({ ok: true });
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 4. app:quit
  ipcMain.handle('app:quit', async () => {
    try {
      if (typeof onShutdown === 'function') {
        await onShutdown();
      } else {
        app.quit();
      }
      return ipcSuccess({ ok: true });
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });
}

module.exports = {
  registerAppHandlers
};
