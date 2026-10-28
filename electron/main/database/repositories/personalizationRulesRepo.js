/**
 * Personalization Rules Repository
 * Handles SQLite operations for the 'personalization_rules' table.
 */

const crypto = require('crypto');

class PersonalizationRulesRepository {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Maps a DB row into a normalized PersonalizationRule object
   * @private
   */
  _mapRow(row) {
    if (!row) return null;

    let conditionValue = row.condition_value;
    try {
      conditionValue = JSON.parse(row.condition_value);
    } catch {
      // keep raw string if not JSON
    }

    return {
      id: row.id,
      name: row.name,
      conditionType: row.condition_type,
      conditionValue,
      collectionId: row.collection_id,
      priority: Number(row.priority),
      enabled: Boolean(row.enabled)
    };
  }

  /**
   * Creates a new personalization rule
   * @param {Object} rule
   * @param {string} [rule.id]
   * @param {string} rule.name
   * @param {'TIME_RANGE' | 'WEATHER' | 'DAY_PART'} rule.conditionType
   * @param {string | Record<string, any>} rule.conditionValue
   * @param {string} rule.collectionId
   * @param {number} [rule.priority]
   * @param {boolean} [rule.enabled]
   * @returns {Object}
   */
  create(rule) {
    const id = rule.id || crypto.randomUUID();
    const condValStr = typeof rule.conditionValue === 'object'
      ? JSON.stringify(rule.conditionValue)
      : String(rule.conditionValue);

    // If priority is not specified, place it after highest existing priority
    let priority = rule.priority;
    if (typeof priority !== 'number') {
      const maxRow = this.db.prepare('SELECT MAX(priority) as maxPriority FROM personalization_rules').get();
      priority = (maxRow?.maxPriority != null ? maxRow.maxPriority : 0) + 1;
    }

    const enabled = rule.enabled === false ? 0 : 1;

    const stmt = this.db.prepare(`
      INSERT INTO personalization_rules (id, name, condition_type, condition_value, collection_id, priority, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, rule.name, rule.conditionType, condValStr, rule.collectionId, priority, enabled);
    return this.getById(id);
  }

  /**
   * Gets a single rule by ID
   * @param {string} id
   * @returns {Object | null}
   */
  getById(id) {
    const stmt = this.db.prepare('SELECT * FROM personalization_rules WHERE id = ?');
    const row = stmt.get(id);
    return this._mapRow(row);
  }

  /**
   * Lists all rules sorted by priority ASC
   * @returns {Array<Object>}
   */
  list() {
    const stmt = this.db.prepare('SELECT * FROM personalization_rules ORDER BY priority ASC, id ASC');
    const rows = stmt.all();
    return rows.map(r => this._mapRow(r));
  }

  /**
   * Lists only enabled rules sorted by priority ASC
   * @returns {Array<Object>}
   */
  listEnabled() {
    const stmt = this.db.prepare('SELECT * FROM personalization_rules WHERE enabled = 1 ORDER BY priority ASC, id ASC');
    const rows = stmt.all();
    return rows.map(r => this._mapRow(r));
  }

  /**
   * Updates an existing rule
   * @param {string} id
   * @param {Object} patch
   * @returns {Object | null}
   */
  update(id, patch) {
    const current = this.getById(id);
    if (!current) return null;

    const name = patch.name !== undefined ? patch.name : current.name;
    const conditionType = patch.conditionType !== undefined ? patch.conditionType : current.conditionType;

    let condValStr;
    if (patch.conditionValue !== undefined) {
      condValStr = typeof patch.conditionValue === 'object'
        ? JSON.stringify(patch.conditionValue)
        : String(patch.conditionValue);
    } else {
      condValStr = typeof current.conditionValue === 'object'
        ? JSON.stringify(current.conditionValue)
        : String(current.conditionValue);
    }

    const collectionId = patch.collectionId !== undefined ? patch.collectionId : current.collectionId;
    const priority = patch.priority !== undefined ? Number(patch.priority) : current.priority;
    const enabled = patch.enabled !== undefined ? (patch.enabled ? 1 : 0) : (current.enabled ? 1 : 0);

    const stmt = this.db.prepare(`
      UPDATE personalization_rules
      SET name = ?, condition_type = ?, condition_value = ?, collection_id = ?, priority = ?, enabled = ?
      WHERE id = ?
    `);

    stmt.run(name, conditionType, condValStr, collectionId, priority, enabled, id);
    return this.getById(id);
  }

  /**
   * Deletes a rule by ID
   * @param {string} id
   * @returns {boolean}
   */
  delete(id) {
    const stmt = this.db.prepare('DELETE FROM personalization_rules WHERE id = ?');
    const res = stmt.run(id);
    return res.changes > 0;
  }

  /**
   * Reorders rules by assigning priorities 1..N according to provided ordered IDs array in a transaction.
   * @param {string[]} orderedIds
   * @returns {Array<Object>}
   */
  reorder(orderedIds) {
    if (!Array.isArray(orderedIds)) return this.list();

    const updateStmt = this.db.prepare('UPDATE personalization_rules SET priority = ? WHERE id = ?');

    const tx = this.db.transaction((ids) => {
      ids.forEach((id, index) => {
        updateStmt.run(index + 1, id);
      });
    });

    tx(orderedIds);
    return this.list();
  }
}

module.exports = PersonalizationRulesRepository;
