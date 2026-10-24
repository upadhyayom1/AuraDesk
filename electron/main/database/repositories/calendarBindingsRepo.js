/**
 * Calendar Bindings Repository
 * Handles SQLite operations for the 'calendar_bindings' table.
 */

const crypto = require('crypto');

class CalendarBindingsRepository {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Maps a DB row into a normalized CalendarBinding object
   * @private
   */
  _mapRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      matchType: row.match_type,
      matchValue: row.match_value,
      collectionId: row.collection_id,
      priority: Number(row.priority)
    };
  }

  /**
   * Creates a new calendar binding
   * @param {Object} binding
   * @param {string} [binding.id]
   * @param {'KEYWORD' | 'EVENT_ID'} binding.matchType
   * @param {string} binding.matchValue
   * @param {string} binding.collectionId
   * @param {number} [binding.priority]
   * @returns {Object}
   */
  create(binding) {
    const id = binding.id || crypto.randomUUID();
    let priority = binding.priority;
    if (typeof priority !== 'number') {
      const maxRow = this.db.prepare('SELECT MAX(priority) as maxPriority FROM calendar_bindings').get();
      priority = (maxRow?.maxPriority != null ? maxRow.maxPriority : 0) + 1;
    }

    const stmt = this.db.prepare(`
      INSERT INTO calendar_bindings (id, match_type, match_value, collection_id, priority)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, binding.matchType, binding.matchValue, binding.collectionId, priority);
    return this.getById(id);
  }

  /**
   * Retrieves a binding by ID
   * @param {string} id
   * @returns {Object | null}
   */
  getById(id) {
    const stmt = this.db.prepare('SELECT * FROM calendar_bindings WHERE id = ?');
    const row = stmt.get(id);
    return this._mapRow(row);
  }

  /**
   * Lists all bindings ordered by priority ASC
   * @returns {Array<Object>}
   */
  list() {
    const stmt = this.db.prepare('SELECT * FROM calendar_bindings ORDER BY priority ASC, id ASC');
    const rows = stmt.all();
    return rows.map(r => this._mapRow(r));
  }

  /**
   * Deletes a binding by ID
   * @param {string} id
   * @returns {boolean}
   */
  delete(id) {
    const stmt = this.db.prepare('DELETE FROM calendar_bindings WHERE id = ?');
    const res = stmt.run(id);
    return res.changes > 0;
  }

  /**
   * Matches an event (or event title / summary) against configured calendar bindings
   * Returns matching collection_id or null.
   * Checks KEYWORD match (case-insensitive) or exact EVENT_ID.
   * Evaluated in priority order.
   * @param {{ id?: string, summary?: string, title?: string } | string} eventOrTitle
   * @returns {string | null} collectionId
   */
  matchBinding(eventOrTitle) {
    const title = typeof eventOrTitle === 'string'
      ? eventOrTitle
      : (eventOrTitle?.title || eventOrTitle?.summary || '');
    const eventId = typeof eventOrTitle === 'object' ? eventOrTitle?.id : null;

    const bindings = this.list();
    const lowerTitle = title.toLowerCase();

    for (const binding of bindings) {
      if (binding.matchType === 'EVENT_ID' && eventId && binding.matchValue === eventId) {
        return binding.collectionId;
      }
      if (binding.matchType === 'KEYWORD' && lowerTitle && lowerTitle.includes(binding.matchValue.toLowerCase())) {
        return binding.collectionId;
      }
    }

    return null;
  }
}

module.exports = CalendarBindingsRepository;
