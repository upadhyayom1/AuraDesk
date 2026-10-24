/**
 * WallpaperDiscoveryService
 * Central discovery orchestrator for external wallpaper portals (Unsplash & Pexels).
 * Implements:
 * - Fan-out & Merge across enabled sources via Promise.allSettled
 * - Automatic failover to Pexels if Unsplash hits 403 / 429 rate limits
 * - Strict concurrency cap using p-limit(3)
 * - 5-minute in-memory query & browse cache
 */

const pLimit = require('p-limit');
const { UnsplashSource, PexelsSource } = require('./adapters');

class WallpaperDiscoveryService {
  /**
   * @param {Object} [options={}]
   * @param {import('../settings/AppSettings')} [options.appSettings]
   * @param {UnsplashSource} [options.unsplashSource]
   * @param {PexelsSource} [options.pexelsSource]
   * @param {number} [options.cacheTtlMs=300000] - Default 5 minutes (300,000ms)
   * @param {number} [options.concurrencyLimit=3]
   */
  constructor(options = {}) {
    this.appSettings = options.appSettings || null;
    this.unsplash = options.unsplashSource || new UnsplashSource();
    this.pexels = options.pexelsSource || new PexelsSource();

    this.cacheTtlMs = typeof options.cacheTtlMs === 'number' ? options.cacheTtlMs : 5 * 60 * 1000;
    this.cache = new Map(); // key -> { timestamp, data }

    const limitFn = pLimit.default || pLimit;
    this.limit = limitFn(options.concurrencyLimit || 3);
  }

  /**
   * Checks if an external source is enabled in settings
   * @param {'unsplash' | 'pexels'} sourceName
   * @returns {boolean}
   */
  isSourceEnabled(sourceName) {
    if (!this.appSettings) return true;
    const settings = this.appSettings.getSettings ? this.appSettings.getSettings() : this.appSettings.cachedSettings;
    if (settings?.sourcesEnabled && typeof settings.sourcesEnabled[sourceName] === 'boolean') {
      return settings.sourcesEnabled[sourceName];
    }
    return true;
  }

  /**
   * Generates a stable cache key
   * @private
   */
  _buildCacheKey(prefix, params) {
    return `${prefix}:${JSON.stringify(params)}`;
  }

  /**
   * Reads from 5-minute in-memory cache if not expired
   * @private
   */
  _getFromCache(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.cacheTtlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  /**
   * Stores response in 5-minute in-memory cache
   * @private
   */
  _setCache(key, data) {
    this._cleanStaleCache();
    this.cache.set(key, {
      timestamp: Date.now(),
      data
    });
  }

  /**
   * Cleans up expired cache entries periodically
   * @private
   */
  _cleanStaleCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheTtlMs) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clears the entire discovery cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Interleaves items from multiple sources for visual variety
   * e.g., [U0, P0, U1, P1, ...]
   * @private
   */
  _interleave(arrays) {
    const validArrays = arrays.filter(arr => Array.isArray(arr) && arr.length > 0);
    if (validArrays.length === 0) return [];
    if (validArrays.length === 1) return [...validArrays[0]];

    const result = [];
    const maxLength = Math.max(...validArrays.map(a => a.length));

    for (let i = 0; i < maxLength; i++) {
      for (const arr of validArrays) {
        if (i < arr.length) {
          result.push(arr[i]);
        }
      }
    }
    return result;
  }

