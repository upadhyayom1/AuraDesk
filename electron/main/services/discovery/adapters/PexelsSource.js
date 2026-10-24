/**
 * Pexels Wallpaper Source Adapter
 * Connects to Pexels API (https://api.pexels.com/v1) with retry logic and normalized Wallpaper entities.
 */

const axios = require('axios');
const axiosRetry = require('axios-retry').default || require('axios-retry');
const WallpaperSource = require('./WallpaperSource');

class PexelsSource extends WallpaperSource {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.apiKey]
   * @param {number} [options.timeout=8000]
   * @param {import('axios').AxiosInstance} [options.customClient]
   */
  constructor(options = {}) {
    super('pexels');
    this.apiKey = options.apiKey || process.env.PEXELS_API_KEY || '';
    this.timeout = options.timeout || 8000;

    if (options.customClient) {
      this.client = options.customClient;
    } else {
      this.client = axios.create({
        baseURL: 'https://api.pexels.com/v1',
        timeout: this.timeout,
        headers: {
          ...(this.apiKey ? { Authorization: this.apiKey } : {})
        }
      });

      // Configure retry logic: max 2 retries, exponential backoff, timeout 8s
      axiosRetry(this.client, {
        retries: 2,
        retryDelay: axiosRetry.exponentialDelay,
        retryCondition: (error) => {
          const isNetworkOrIdempotent = axiosRetry.isNetworkOrIdempotentRequestError(error);
          const isTimeout = error.code === 'ECONNABORTED';
          const isServer5xx = error.response && error.response.status >= 500 && error.response.status <= 599;
          return isNetworkOrIdempotent || isTimeout || isServer5xx;
        }
      });
    }
  }

  /**
   * Updates or dynamic set of the API key
   * @param {string} key
   */
  setApiKey(key) {
    this.apiKey = key;
    if (this.client && this.client.defaults) {
      if (key) {
        this.client.defaults.headers.common['Authorization'] = key;
      } else {
        delete this.client.defaults.headers.common['Authorization'];
      }
    }
  }

  /**
   * Extracts clean ID without provider prefix
   * @param {string} id
   * @returns {string}
   * @private
   */
  _extractRawId(id) {
    if (typeof id !== 'string') return '';
    return id.startsWith('pexels:') ? id.slice('pexels:'.length) : id;
  }

  /**
   * Normalizes a Pexels photo response object into the AuraDesk Wallpaper domain entity
   * @param {Object} photo
   * @returns {import('../../../../shared/types').Wallpaper}
   */
  normalize(photo) {
    if (!photo || !photo.id) return null;

    const rawId = String(photo.id);
    const title = (photo.alt || 'Pexels Wallpaper').trim();
    const description = (photo.alt || '').trim();
    const imageUrl = photo.src?.original || photo.src?.large2x || photo.src?.large || '';
    const thumbUrl = photo.src?.large || photo.src?.medium || photo.src?.tiny || imageUrl;
    const photographer = (photo.photographer || 'Pexels Contributor').trim();
    const creditUrl = photo.url || photo.photographer_url || 'https://www.pexels.com';

    return {
      id: `pexels:${rawId}`,
      source: 'pexels',
      title: title.length > 80 ? `${title.substring(0, 77)}...` : title,
      description,
      imageUrl,
      thumbUrl,
      photographer,
      creditUrl,
      width: Number(photo.width) || 1920,
      height: Number(photo.height) || 1080,
      cachedAt: new Date().toISOString()
    };
  }

  /**
   * Searches Pexels photos
   * @param {string} query
   * @param {Object} [filters={}]
   * @param {number} [filters.page=1]
   * @param {number} [filters.perPage=20]
   * @param {'landscape' | 'portrait' | 'squarish' | 'square'} [filters.orientation]
   * @param {string} [filters.color]
   * @returns {Promise<{ items: Array<import('../../../../shared/types').Wallpaper>, page: number, perPage: number, total: number, totalPages: number }>}
   */
  async search(query, filters = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const perPage = Math.min(50, Math.max(1, Number(filters.perPage) || 20));

    const params = {
      query: (query || '').trim(),
      page,
      per_page: perPage
    };

    if (filters.orientation) {
      // Pexels uses 'square' instead of 'squarish'
      params.orientation = filters.orientation === 'squarish' ? 'square' : filters.orientation;
    }

    if (filters.color) {
      params.color = filters.color;
    }

    const res = await this.client.get('/search', { params });
    const data = res.data || {};
    const photos = Array.isArray(data.photos) ? data.photos : [];

    const items = photos.map(p => this.normalize(p)).filter(Boolean);
    const total = Number(data.total_results) || items.length;
    const totalPages = Math.ceil(total / perPage);

    return {
      items,
      page,
      perPage,
      total,
      totalPages
    };
  }

  /**
   * Fetches curated browse feed from Pexels
   * @param {number} [page=1]
   * @param {number} [perPage=20]
   * @returns {Promise<{ items: Array<import('../../../../shared/types').Wallpaper>, page: number, perPage: number, total: number, totalPages: number }>}
   */
  async browse(page = 1, perPage = 20) {
    const p = Math.max(1, Number(page) || 1);
    const pp = Math.min(50, Math.max(1, Number(perPage) || 20));

    const res = await this.client.get('/curated', {
      params: {
        page: p,
        per_page: pp
      }
    });

    const data = res.data || {};
    const photos = Array.isArray(data.photos) ? data.photos : [];
    const items = photos.map(p => this.normalize(p)).filter(Boolean);
    const total = Number(data.total_results) || items.length;
    const totalPages = Math.ceil(total / pp);

    return {
      items,
      page: p,
      perPage: pp,
      total,
      totalPages
    };
  }

  /**
   * Fetches single wallpaper by ID
   * @param {string} id
   * @returns {Promise<import('../../../../shared/types').Wallpaper>}
   */
  async fetchWallpaper(id) {
    const rawId = this._extractRawId(id);
    const res = await this.client.get(`/photos/${encodeURIComponent(rawId)}`);
    return this.normalize(res.data);
  }

  /**
   * Gets photographer credit and source link
   * @param {string} id
   * @returns {Promise<{ photographer: string, creditUrl: string, source: string }>}
   */
  async getCredits(id) {
    const wp = await this.fetchWallpaper(id);
    return {
      photographer: wp.photographer,
      creditUrl: wp.creditUrl,
      source: 'pexels'
    };
  }

  /**
   * Pexels does not require download tracking ping, resolves cleanly
   * @param {string} id
   * @returns {Promise<void>}
   */
  async trackDownload(id) {
    return Promise.resolve();
  }
}

module.exports = PexelsSource;
