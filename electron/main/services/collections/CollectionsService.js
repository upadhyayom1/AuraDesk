/**
 * CollectionsService
 * Manages named wallpaper vaults, reordering, collection apply (shuffle/cycle),
 * and bonus export/import functionality.
 */

const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');
const { z } = require('zod');

const CollectionExportSchema = z.object({
  version: z.number().default(1),
  name: z.string().min(1),
  exportedAt: z.string().optional(),
  items: z.array(z.object({
    id: z.string(),
    source: z.enum(['unsplash', 'pexels', 'local']),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    imageUrl: z.string(),
    thumbUrl: z.string(),
    photographer: z.string().nullable().optional(),
    creditUrl: z.string().nullable().optional(),
    width: z.number().int().nullable().optional(),
    height: z.number().int().nullable().optional(),
    localPath: z.string().nullable().optional(),
    position: z.number().int().nullable().optional()
  }))
});

class CollectionsService {
  /**
   * @param {import('better-sqlite3').Database} db
   * @param {import('../../database/repositories/collectionsRepo')} collectionsRepo
   * @param {import('../../database/repositories/wallpaperRepo')} wallpaperRepo
   * @param {import('../wallpaper/WallpaperManager')} wallpaperManager
   * @param {import('../discovery/WallpaperDiscoveryService')} [discoveryService]
   */
  constructor(db, collectionsRepo, wallpaperRepo, wallpaperManager, discoveryService = null) {
    this.db = db;
    this.collectionsRepo = collectionsRepo;
    this.wallpaperRepo = wallpaperRepo;
    this.wallpaperManager = wallpaperManager;
    this.discoveryService = discoveryService;
  }

