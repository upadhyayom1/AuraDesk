/**
 * Overrides Repository
 * Handles SQLite operations for the single-row 'overrides' table (id = 1).
 * Preserves manual user wallpaper overrides across app restarts.
 */

class OverridesRepository {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Maps a DB row to an Override object
   * @private
   */
  _mapRow(row) {
    if (!row) return null;
    return {
      wallpaperId: row.wallpaper_id,
      setAt: row.set_at,
      expiresAt: row.expires_at || null
    };
  }

  /**
   * Retrieves active manual override if present and not expired
   * @returns {{ wallpaperId: string, setAt: string, expiresAt: string | null } | null}
   */
  get() {
    const stmt = this.db.prepare('SELECT * FROM overrides WHERE id = 1');
    const row = stmt.get();
    if (!row) return null;

    if (row.expires_at && new Date(row.expires_at) <= new Date()) {
      // Override expired, auto clean-up
      this.clear();
      return null;
    }

    return this._mapRow(row);
  }

  /**
   * Sets or updates the active manual override
   * @param {string} wallpaperId
   * @param {string | Date | null} [expiresAt=null]
   * @returns {{ wallpaperId: string, setAt: string, expiresAt: string | null }}
   */
  set(wallpaperId, expiresAt = null) {
    let expStr = null;
    if (expiresAt instanceof Date) {
      expStr = expiresAt.toISOString();
    } else if (typeof expiresAt === 'string') {
      expStr = expiresAt;
    }

    const stmt = this.db.prepare(`
      INSERT INTO overrides (id, wallpaper_id, set_at, expires_at)
      VALUES (1, ?, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(id) DO UPDATE SET
        wallpaper_id = excluded.wallpaper_id,
        set_at = CURRENT_TIMESTAMP,
        expires_at = excluded.expires_at
    `);

    stmt.run(wallpaperId, expStr);
    return this.get();
  }

  /**
   * Clears any active manual override
   * @returns {boolean}
   */
  clear() {
    const stmt = this.db.prepare('DELETE FROM overrides WHERE id = 1');
    const res = stmt.run();
    return res.changes > 0;
  }
}

module.exports = OverridesRepository;
