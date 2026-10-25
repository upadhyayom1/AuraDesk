/**
 * Wallpaper Discovery IPC Handlers
 * Handles: discovery:search, discovery:browse, discovery:get, discovery:credits, discovery:sources
 */

const { ipcMain } = require('electron');
const { z } = require('zod');
const { ipcSuccess, ipcError } = require('../../utils/ipcResponse');

const DiscoverySearchSchema = z.object({
  query: z.string().trim().min(1, 'Query must not be empty'),
  source: z.enum(['unsplash', 'pexels', 'all']).optional().default('all'),
  orientation: z.enum(['landscape', 'portrait', 'squarish']).optional(),
  color: z.string().optional(),
  page: z.number().int().min(1).optional().default(1),
  perPage: z.number().int().min(1).max(50).optional().default(20)
});

const DiscoveryBrowseSchema = z.object({
  source: z.enum(['unsplash', 'pexels', 'all']).optional().default('all'),
  page: z.number().int().min(1).optional().default(1),
  perPage: z.number().int().min(1).max(50).optional().default(20)
});

const DiscoveryGetSchema = z.object({
  wallpaperId: z.string().min(1, 'wallpaperId is required')
});

const DiscoveryCreditsSchema = z.object({
  wallpaperId: z.string().min(1, 'wallpaperId is required')
});

/**
 * Maps provider or HTTP errors to standardized IPC error codes
 * @param {Error|any} err
 * @returns {{ code: string, message: string }}
 */
function mapDiscoveryError(err) {
  const status = err.response?.status;
  const code = err.code;
  const msg = err.message || 'Discovery operation failed';

  if (status === 401) {
    return { code: 'AUTH_REQUIRED', message: 'Provider API key is missing or invalid' };
  }
  if (status === 403) {
    return { code: 'AUTH_REQUIRED', message: 'Access forbidden or API rate limit reached' };
  }
  if (status === 429 || code === 'ERR_RATE_LIMITED') {
    return { code: 'RATE_LIMITED', message: 'Wallpaper discovery rate limit exceeded. Please try again shortly.' };
  }
  if (status === 404) {
    return { code: 'NOT_FOUND', message: 'Wallpaper not found' };
  }
  if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ECONNABORTED') {
    return { code: 'OFFLINE', message: 'Network connection failed or provider timed out' };
  }

  return { code: 'INTERNAL_ERROR', message: msg };
}

/**
 * Registers all wallpaper discovery IPC handlers
 * @param {import('../../services/discovery/WallpaperDiscoveryService')} discoveryService
 */
function registerDiscoveryHandlers(discoveryService) {
  if (!discoveryService) {
    throw new Error('registerDiscoveryHandlers requires a valid WallpaperDiscoveryService instance');
  }

  // 1. discovery:search
  ipcMain.removeHandler('discovery:search');
  ipcMain.handle('discovery:search', async (_event, payload) => {
    try {
      const parsed = DiscoverySearchSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.issues[0]?.message);
      }

      const { query, ...filters } = parsed.data;
      const result = await discoveryService.search(query, filters);
      return ipcSuccess(result);
    } catch (err) {
      const { code, message } = mapDiscoveryError(err);
      return ipcError(code, message);
    }
  });

  // 2. discovery:browse
  ipcMain.removeHandler('discovery:browse');
  ipcMain.handle('discovery:browse', async (_event, payload) => {
    try {
      const parsed = DiscoveryBrowseSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.issues[0]?.message);
      }

      const result = await discoveryService.browse(parsed.data);
      return ipcSuccess(result);
    } catch (err) {
      const { code, message } = mapDiscoveryError(err);
      return ipcError(code, message);
    }
  });

  // 3. discovery:get
  ipcMain.removeHandler('discovery:get');
  ipcMain.handle('discovery:get', async (_event, payload) => {
    try {
      const parsed = DiscoveryGetSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.issues[0]?.message);
      }

      const wallpaper = await discoveryService.fetchWallpaper(parsed.data.wallpaperId);
      if (!wallpaper) {
        return ipcError('NOT_FOUND', `Wallpaper with ID '${parsed.data.wallpaperId}' not found`);
      }
      return ipcSuccess(wallpaper);
    } catch (err) {
      const { code, message } = mapDiscoveryError(err);
      return ipcError(code, message);
    }
  });

  // 4. discovery:credits
  ipcMain.removeHandler('discovery:credits');
  ipcMain.handle('discovery:credits', async (_event, payload) => {
    try {
      const parsed = DiscoveryCreditsSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.issues[0]?.message);
      }

      const credits = await discoveryService.getCredits(parsed.data.wallpaperId);
      return ipcSuccess(credits);
    } catch (err) {
      const { code, message } = mapDiscoveryError(err);
      return ipcError(code, message);
    }
  });

  // 5. discovery:sources
  ipcMain.removeHandler('discovery:sources');
  ipcMain.handle('discovery:sources', async () => {
    try {
      const sources = discoveryService.getSources();
      // Ensure we only return safe metadata: name, enabled, ok (no keys)
      const sanitized = sources.map(s => ({
        name: s.name,
        enabled: Boolean(s.enabled),
        ok: Boolean(s.ok)
      }));
      return ipcSuccess(sanitized);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });
}

module.exports = {
  registerDiscoveryHandlers,
  DiscoverySearchSchema,
  DiscoveryBrowseSchema,
  DiscoveryGetSchema,
  DiscoveryCreditsSchema,
  mapDiscoveryError
};