  /**
   * Creates a named collection
   * @param {string} name
   */
  create(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      throw new Error('Collection name cannot be empty');
    }
    return this.collectionsRepo.create(trimmed);
  }

  /**
   * Lists all collections for sidebar navigation
   */
  list() {
    return this.collectionsRepo.list();
  }

  /**
   * Gets a collection and its ordered items
   * @param {string} id
   */
  get(id) {
    const res = this.collectionsRepo.getById(id);
    if (!res) {
      throw new Error(`Collection not found with ID: ${id}`);
    }
    return res;
  }

  /**
   * Renames a collection
   * @param {string} id
   * @param {string} name
   */
  rename(id, name) {
    return this.collectionsRepo.rename(id, name);
  }

  /**
   * Deletes a collection
   * @param {string} id
   */
  delete(id) {
    // Check if active in rotation config
    let isActive = false;
    try {
      const configRow = this.db.prepare('SELECT collection_ids FROM rotation_config WHERE id = 1').get();
      if (configRow && configRow.collection_ids) {
        const activeIds = JSON.parse(configRow.collection_ids);
        isActive = activeIds.includes(id);
      }
    } catch (e) {
      // Ignore
    }

    const deleted = this.collectionsRepo.delete(id);
    return { ok: deleted, wasActive: isActive };
  }

  /**
   * Adds an online or local wallpaper to a collection
   * @param {string} collectionId
   * @param {string|Object} wallpaperOrId
   */
  async addItem(collectionId, wallpaperOrId) {
    let wallpaperId;

    if (typeof wallpaperOrId === 'string') {
      wallpaperId = wallpaperOrId;
      // Ensure it exists in wallpapers cache
      let existing = this.wallpaperRepo.getById(wallpaperId);
      if (!existing && this.discoveryService) {
        try {
          const fetched = await this.discoveryService.fetchWallpaper(wallpaperId);
          if (fetched) {
            existing = this.wallpaperRepo.upsert(fetched);
          }
        } catch (fetchErr) {
          console.warn(`[CollectionsService] Could not auto-fetch wallpaper ${wallpaperId}:`, fetchErr.message);
        }
      }
      if (!existing) {
        throw new Error(`Wallpaper ${wallpaperId} must be registered before adding to collection`);
      }
    } else if (wallpaperOrId && wallpaperOrId.id) {
      // Upsert full object into metadata cache
      const saved = this.wallpaperRepo.upsert(wallpaperOrId);
      wallpaperId = saved.id;
    } else {
      throw new Error('Invalid wallpaper identifier or payload');
    }

    return this.collectionsRepo.addItem(collectionId, wallpaperId);
  }

  /**
   * Removes an item from collection and re-packs positions
   * @param {string} collectionId
   * @param {number|string} itemId
   */
  removeItem(collectionId, itemId) {
    const ok = this.collectionsRepo.removeItem(collectionId, itemId);
    return { ok };
  }

  /**
   * Persists drag-and-drop item order in a single SQLite transaction
   * @param {string} collectionId
   * @param {string[]} itemIds - Array of wallpaper IDs in order
   */
  reorder(collectionId, itemIds) {
    if (!Array.isArray(itemIds)) {
      throw new Error('itemIds must be an array of wallpaper IDs');
    }
    const ok = this.collectionsRepo.reorder(collectionId, itemIds);
    return { ok };
  }

  /**
   * Selects an item from a collection without immediately applying it to the OS desktop
   * @param {string} collectionId
   * @param {'random'|'next'} [mode='next']
   * @returns {Object|null}
   */
  pickItem(collectionId, mode = 'next') {
    const currentId = this.wallpaperManager?.currentWallpaper?.id || null;
    return this.collectionsRepo.pickItem(collectionId, mode, currentId);
  }

  /**
   * Applies one item from the collection immediately (shuffle / cycle button)
   * @param {string} collectionId
   * @param {'random'|'next'} [mode='next']
   */
  async apply(collectionId, mode = 'next') {
    const currentId = this.wallpaperManager.currentWallpaper?.id || null;
    const item = this.collectionsRepo.pickItem(collectionId, mode, currentId);

    if (!item) {
      throw new Error(`Collection ${collectionId} is empty or has no applicable wallpapers`);
    }

    await this.wallpaperManager.apply(item, 'MANUAL', collectionId);
    return item;
  }

  /**
   * OPTIONAL BONUS: Exports a collection vault to a JSON file
   * @param {string} collectionId
   * @param {BrowserWindow} [parentWindow]
   * @returns {Promise<{ filePath: string }>}
   */
  async export(collectionId, parentWindow = null) {
    const data = this.get(collectionId);
    if (!data) {
      throw new Error(`Collection not found for export: ${collectionId}`);
    }

    const exportPayload = {
      version: 1,
      name: data.collection.name,
      exportedAt: new Date().toISOString(),
      items: data.items
    };

    const sanitizedName = data.collection.name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    const saveDialog = await dialog.showSaveDialog(parentWindow, {
      title: 'Export Collection Vault',
      defaultPath: `auradesk_${sanitizedName}_collection.json`,
      filters: [{ name: 'JSON Vault', extensions: ['json'] }]
    });

    if (saveDialog.canceled || !saveDialog.filePath) {
      throw new Error('Export canceled by user');
    }

    fs.writeFileSync(saveDialog.filePath, JSON.stringify(exportPayload, null, 2), 'utf-8');
    return { filePath: saveDialog.filePath };
  }

  /**
   * OPTIONAL BONUS: Imports a collection vault from a JSON file with Zod validation
   * @param {string} filePath
   * @returns {Promise<Object>} Created collection summary
   */
  async import(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    let parsed;
    try {
      parsed = JSON.parse(rawData);
    } catch (err) {
      throw new Error('Invalid JSON format in import file');
    }

    const validated = CollectionExportSchema.parse(parsed);

    // Determine unique name if name exists
    let targetName = validated.name;
    let counter = 1;
    while (true) {
      const existing = this.db.prepare('SELECT id FROM collections WHERE name = ?').get(targetName);
      if (!existing) break;
      targetName = `${validated.name} (${counter++})`;
    }

    // Create collection
    const collection = this.create(targetName);

    // Import wallpapers and items
    const importTx = this.db.transaction(() => {
      for (const item of validated.items) {
        // Upsert into wallpapers
        this.wallpaperRepo.upsert({
          id: item.id,
          source: item.source,
          title: item.title || '',
          description: item.description || '',
          imageUrl: item.imageUrl,
          thumbUrl: item.thumbUrl,
          photographer: item.photographer || 'Unknown',
          creditUrl: item.creditUrl || '',
          width: item.width || 1920,
          height: item.height || 1080,
          localPath: item.localPath || undefined
        });

        // Add to collection
        this.collectionsRepo.addItem(collection.id, item.id);
      }
    });

    importTx();
    return this.collectionsRepo.getById(collection.id);
  }
}

module.exports = CollectionsService;
