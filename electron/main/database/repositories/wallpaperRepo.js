/**
 * Wallpaper Repository
 * Handles SQLite queries for the 'wallpapers' metadata cache and local files.
 */

class WallpaperRepository {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Maps a database row (snake_case) to domain model (camelCase)
   * @private
   */
  _mapRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      source: row.source,
      title: row.title || '',
      description: row.description || '',
      imageUrl: row.image_url,
      thumbUrl: row.thumb_url,
      photographer: row.photographer || '',
      creditUrl: row.credit_url || '',
      width: row.width,
      height: row.height,
      localPath: row.local_path || undefined,
      cachedAt: row.cached_at
    };
  }

  /**
   * Upserts a wallpaper record (online or local)
   * @param {Object} wp
   * @returns {Object} mapped wallpaper
   */
  upsert(wp) {
    if (!wp || !wp.id) {
      throw new Error('Wallpaper record must have a valid id');
    }

    let source = wp.source;
    if (!source || source === 'online') {
      if (wp.id.startsWith('unsplash:')) source = 'unsplash';
      else if (wp.id.startsWith('pexels:')) source = 'pexels';
      else if (wp.id.startsWith('local:') || wp.localPath) source = 'local';
      else source = 'unsplash';
    }

    const localPath = wp.localPath || (wp.imageUrl && wp.imageUrl.startsWith('file://') ? wp.imageUrl.replace('file://', '') : null);
    const imageUrl = wp.imageUrl || wp.thumbUrl || (localPath ? `file://${localPath}` : '');
    const thumbUrl = wp.thumbUrl || imageUrl || '';

    const stmt = this.db.prepare(`
      INSERT INTO wallpapers (
        id, source, title, description, image_url, thumb_url,
        photographer, credit_url, width, height, local_path, cached_at
      ) VALUES (
        @id, @source, @title, @description, @imageUrl, @thumbUrl,
        @photographer, @creditUrl, @width, @height, @localPath, CURRENT_TIMESTAMP
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        image_url = excluded.image_url,
        thumb_url = excluded.thumb_url,
        photographer = excluded.photographer,
        credit_url = excluded.credit_url,
        width = excluded.width,
        height = excluded.height,
        local_path = excluded.local_path,
        cached_at = CURRENT_TIMESTAMP
    `);

    stmt.run({
      id: wp.id,
      source,
      title: wp.title || '',
      description: wp.description || '',
      imageUrl,
      thumbUrl,
      photographer: wp.photographer || (source === 'local' ? 'Local' : 'Unknown'),
      creditUrl: wp.creditUrl || (source === 'unsplash' ? 'https://unsplash.com' : (source === 'pexels' ? 'https://pexels.com' : '')),
      width: Number(wp.width) || 1920,
      height: Number(wp.height) || 1080,
      localPath: localPath || null
    });

    return this.getById(wp.id);
  }

  /**
   * Retrieves a wallpaper by ID
   * @param {string} id
   * @returns {Object|null}
   */
  getById(id) {
    const stmt = this.db.prepare('SELECT * FROM wallpapers WHERE id = ?');
    const row = stmt.get(id);
    return this._mapRow(row);
  }

  /**
   * Deletes a wallpaper by ID
   * @param {string} id
   * @returns {boolean}
   */
  delete(id) {
    const stmt = this.db.prepare('DELETE FROM wallpapers WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Lists all local wallpapers
   * @returns {Array<Object>}
   */
  listLocal() {
    const stmt = this.db.prepare("SELECT * FROM wallpapers WHERE source = 'local' ORDER BY cached_at DESC");
    const rows = stmt.all();
    return rows.map((r) => this._mapRow(r));
  }

  /**
   * Lists wallpapers with pagination
   * @param {number} limit
   * @param {number} offset
   * @returns {Array<Object>}
   */
  list(limit = 50, offset = 0) {
    const stmt = this.db.prepare('SELECT * FROM wallpapers ORDER BY cached_at DESC LIMIT ? OFFSET ?');
    const rows = stmt.all(limit, offset);
    return rows.map((r) => this._mapRow(r));
  }
}

module.exports = WallpaperRepository;
