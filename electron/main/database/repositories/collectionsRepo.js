/**
 * Collections Repository
 * Handles SQLite queries for 'collections' and 'collection_items' (Sanctum of Memories).
 */

const crypto = require('crypto');

class CollectionsRepository {
  /**
   * @param {import('better-sqlite3').Database} db
   * @param {import('./wallpaperRepo')} wallpaperRepo
   */
  constructor(db, wallpaperRepo) {
    this.db = db;
    this.wallpaperRepo = wallpaperRepo;
  }

  /**
   * Creates a new named collection
   * @param {string} name
   * @returns {Object} created collection
   */
  create(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      throw new Error('Collection name cannot be empty');
    }

    const id = crypto.randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO collections (id, name, created_at, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    stmt.run(id, trimmed);
    return this.getCollectionSummary(id);
  }

  /**
   * Lists all collections with item counts and cover image
   * @returns {Array<Object>}
   */
  list() {
    const query = `
      SELECT 
        c.id, 
        c.name, 
        c.created_at AS createdAt, 
        c.updated_at AS updatedAt,
        COUNT(ci.id) AS itemCount,
        (
          SELECT COALESCE(w.thumb_url, w.image_url)
          FROM collection_items ci2 
          JOIN wallpapers w ON ci2.wallpaper_id = w.id 
          WHERE ci2.collection_id = c.id 
          ORDER BY ci2.position ASC 
          LIMIT 1
        ) AS coverUrl
      FROM collections c
      LEFT JOIN collection_items ci ON c.id = ci.collection_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;

    return this.db.prepare(query).all();
  }

  /**
   * Gets a collection header by ID
   * @param {string} id
   * @returns {Object|null}
   */
  getCollectionSummary(id) {
    const query = `
      SELECT 
        c.id, 
        c.name, 
        c.created_at AS createdAt, 
        c.updated_at AS updatedAt,
        COUNT(ci.id) AS itemCount,
        (
          SELECT COALESCE(w.thumb_url, w.image_url)
          FROM collection_items ci2 
          JOIN wallpapers w ON ci2.wallpaper_id = w.id 
          WHERE ci2.collection_id = c.id 
          ORDER BY ci2.position ASC 
          LIMIT 1
        ) AS coverUrl
      FROM collections c
      LEFT JOIN collection_items ci ON c.id = ci.collection_id
      WHERE c.id = ?
      GROUP BY c.id
    `;
    return this.db.prepare(query).get(id) || null;
  }

  /**
   * Fetches a collection and its ordered wallpaper items
   * @param {string} id
   * @returns {{ collection: Object, items: Array<Object> }|null}
   */
  getById(id) {
    const collection = this.getCollectionSummary(id);
    if (!collection) return null;

    const itemsQuery = `
      SELECT 
        w.id,
        w.source,
        w.title,
        w.description,
        w.image_url AS imageUrl,
        w.thumb_url AS thumbUrl,
        w.photographer,
        w.credit_url AS creditUrl,
        w.width,
        w.height,
        w.local_path AS localPath,
        w.cached_at AS cachedAt,
        ci.id AS collectionItemId,
        ci.position,
        ci.added_at AS addedAt
      FROM collection_items ci
      JOIN wallpapers w ON ci.wallpaper_id = w.id
      WHERE ci.collection_id = ?
      ORDER BY ci.position ASC
    `;

    const items = this.db.prepare(itemsQuery).all(id);
    return {
      collection,
      items
    };
  }

  /**
   * Renames a collection
   * @param {string} id
   * @param {string} newName
   * @returns {Object}
   */
  rename(id, newName) {
    const trimmed = (newName || '').trim();
    if (!trimmed) {
      throw new Error('Collection name cannot be empty');
    }

    const stmt = this.db.prepare(`
      UPDATE collections 
      SET name = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);

    const result = stmt.run(trimmed, id);
    if (result.changes === 0) {
      throw new Error(`Collection with ID ${id} not found`);
    }

