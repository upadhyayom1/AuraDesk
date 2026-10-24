/**
 * Context Cache Repository
 * Handles SQLite operations for the 'context_cache' table (environmental snapshots e.g. weather).
 */

class ContextCacheRepository {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Retrieves parsed cached payload by key
   * @param {string} key
   * @returns {any}
   */
  get(key) {
    const stmt = this.db.prepare('SELECT payload FROM context_cache WHERE key = ?');
    const row = stmt.get(key);
    if (!row) return null;

    try {
      return JSON.parse(row.payload);
    } catch {
      return row.payload;
    }
  }

  /**
   * Retrieves cached payload along with its fetched_at timestamp
   * @param {string} key
   * @returns {{ payload: any, fetchedAt: string } | null}
   */
  getWithTimestamp(key) {
    const stmt = this.db.prepare('SELECT payload, fetched_at FROM context_cache WHERE key = ?');
    const row = stmt.get(key);
    if (!row) return null;

    let payload = row.payload;
    try {
      payload = JSON.parse(row.payload);
    } catch {
      // Keep as string
    }

    return {
      payload,
      fetchedAt: row.fetched_at
    };
  }

  /**
   * Saves or updates a cached context payload
   * @param {string} key
   * @param {any} payload
   */
  set(key, payload) {
    const payloadStr = typeof payload === 'object' ? JSON.stringify(payload) : String(payload);
    const stmt = this.db.prepare(`
      INSERT INTO context_cache (key, payload, fetched_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        payload = excluded.payload,
        fetched_at = CURRENT_TIMESTAMP
    `);

    stmt.run(key, payloadStr);
  }

  /**
   * Deletes a cached entry by key
   * @param {string} key
   * @returns {boolean}
   */
  delete(key) {
    const stmt = this.db.prepare('DELETE FROM context_cache WHERE key = ?');
    const res = stmt.run(key);
    return res.changes > 0;
  }

  /**
   * Clears all context cache entries
   */
  clear() {
    this.db.prepare('DELETE FROM context_cache').run();
  }
}

module.exports = ContextCacheRepository;
