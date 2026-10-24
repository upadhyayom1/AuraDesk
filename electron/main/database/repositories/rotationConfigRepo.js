/**
 * Rotation Config Repository
 * Handles SQLite queries for the singleton 'rotation_config' row (id = 1).
 */

class RotationConfigRepository {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.db = db;
    this._ensureSingleton();
  }

  /**
   * Ensures the singleton row with id = 1 exists in rotation_config
   * @private
   */
  _ensureSingleton() {
    this.db.exec(`
      INSERT OR IGNORE INTO rotation_config (id, enabled, interval_minutes, shuffle, collection_ids, last_run_at)
      VALUES (1, 1, 30, 0, '[]', NULL);
    `);
  }

  /**
   * Maps a database row to a typed RotationConfig domain object
   * @private
   */
  _mapRow(row) {
    if (!row) return null;
    let collectionIds = [];
    try {
      collectionIds = JSON.parse(row.collection_ids || '[]');
      if (!Array.isArray(collectionIds)) {
        collectionIds = [];
      }
    } catch (e) {
      collectionIds = [];
    }

    return {
      id: row.id,
      enabled: Boolean(row.enabled),
      intervalMinutes: Number(row.interval_minutes),
      shuffle: Boolean(row.shuffle),
      collectionIds,
      lastRunAt: row.last_run_at || null
    };
  }

  /**
   * Retrieves the current rotation configuration.
   * @returns {import('../../../../shared/types/index').RotationConfig}
   */
  getConfig() {
    const row = this.db.prepare('SELECT * FROM rotation_config WHERE id = 1').get();
    return this._mapRow(row);
  }

  /**
   * Updates rotation configuration fields in the singleton row.
   * @param {Partial<import('../../../../shared/types/index').RotationConfig>} patch
   * @returns {import('../../../../shared/types/index').RotationConfig}
   */
  saveConfig(patch) {
    const current = this.getConfig();

    const nextConfig = {
      enabled: typeof patch.enabled === 'boolean' ? (patch.enabled ? 1 : 0) : (current.enabled ? 1 : 0),
      intervalMinutes: typeof patch.intervalMinutes === 'number' && patch.intervalMinutes >= 1
        ? Math.floor(patch.intervalMinutes)
        : current.intervalMinutes,
      shuffle: typeof patch.shuffle === 'boolean' ? (patch.shuffle ? 1 : 0) : (current.shuffle ? 1 : 0),
      collectionIds: Array.isArray(patch.collectionIds)
        ? JSON.stringify(patch.collectionIds)
        : JSON.stringify(current.collectionIds),
      lastRunAt: patch.lastRunAt !== undefined ? patch.lastRunAt : current.lastRunAt
    };

    const stmt = this.db.prepare(`
      UPDATE rotation_config
      SET enabled = @enabled,
          interval_minutes = @intervalMinutes,
          shuffle = @shuffle,
          collection_ids = @collectionIds,
          last_run_at = @lastRunAt
      WHERE id = 1
    `);

    stmt.run(nextConfig);
    return this.getConfig();
  }

  /**
   * Updates only the last_run_at timestamp to CURRENT_TIMESTAMP or a specific ISO string
   * @param {string} [isoTimestamp]
   */
  touchLastRun(isoTimestamp = null) {
    if (isoTimestamp) {
      this.db.prepare('UPDATE rotation_config SET last_run_at = ? WHERE id = 1').run(isoTimestamp);
    } else {
      this.db.prepare('UPDATE rotation_config SET last_run_at = CURRENT_TIMESTAMP WHERE id = 1').run();
    }
  }
}

module.exports = RotationConfigRepository;