  /**
   * Searches for wallpapers with fan-out, merging, Pexels failover, and 5-minute caching
   * @param {string} query
   * @param {Object} [filters={}]
   * @param {'unsplash' | 'pexels' | 'all'} [filters.source='all']
   * @param {'landscape' | 'portrait' | 'squarish'} [filters.orientation]
   * @param {string} [filters.color]
   * @param {number} [filters.page=1]
   * @param {number} [filters.perPage=20]
   * @returns {Promise<{ items: Array<import('../../../../shared/types').Wallpaper>, page: number, perPage: number, total: number, totalPages: number }>}
   */
  async search(query, filters = {}) {
    const cleanQuery = (query || '').trim();
    const page = Math.max(1, Number(filters.page) || 1);
    const perPage = Math.min(50, Math.max(1, Number(filters.perPage) || 20));
    const targetSource = filters.source || 'all';

    const cacheKey = this._buildCacheKey('search', {
      query: cleanQuery,
      source: targetSource,
      orientation: filters.orientation,
      color: filters.color,
      page,
      perPage
    });

    const cached = this._getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Determine sources to query based on filters and settings
    const sourcesToQuery = [];
    if (targetSource === 'unsplash' || targetSource === 'all') {
      if (this.isSourceEnabled('unsplash')) sourcesToQuery.push(this.unsplash);
    }
    if (targetSource === 'pexels' || targetSource === 'all') {
      if (this.isSourceEnabled('pexels')) sourcesToQuery.push(this.pexels);
    }

    if (sourcesToQuery.length === 0) {
      // Fallback: at least query one source if both are disabled in settings
      sourcesToQuery.push(this.pexels);
    }

    // Concurrency control: Wrap external calls with p-limit(3)
    const tasks = sourcesToQuery.map(src => {
      return this.limit(() => src.search(cleanQuery, { ...filters, page, perPage }));
    });

    const settled = await Promise.allSettled(tasks);

    let unsplashResult = null;
    let unsplashError = null;
    let pexelsResult = null;
    let pexelsError = null;

    settled.forEach((res, idx) => {
      const src = sourcesToQuery[idx];
      if (src.name === 'unsplash') {
        if (res.status === 'fulfilled') unsplashResult = res.value;
        else unsplashError = res.reason;
      } else if (src.name === 'pexels') {
        if (res.status === 'fulfilled') pexelsResult = res.value;
        else pexelsError = res.reason;
      }
    });

    // Failover Logic: If Unsplash failed with 403 or 429, immediately fallback to Pexels if not already run
    const isUnsplashRateLimited = unsplashError && (
      unsplashError.response?.status === 403 ||
      unsplashError.response?.status === 429 ||
      unsplashError.code === 'ERR_RATE_LIMITED'
    );

    if (isUnsplashRateLimited && !pexelsResult) {
      console.warn('[WallpaperDiscoveryService] Unsplash rate limited (403/429). Triggering automatic failover to Pexels...');
      try {
        pexelsResult = await this.limit(() => this.pexels.search(cleanQuery, { ...filters, page, perPage }));
      } catch (err) {
        console.error('[WallpaperDiscoveryService] Failover to Pexels also failed:', err.message);
      }
    }

    // If both failed and we have no items, rethrow meaningful error
    if (!unsplashResult && !pexelsResult) {
      const primaryErr = unsplashError || pexelsError || new Error('All wallpaper discovery sources failed');
      throw primaryErr;
    }

    // Interleave results from fulfilled providers
    const resultArrays = [];
    let total = 0;

    if (unsplashResult) {
      resultArrays.push(unsplashResult.items || []);
      total += (unsplashResult.total || 0);
    }
    if (pexelsResult) {
      resultArrays.push(pexelsResult.items || []);
      total += (pexelsResult.total || 0);
    }

    const items = this._interleave(resultArrays);
    const totalPages = Math.ceil(total / perPage) || 1;

    const response = {
      items,
      page,
      perPage,
      total: total || items.length,
      totalPages
    };

    // Cache online query results for 5 minutes
    this._setCache(cacheKey, response);
    return response;
  }

