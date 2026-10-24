/**
 * Collections IPC Handlers
 * Handles: collection:create, collection:list, collection:get, collection:rename,
 *          collection:delete, collection:addItem, collection:removeItem,
 *          collection:reorder, collection:apply, collection:export, collection:import
 */

const { ipcMain } = require('electron');
const { z } = require('zod');
const { ipcSuccess, ipcError } = require('../../utils/ipcResponse');

const CollectionCreateSchema = z.object({
  name: z.string().min(1, 'Collection name is required').max(100).trim()
});

const CollectionGetSchema = z.object({
  id: z.string().min(1)
});

const CollectionRenameSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'New name cannot be empty').max(100).trim()
});

const CollectionDeleteSchema = z.object({
  id: z.string().min(1)
});

const CollectionAddItemSchema = z.object({
  collectionId: z.string().min(1),
  wallpaperId: z.string().optional(),
  localPath: z.string().optional()
}).refine((data) => data.wallpaperId || data.localPath, {
  message: 'Either wallpaperId or localPath must be provided'
});

const CollectionRemoveItemSchema = z.object({
  collectionId: z.string().min(1),
  itemId: z.union([z.number(), z.string()])
});

const CollectionReorderSchema = z.object({
  collectionId: z.string().min(1),
  itemIds: z.array(z.string())
});

const CollectionApplySchema = z.object({
  id: z.string().min(1),
  mode: z.enum(['random', 'next']).optional().default('next')
});

const CollectionExportSchema = z.object({
  id: z.string().min(1)
});

const CollectionImportSchema = z.object({
  filePath: z.string().min(1)
});

/**
 * Registers all collections IPC channels
 * @param {import('../../services/collections/CollectionsService')} collectionsService
 * @param {BrowserWindow} getMainWindow
 */
function registerCollectionsHandlers(collectionsService, getMainWindow) {
  // 1. collection:create
  ipcMain.handle('collection:create', async (_event, payload) => {
    try {
      const parsed = CollectionCreateSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.issues[0]?.message);
      }
      const collection = collectionsService.create(parsed.data.name);
      return ipcSuccess(collection);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 2. collection:list
  ipcMain.handle('collection:list', async () => {
    try {
      const list = collectionsService.list();
      return ipcSuccess(list);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 3. collection:get
  ipcMain.handle('collection:get', async (_event, payload) => {
    try {
      const parsed = CollectionGetSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.issues[0]?.message);
      }
      const data = collectionsService.get(parsed.data.id);
      return ipcSuccess(data);
    } catch (err) {
      return ipcError('NOT_FOUND', err.message);
    }
  });

  // 4. collection:rename
  ipcMain.handle('collection:rename', async (_event, payload) => {
    try {
      const parsed = CollectionRenameSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.issues[0]?.message);
      }
      const updated = collectionsService.rename(parsed.data.id, parsed.data.name);
      return ipcSuccess(updated);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 5. collection:delete
  ipcMain.handle('collection:delete', async (_event, payload) => {
    try {
      const parsed = CollectionDeleteSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.issues[0]?.message);
      }
      const result = collectionsService.delete(parsed.data.id);
      return ipcSuccess(result);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 6. collection:addItem
  ipcMain.handle('collection:addItem', async (_event, payload) => {
    try {
      const parsed = CollectionAddItemSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.issues[0]?.message);
      }

      let wallpaperTarget = parsed.data.wallpaperId;
      if (!wallpaperTarget && parsed.data.localPath) {
        wallpaperTarget = {
          id: `local:${parsed.data.localPath}`,
          source: 'local',
          localPath: parsed.data.localPath,
          imageUrl: `file://${parsed.data.localPath}`,
          thumbUrl: `file://${parsed.data.localPath}`,
          photographer: 'Local',
          width: 1920,
          height: 1080
        };
      }

      const item = collectionsService.addItem(parsed.data.collectionId, wallpaperTarget);
      return ipcSuccess(item);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 7. collection:removeItem
  ipcMain.handle('collection:removeItem', async (_event, payload) => {
    try {
      const parsed = CollectionRemoveItemSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.issues[0]?.message);
      }
      const result = collectionsService.removeItem(parsed.data.collectionId, parsed.data.itemId);
      return ipcSuccess(result);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 8. collection:reorder
  ipcMain.handle('collection:reorder', async (_event, payload) => {
    try {
      const parsed = CollectionReorderSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.issues[0]?.message);
      }
      const result = collectionsService.reorder(parsed.data.collectionId, parsed.data.itemIds);
      return ipcSuccess(result);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 9. collection:apply
  ipcMain.handle('collection:apply', async (_event, payload) => {
    try {
      const parsed = CollectionApplySchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.issues[0]?.message);
      }
      const appliedWallpaper = await collectionsService.apply(parsed.data.id, parsed.data.mode);
      return ipcSuccess(appliedWallpaper);
    } catch (err) {
      return ipcError('APPLY_FAILED', err.message);
    }
  });

  // 10. collection:export (Bonus)
  ipcMain.handle('collection:export', async (_event, payload) => {
    try {
      const parsed = CollectionExportSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.issues[0]?.message);
      }
      const win = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
      const result = await collectionsService.export(parsed.data.id, win);
      return ipcSuccess(result);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 11. collection:import (Bonus)
  ipcMain.handle('collection:import', async (_event, payload) => {
    try {
      const parsed = CollectionImportSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.issues[0]?.message);
      }
      const imported = await collectionsService.import(parsed.data.filePath);
      return ipcSuccess(imported);
    } catch (err) {
      return ipcError('VALIDATION', err.message);
    }
  });
}

module.exports = {
  registerCollectionsHandlers
};
