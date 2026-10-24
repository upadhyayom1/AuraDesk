/**
 * Rotation IPC Handlers
 * Handles: rotation:getConfig, rotation:setConfig, rotation:pause,
 *          rotation:resume, rotation:now, rotation:history, rotation:clearHistory
 */

const { ipcMain } = require('electron');
const { z } = require('zod');
const { ipcSuccess, ipcError } = require('../../utils/ipcResponse');

const RotationSetConfigSchema = z.object({
  intervalMinutes: z.number().int().min(1, 'Interval must be at least 1 minute').optional(),
  shuffle: z.boolean().optional(),
  collectionIds: z.array(z.string()).optional(),
  enabled: z.boolean().optional()
});

const RotationHistoryQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0)
});

/**
 * Registers all rotation IPC channels
 * @param {import('../../services/scheduler/RotationScheduler')} rotationScheduler
 * @param {import('../../database/repositories/rotationHistoryRepo')} rotationHistoryRepo
 */
function registerRotationHandlers(rotationScheduler, rotationHistoryRepo) {
  // 1. rotation:getConfig
  ipcMain.handle('rotation:getConfig', async () => {
    try {
      const config = rotationScheduler.rotationConfigRepo.getConfig();
      return ipcSuccess(config);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 2. rotation:setConfig
  ipcMain.handle('rotation:setConfig', async (_event, payload) => {
    try {
      const parsed = RotationSetConfigSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.issues[0]?.message);
      }

      const updated = rotationScheduler.updateConfig(parsed.data);
      return ipcSuccess(updated);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 3. rotation:pause
  ipcMain.handle('rotation:pause', async () => {
    try {
      const res = rotationScheduler.pause();
      return ipcSuccess(res);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 4. rotation:resume
  ipcMain.handle('rotation:resume', async () => {
    try {
      const res = rotationScheduler.resume();
      return ipcSuccess(res);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 5. rotation:now
  ipcMain.handle('rotation:now', async () => {
    try {
      const wallpaper = await rotationScheduler.rotateNow('MANUAL');
      if (!wallpaper) {
        return ipcError('NOT_FOUND', 'No active collections or no applicable wallpapers found to rotate');
      }
      return ipcSuccess(wallpaper);
    } catch (err) {
      return ipcError('APPLY_FAILED', err.message);
    }
  });

  // 6. rotation:history
  ipcMain.handle('rotation:history', async (_event, payload) => {
    try {
      const parsed = RotationHistoryQuerySchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.issues[0]?.message);
      }

      const entries = rotationHistoryRepo.getPage(parsed.data.limit, parsed.data.offset);
      return ipcSuccess(entries);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 7. rotation:clearHistory
  ipcMain.handle('rotation:clearHistory', async () => {
    try {
      const ok = rotationHistoryRepo.clear();
      return ipcSuccess({ ok });
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });
}

module.exports = {
  registerRotationHandlers
};
