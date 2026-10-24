/**
 * Wallpaper IPC Handlers
 * Handles: wallpaper:preview, wallpaper:apply, wallpaper:current, wallpaper:pickLocal, wallpaper:displays
 */

const { ipcMain } = require('electron');
const { z } = require('zod');
const { ipcSuccess, ipcError } = require('../../utils/ipcResponse');

const WallpaperPreviewSchema = z.object({
  wallpaperId: z.string().optional(),
  localPath: z.string().optional()
}).refine((data) => data.wallpaperId || data.localPath, {
  message: 'Either wallpaperId or localPath must be provided'
});

const WallpaperApplySchema = z.object({
  wallpaperId: z.string().optional(),
  localPath: z.string().optional(),
  trigger: z.enum(['MANUAL', 'ROTATION', 'RULE', 'CALENDAR']).optional().default('MANUAL'),
  collectionId: z.string().optional(),
  ruleId: z.string().optional()
}).refine((data) => data.wallpaperId || data.localPath, {
  message: 'Either wallpaperId or localPath must be provided'
});

/**
 * Registers all wallpaper IPC channels
 * @param {import('../../services/wallpaper/WallpaperManager')} wallpaperManager
 * @param {BrowserWindow} getMainWindow
 */
function registerWallpaperHandlers(wallpaperManager, getMainWindow) {
  // 1. wallpaper:preview
  ipcMain.handle('wallpaper:preview', async (_event, payload) => {
    try {
      const parsed = WallpaperPreviewSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.issues[0]?.message);
      }

      const target = parsed.data.wallpaperId || {
        id: `local:${parsed.data.localPath}`,
        source: 'local',
        localPath: parsed.data.localPath,
        imageUrl: `file://${parsed.data.localPath}`
      };

      const result = await wallpaperManager.preview(target);
      return ipcSuccess(result);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 2. wallpaper:apply
  ipcMain.handle('wallpaper:apply', async (_event, payload) => {
    try {
      const parsed = WallpaperApplySchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.issues[0]?.message);
      }

      let target = parsed.data.wallpaperId;
      if (!target && parsed.data.localPath) {
        target = {
          id: `local:${parsed.data.localPath}`,
          source: 'local',
          localPath: parsed.data.localPath,
          imageUrl: `file://${parsed.data.localPath}`
        };
      }

      const result = await wallpaperManager.apply(
        target,
        parsed.data.trigger,
        parsed.data.collectionId,
        parsed.data.ruleId
      );

      // Broadcast wallpaper:changed event to renderer
      const win = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
      if (win && win.webContents && !win.isDestroyed()) {
        win.webContents.send('wallpaper:changed', {
          wallpaper: wallpaperManager.currentWallpaper,
          trigger: parsed.data.trigger,
          appliedAt: result.appliedAt
        });
      }

      return ipcSuccess(result);
    } catch (err) {
      return ipcError('APPLY_FAILED', err.message);
    }
  });

  // 3. wallpaper:current
  ipcMain.handle('wallpaper:current', async () => {
    try {
      const current = wallpaperManager.getCurrent();
      return ipcSuccess(current);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 4. wallpaper:pickLocal
  ipcMain.handle('wallpaper:pickLocal', async () => {
    try {
      const win = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
      const wallpapers = await wallpaperManager.pickLocalFiles(win);
      return ipcSuccess({ wallpapers });
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 5. wallpaper:displays
  ipcMain.handle('wallpaper:displays', async () => {
    try {
      const displays = wallpaperManager.getDisplays();
      return ipcSuccess(displays);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });
}

module.exports = {
  registerWallpaperHandlers
};
