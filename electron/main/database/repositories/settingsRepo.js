/**
 * Settings Repository
 * Handles SQLite queries for application configuration in the 'settings' table.
 * All values are stored as JSON strings.
 */

class SettingsRepository {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Retrieves all key-value pairs as a parsed object.
   * @returns {Record<string, any>}
   */
  getAll() {
    const stmt = this.db.prepare('SELECT key, value FROM settings');
    const rows = stmt.all();
    const result = {};

    for (const row of rows) {
      try {
        result[row.key] = JSON.parse(row.value);
      } catch (err) {
        console.warn(`[SettingsRepository] Could not parse JSON for setting '${row.key}':`, err.message);
        result[row.key] = row.value;
      }
    }

    return result;
  }

  /**
   * Retrieves a single setting by key.
   * @param {string} key
   * @param {any} [defaultValue=null]
   * @returns {any}
   */
  get(key, defaultValue = null) {
    const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
    const row = stmt.get(key);
    if (!row) return defaultValue;

    try {
      return JSON.parse(row.value);
    } catch (err) {
      console.warn(`[SettingsRepository] Could not parse JSON for setting '${key}':`, err.message);
      return defaultValue;
    }
  }

  /**
   * Sets a single setting (upsert).
   * @param {string} key
   * @param {any} value
   */
  set(key, value) {
    const stmt = this.db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    stmt.run(key, JSON.stringify(value));
  }

  /**
   * Sets multiple settings within a single SQLite transaction.
   * @param {Record<string, any>} entries
   */
  setMany(entries) {
    if (!entries || typeof entries !== 'object') return;

    const stmt = this.db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    const updateTx = this.db.transaction((items) => {
      for (const [k, v] of Object.entries(items)) {
        stmt.run(k, JSON.stringify(v));
      }
    });

    updateTx(entries);
  }

  /**
   * Removes a setting by key.
   * @param {string} key
   * @returns {boolean}
   */
  delete(key) {
    const stmt = this.db.prepare('DELETE FROM settings WHERE key = ?');
    const result = stmt.run(key);
    return result.changes > 0;
  }
}

module.exports = SettingsRepository;
