/**
 * WallpaperSource Base Adapter Interface
 * Common contract implemented by all external wallpaper discovery providers (Unsplash, Pexels).
 */

class WallpaperSource {
  /**
   * @param {string} name - 'unsplash' | 'pexels'
   */
  constructor(name) {
    if (!name) throw new Error('WallpaperSource must have a provider name');
    this.name = name;
  }

  /**
   * Searches for wallpapers with query and filters
   * @param {string} query
   * @param {Object} [filters={}]
   * @param {number} [filters.page=1]
   * @param {number} [filters.perPage=20]
   * @param {'landscape' | 'portrait' | 'squarish'} [filters.orientation]
   * @param {string} [filters.color]
   * @returns {Promise<{ items: Array<import('../../../../shared/types').Wallpaper>, page: number, perPage: number, total: number, totalPages: number }>}
   */
  async search(query, filters = {}) {
    throw new Error(`search() not implemented on ${this.name} adapter`);
  }

  /**
   * Fetches curated / popular browse feed
   * @param {number} [page=1]
   * @param {number} [perPage=20]
   * @returns {Promise<{ items: Array<import('../../../../shared/types').Wallpaper>, page: number, perPage: number, total: number, totalPages: number }>}
   */
  async browse(page = 1, perPage = 20) {
    throw new Error(`browse() not implemented on ${this.name} adapter`);
  }

  /**
   * Fetches full metadata for a single wallpaper by provider ID
   * @param {string} id
   * @returns {Promise<import('../../../../shared/types').Wallpaper>}
   */
  async fetchWallpaper(id) {
    throw new Error(`fetchWallpaper() not implemented on ${this.name} adapter`);
  }

  /**
   * Gets photographer credit and source link
   * @param {string} id
   * @returns {Promise<{ photographer: string, creditUrl: string, source: string }>}
   */
  async getCredits(id) {
    throw new Error(`getCredits() not implemented on ${this.name} adapter`);
  }

  /**
   * Tracks image download or usage (required by Unsplash API guideline)
   * @param {string} id
   * @returns {Promise<void>}
   */
  async trackDownload(id) {
    // Optional by default for sources that do not require ping
    return Promise.resolve();
  }
}

module.exports = WallpaperSource;
