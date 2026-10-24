/**
 * Calendar Events Cache Repository
 * Handles SQLite operations for the 'calendar_events_cache' table.
 */

class CalendarEventsRepository {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Maps a DB row into a normalized CalendarEvent object
   * @private
   */
  _mapRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      startTime: row.start_time,
      endTime: row.end_time,
      fetchedAt: row.fetched_at
    };
  }

  /**
   * Upserts a list of events into the cache within a single transaction
   * @param {Array<{ id: string, title: string, startTime: string, endTime: string }>} events
   */
  saveEvents(events) {
    if (!Array.isArray(events) || events.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT INTO calendar_events_cache (id, title, start_time, end_time, fetched_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        fetched_at = CURRENT_TIMESTAMP
    `);

    const tx = this.db.transaction((items) => {
      for (const item of items) {
        stmt.run(item.id, item.title, item.startTime, item.endTime);
      }
    });

    tx(events);
  }

  /**
   * Retrieves events occurring within the next N hours from a reference time
   * @param {number} [hours=24]
   * @param {Date | string} [fromTime=new Date()]
   * @returns {Array<Object>}
   */
  getUpcoming(hours = 24, fromTime = new Date()) {
    const from = fromTime instanceof Date ? fromTime : new Date(fromTime);
    const to = new Date(from.getTime() + hours * 60 * 60 * 1000);

    const stmt = this.db.prepare(`
      SELECT * FROM calendar_events_cache
      WHERE end_time >= ? AND start_time <= ?
      ORDER BY start_time ASC
    `);

    const rows = stmt.all(from.toISOString(), to.toISOString());
    return rows.map(r => this._mapRow(r));
  }

  /**
   * Retrieves the currently active event (if any) at given timestamp
   * @param {Date | string} [now=new Date()]
   * @returns {Object | null}
   */
  getActiveEvent(now = new Date()) {
    const iso = (now instanceof Date ? now : new Date(now)).toISOString();

    const stmt = this.db.prepare(`
      SELECT * FROM calendar_events_cache
      WHERE start_time <= ? AND end_time >= ?
      ORDER BY start_time DESC
      LIMIT 1
    `);

    const row = stmt.get(iso, iso);
    return this._mapRow(row);
  }

  /**
   * Deletes expired events ending before given timestamp
   * @param {Date | string} [beforeTime=new Date()]
   * @returns {number} number of deleted rows
   */
  clearOldEvents(beforeTime = new Date()) {
    const iso = (beforeTime instanceof Date ? beforeTime : new Date(beforeTime)).toISOString();
    const stmt = this.db.prepare('DELETE FROM calendar_events_cache WHERE end_time < ?');
    const res = stmt.run(iso);
    return res.changes;
  }

  /**
   * Clears all cached calendar events
   */
  clearAll() {
    this.db.prepare('DELETE FROM calendar_events_cache').run();
  }
}

module.exports = CalendarEventsRepository;