    return this.getCollectionSummary(id);
  }

  /**
   * Deletes a collection and cascades item deletion
   * @param {string} id
   * @returns {boolean}
   */
  delete(id) {
    const stmt = this.db.prepare('DELETE FROM collections WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Adds an item to the end of a collection
   * @param {string} collectionId
   * @param {string} wallpaperId
   * @returns {Object} created collection item
   */
  addItem(collectionId, wallpaperId) {
    const collection = this.getCollectionSummary(collectionId);
    if (!collection) {
      throw new Error(`Collection not found: ${collectionId}`);
    }

    const maxPosQuery = this.db.prepare(`
      SELECT COALESCE(MAX(position), 0) AS maxPos 
      FROM collection_items 
      WHERE collection_id = ?
    `);
    const { maxPos } = maxPosQuery.get(collectionId);
    const newPos = maxPos + 1;

    const insertStmt = this.db.prepare(`
      INSERT INTO collection_items (collection_id, wallpaper_id, position, added_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(collection_id, wallpaper_id) DO NOTHING
    `);

    const result = insertStmt.run(collectionId, wallpaperId, newPos);

    // Update collection updated_at
    this.db.prepare('UPDATE collections SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(collectionId);

    const existingRow = this.db.prepare(`
      SELECT id, position FROM collection_items 
      WHERE collection_id = ? AND wallpaper_id = ?
    `).get(collectionId, wallpaperId);

    return {
      id: existingRow ? Number(existingRow.id) : Number(result.lastInsertRowid),
      collectionId,
      wallpaperId,
      position: existingRow ? existingRow.position : newPos
    };
  }

  /**
   * Removes an item and re-packs remaining positions in a transaction
   * @param {string} collectionId
   * @param {number|string} itemId - Can be collection_items.id or wallpaper_id
   * @returns {boolean}
   */
  removeItem(collectionId, itemId) {
    const deleteTx = this.db.transaction(() => {
      // 1. Delete item
      if (typeof itemId === 'number') {
        const deleteStmt = this.db.prepare('DELETE FROM collection_items WHERE collection_id = ? AND id = ?');
        deleteStmt.run(collectionId, itemId);
      } else {
        const deleteStmt = this.db.prepare('DELETE FROM collection_items WHERE collection_id = ? AND wallpaper_id = ?');
        const res = deleteStmt.run(collectionId, String(itemId));
        if (res.changes === 0 && !isNaN(Number(itemId))) {
          this.db.prepare('DELETE FROM collection_items WHERE collection_id = ? AND id = ?').run(collectionId, Number(itemId));
        }
      }

      // 2. Re-pack remaining positions (1, 2, 3...)
      const remainingItems = this.db.prepare(`
        SELECT id FROM collection_items 
        WHERE collection_id = ? 
        ORDER BY position ASC, added_at ASC
      `).all(collectionId);

      const updatePosStmt = this.db.prepare('UPDATE collection_items SET position = ? WHERE id = ?');
      for (let i = 0; i < remainingItems.length; i++) {
        updatePosStmt.run(i + 1, remainingItems[i].id);
      }

      // 3. Touch updated_at
      this.db.prepare('UPDATE collections SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(collectionId);
    });

    deleteTx();
    return true;
  }

  /**
   * Reorders items within a collection in a single transaction
   * @param {string} collectionId
   * @param {string[]} wallpaperIds - Ordered array of wallpaper IDs
   * @returns {boolean}
   */
  reorder(collectionId, wallpaperIds) {
    const updateStmt = this.db.prepare(`
      UPDATE collection_items 
      SET position = ? 
      WHERE collection_id = ? AND wallpaper_id = ?
    `);

    const reorderTx = this.db.transaction((items) => {
      for (let index = 0; index < items.length; index++) {
        updateStmt.run(index + 1, collectionId, items[index]);
      }
      this.db.prepare('UPDATE collections SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(collectionId);
    });

    reorderTx(wallpaperIds);
    return true;
  }

  /**
   * Selects an item from a collection by mode ('random' | 'next')
   * @param {string} collectionId
   * @param {'random'|'next'} [mode='next']
   * @param {string} [currentWallpaperId]
   * @returns {Object|null} Wallpaper record
   */
  pickItem(collectionId, mode = 'next', currentWallpaperId = null) {
    const data = this.getById(collectionId);
    if (!data || !data.items || data.items.length === 0) {
      return null;
    }

    const { items } = data;
    if (items.length === 1) {
      return items[0];
    }

    if (mode === 'random') {
      // Filter out current wallpaper if possible
      const candidates = currentWallpaperId
        ? items.filter((item) => item.id !== currentWallpaperId)
        : items;
      const pool = candidates.length > 0 ? candidates : items;
      const randomIndex = Math.floor(Math.random() * pool.length);
      return pool[randomIndex];
    }

    // Default 'next': Find current position and pick next item circularly
    if (currentWallpaperId) {
      const currentIndex = items.findIndex((item) => item.id === currentWallpaperId);
      if (currentIndex !== -1) {
        const nextIndex = (currentIndex + 1) % items.length;
        return items[nextIndex];
      }
    }

    return items[0];
  }
}

module.exports = CollectionsRepository;
