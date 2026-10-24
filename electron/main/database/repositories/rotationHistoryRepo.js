/**
 * Rotation History Repository
 * Handles SQLite queries for the 'rotation_history' table and auditing.
 */

class RotationHistoryRepository {
  /**
   * @param {import('better-sqlite3').Database} db
   * @param {import('./wallpaperRepo')} [wallpaperRepo]
   */
  constructor(db, wallpaperRepo = null) {
    this.db = db;
    this.wallpaperRepo = wallpaperRepo;
  }

  /**
   * Records a successfully applied wallpaper into rotation_history.
   * NOTE: Must only be invoked after wallpaper application successfully resolves.
   * @param {string} wallpaperId
   * @param {'MANUAL'|'ROTATION'|'RULE'|'CALENDAR'} [trigger='ROTATION']
   * @param {string} [collectionId=null]
   * @param {string} [ruleId=null]
   * @returns {Object} Inserted history summary
   */
  record(wallpaperId, trigger = 'ROTATION', collectionId = null, ruleId = null) {
    const stmt = this.db.prepare(`
      INSERT INTO rotation_history (wallpaper_id, applied_at, trigger, collection_id, rule_id)
      VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?)
    `);

    const result = stmt.run(wallpaperId, trigger, collectionId, ruleId);
    return {
      id: Number(result.lastInsertRowid),
      wallpaperId,
      trigger,
      collectionId,
      ruleId
    };
  }

  /**
   * Queries the most recent applied wallpaper IDs for the no-repeat window.
   * @param {number} [limit=10]
   * @returns {string[]} Array of recent wallpaper IDs
   */
  getRecentIds(limit = 10) {
    if (!limit || limit <= 0) return [];

    const stmt = this.db.prepare(`
      SELECT wallpaper_id 
      FROM rotation_history 
      ORDER BY applied_at DESC, id DESC 
      LIMIT ?
    `);

    const rows = stmt.all(Math.floor(limit));
    return rows.map((r) => r.wallpaper_id);
  }

  /**
   * Queries paginated history entries joined with wallpaper metadata.
   * @param {number} [limit=20]
   * @param {number} [offset=0]
   * @returns {Array<import('../../../../shared/types/index').HistoryEntry>}
   */
  getPage(limit = 20, offset = 0) {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit || 20)));
    const safeOffset = Math.max(0, Math.floor(offset || 0));

    const query = `
      SELECT 
        rh.id AS history_id,
        rh.wallpaper_id,
        rh.applied_at,
        rh.trigger,
        rh.collection_id,
        rh.rule_id,
        w.id AS wp_id,
        w.source,
        w.title,
        w.description,
        w.image_url,
        w.thumb_url,
        w.photographer,
        w.credit_url,
        w.width,
        w.height,
        w.local_path,
        w.cached_at
      FROM rotation_history rh
      LEFT JOIN wallpapers w ON rh.wallpaper_id = w.id
      ORDER BY rh.applied_at DESC, rh.id DESC
      LIMIT ? OFFSET ?
    `;

    const rows = this.db.prepare(query).all(safeLimit, safeOffset);

    return rows.map((row) => ({
      id: row.history_id,
      wallpaperId: row.wallpaper_id,
      appliedAt: row.applied_at,
      trigger: row.trigger,
      collectionId: row.collection_id || undefined,
      ruleId: row.rule_id || undefined,
      wallpaper: row.wp_id ? {
        id: row.wp_id,
        source: row.source,
        title: row.title || '',
        description: row.description || '',
        imageUrl: row.image_url,
        thumbUrl: row.thumb_url || row.image_url,
        photographer: row.photographer || '',
        creditUrl: row.credit_url || '',
        width: row.width,
        height: row.height,
        localPath: row.local_path || undefined,
        cachedAt: row.cached_at
      } : undefined
    }));
  }

  /**
   * Retrieves the most recently applied history entry with joined wallpaper.
   * @returns {import('../../../../shared/types/index').HistoryEntry|null}
   */
  getLastEntry() {
    const query = `
      SELECT 
        rh.id AS history_id,
        rh.wallpaper_id,
        rh.applied_at,
        rh.trigger,
        rh.collection_id,
        rh.rule_id,
        w.id AS wp_id,
        w.source,
        w.title,
        w.description,
        w.image_url,
        w.thumb_url,
        w.photographer,
        w.credit_url,
        w.width,
        w.height,
        w.local_path,
        w.cached_at
      FROM rotation_history rh
      LEFT JOIN wallpapers w ON rh.wallpaper_id = w.id
      ORDER BY rh.applied_at DESC, rh.id DESC
      LIMIT 1
    `;

    const row = this.db.prepare(query).get();
    if (!row) return null;

    return {
      id: row.history_id,
      wallpaperId: row.wallpaper_id,
      appliedAt: row.applied_at,
      trigger: row.trigger,
      collectionId: row.collection_id || undefined,
      ruleId: row.rule_id || undefined,
      wallpaper: row.wp_id ? {
        id: row.wp_id,
        source: row.source,
        title: row.title || '',
        description: row.description || '',
        imageUrl: row.image_url,
        thumbUrl: row.thumb_url || row.image_url,
        photographer: row.photographer || '',
        creditUrl: row.credit_url || '',
        width: row.width,
        height: row.height,
        localPath: row.local_path || undefined,
        cachedAt: row.cached_at
      } : undefined
    };
  }

  /**
   * Returns the total count of history records.
   * @returns {number}
   */
  count() {
    const row = this.db.prepare('SELECT COUNT(*) AS total FROM rotation_history').get();
    return row ? row.total : 0;
  }

  /**
   * Clears all history entries and resets audit log.
   * @returns {boolean}
   */
  clear() {
    const stmt = this.db.prepare('DELETE FROM rotation_history');
    const result = stmt.run();
    return result.changes > 0;
  }
}

module.exports = RotationHistoryRepository;