  /**
   * Fetches curated / popular browse feed with fan-out, merging, and 5-minute caching
   * @param {Object} [options={}]
   * @param {'unsplash' | 'pexels' | 'all'} [options.source='all']
   * @param {number} [options.page=1]
   * @param {number} [options.perPage=20]
   * @returns {Promise<{ items: Array<import('../../../../shared/types').Wallpaper>, page: number, perPage: number, total: number, totalPages: number }>}
   */
  async browse(options = {}) {
    const page = Math.max(1, Number(options.page) || 1);
    const perPage = Math.min(50, Math.max(1, Number(options.perPage) || 20));
    const targetSource = options.source || 'all';

    const cacheKey = this._buildCacheKey('browse', {
      source: targetSource,
      page,
      perPage
    });

    const cached = this._getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const sourcesToQuery = [];
    if (targetSource === 'unsplash' || targetSource === 'all') {
      if (this.isSourceEnabled('unsplash')) sourcesToQuery.push(this.unsplash);
    }
    if (targetSource === 'pexels' || targetSource === 'all') {
      if (this.isSourceEnabled('pexels')) sourcesToQuery.push(this.pexels);
    }
    if (sourcesToQuery.length === 0) {
      sourcesToQuery.push(this.pexels);
    }

    const tasks = sourcesToQuery.map(src => {
      return this.limit(() => src.browse(page, perPage));
    });

    const settled = await Promise.allSettled(tasks);

    let unsplashResult = null;
    let unsplashError = null;
    let pexelsResult = null;

    settled.forEach((res, idx) => {
      const src = sourcesToQuery[idx];
      if (src.name === 'unsplash') {
        if (res.status === 'fulfilled') unsplashResult = res.value;
        else unsplashError = res.reason;
      } else if (src.name === 'pexels') {
        if (res.status === 'fulfilled') pexelsResult = res.value;
      }
    });

    // Failover if Unsplash rate limited
    const isUnsplashRateLimited = unsplashError && (
      unsplashError.response?.status === 403 ||
      unsplashError.response?.status === 429
    );

    if (isUnsplashRateLimited && !pexelsResult) {
      console.warn('[WallpaperDiscoveryService] Unsplash rate limited during browse. Falling back to Pexels...');
      try {
        pexelsResult = await this.limit(() => this.pexels.browse(page, perPage));
      } catch (e) {
        // ignore
      }
    }

    const resultArrays = [];
    let total = 0;

    if (unsplashResult) {
      resultArrays.push(unsplashResult.items || []);
      total += (unsplashResult.total || 0);
    }
    if (pexelsResult) {
      resultArrays.push(pexelsResult.items || []);
      total += (pexelsResult.total || 0);
    }

    const items = this._interleave(resultArrays);
    const totalPages = Math.ceil(total / perPage) || 1;

    const response = {
      items,
      page,
      perPage,
      total: total || items.length,
      totalPages
    };

    this._setCache(cacheKey, response);
    return response;
  }

  /**
   * Fetches single wallpaper detail by universal ID ('unsplash:<id>' or 'pexels:<id>')
   * @param {string} wallpaperId
   * @returns {Promise<import('../../../../shared/types').Wallpaper>}
   */
  async fetchWallpaper(wallpaperId) {
    if (typeof wallpaperId !== 'string') {
      throw new Error('wallpaperId must be a string');
    }

    if (wallpaperId.startsWith('unsplash:')) {
      return this.limit(() => this.unsplash.fetchWallpaper(wallpaperId));
    } else if (wallpaperId.startsWith('pexels:')) {
      return this.limit(() => this.pexels.fetchWallpaper(wallpaperId));
    }

    // Attempt Unsplash then Pexels
    try {
      return await this.limit(() => this.unsplash.fetchWallpaper(wallpaperId));
    } catch {
      return await this.limit(() => this.pexels.fetchWallpaper(wallpaperId));
    }
  }

  /**
   * Retrieves photographer credits for a wallpaper
   * @param {string} wallpaperId
   * @returns {Promise<{ photographer: string, creditUrl: string, source: string }>}
   */
  async getCredits(wallpaperId) {
    if (typeof wallpaperId !== 'string') {
      throw new Error('wallpaperId must be a string');
    }

    if (wallpaperId.startsWith('unsplash:')) {
      return this.limit(() => this.unsplash.getCredits(wallpaperId));
    } else if (wallpaperId.startsWith('pexels:')) {
      return this.limit(() => this.pexels.getCredits(wallpaperId));
    }

    try {
      return await this.limit(() => this.unsplash.getCredits(wallpaperId));
    } catch {
      return await this.limit(() => this.pexels.getCredits(wallpaperId));
    }
  }

  /**
   * Tracks wallpaper download/usage
   * @param {string} wallpaperId
   * @returns {Promise<void>}
   */
  async trackDownload(wallpaperId) {
    if (!wallpaperId || typeof wallpaperId !== 'string') return;

    if (wallpaperId.startsWith('unsplash:')) {
      await this.unsplash.trackDownload(wallpaperId);
    } else if (wallpaperId.startsWith('pexels:')) {
      await this.pexels.trackDownload(wallpaperId);
    }
  }

  /**
   * Returns health and configuration status of discovery sources
   * @returns {Array<{ name: string, enabled: boolean, ok: boolean }>}
   */
  getSources() {
    return [
      {
        name: 'unsplash',
        enabled: this.isSourceEnabled('unsplash'),
        ok: Boolean(this.unsplash.accessKey)
      },
      {
        name: 'pexels',
        enabled: this.isSourceEnabled('pexels'),
        ok: Boolean(this.pexels.apiKey)
      }
    ];
  }
}

module.exports = WallpaperDiscoveryService;
