/**
 * Unsplash Wallpaper Source Adapter
 * Connects to Unsplash API (https://api.unsplash.com) with retry logic and normalized Wallpaper entities.
 */

const axios = require('axios');
const axiosRetry = require('axios-retry').default || require('axios-retry');
const WallpaperSource = require('./WallpaperSource');

class UnsplashSource extends WallpaperSource {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.accessKey]
   * @param {number} [options.timeout=8000]
   * @param {import('axios').AxiosInstance} [options.customClient]
   */
  constructor(options = {}) {
    super('unsplash');
    this.accessKey = options.accessKey || process.env.UNSPLASH_ACCESS_KEY || '';
    this.timeout = options.timeout || 8000;

    if (options.customClient) {
      this.client = options.customClient;
    } else {
      this.client = axios.create({
        baseURL: 'https://api.unsplash.com',
        timeout: this.timeout,
        headers: {
          'Accept-Version': 'v1',
          ...(this.accessKey ? { Authorization: `Client-ID ${this.accessKey}` } : {})
        }
      });

      // Configure retry logic: max 2 retries, exponential backoff, timeout 8s
      axiosRetry(this.client, {
        retries: 2,
        retryDelay: axiosRetry.exponentialDelay,
        retryCondition: (error) => {
          // Retry on network errors, idempotent errors, 5xx server errors, or timeout
          const isNetworkOrIdempotent = axiosRetry.isNetworkOrIdempotentRequestError(error);
          const isTimeout = error.code === 'ECONNABORTED';
          const isServer5xx = error.response && error.response.status >= 500 && error.response.status <= 599;
          return isNetworkOrIdempotent || isTimeout || isServer5xx;
        }
      });
    }

    // Cache of download_location URLs by raw ID for trackDownload calls
    this.downloadLocationCache = new Map();
  }

  /**
   * Updates or dynamic set of the access key
   * @param {string} key
   */
  setAccessKey(key) {
    this.accessKey = key;
    if (this.client && this.client.defaults) {
      if (key) {
        this.client.defaults.headers.common['Authorization'] = `Client-ID ${key}`;
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
    return id.startsWith('unsplash:') ? id.slice('unsplash:'.length) : id;
  }

  /**
   * Normalizes an Unsplash photo response object into the AuraDesk Wallpaper domain entity
   * @param {Object} photo
   * @returns {import('../../../../shared/types').Wallpaper}
   */
  normalize(photo) {
    if (!photo || !photo.id) return null;

    const rawId = String(photo.id);
    if (photo.links && photo.links.download_location) {
      this.downloadLocationCache.set(rawId, photo.links.download_location);
    }

    const title = (photo.description || photo.alt_description || 'Unsplash Wallpaper').trim();
    const description = (photo.alt_description || photo.description || '').trim();
    const imageUrl = photo.urls?.raw || photo.urls?.full || photo.urls?.regular || '';
    const thumbUrl = photo.urls?.regular || photo.urls?.small || photo.urls?.thumb || imageUrl;
    const photographer = photo.user?.name || photo.user?.username || 'Unsplash Contributor';

    const referralSuffix = '?utm_source=auradesk&utm_medium=referral';
    const creditUrl = photo.links?.html
      ? `${photo.links.html}${referralSuffix}`
      : (photo.user?.links?.html ? `${photo.user.links.html}${referralSuffix}` : 'https://unsplash.com');

    return {
      id: `unsplash:${rawId}`,
      source: 'unsplash',
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
   * Searches Unsplash photos
   * @param {string} query
   * @param {Object} [filters={}]
   * @param {number} [filters.page=1]
   * @param {number} [filters.perPage=20]
   * @param {'landscape' | 'portrait' | 'squarish'} [filters.orientation]
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

    if (filters.orientation && ['landscape', 'portrait', 'squarish'].includes(filters.orientation)) {
      params.orientation = filters.orientation;
    }

    if (filters.color) {
      params.color = filters.color;
    }

    const res = await this.client.get('/search/photos', { params });
    const data = res.data || {};
    const results = Array.isArray(data.results) ? data.results : [];

    const items = results.map(p => this.normalize(p)).filter(Boolean);
    const total = Number(data.total) || items.length;
    const totalPages = Number(data.total_pages) || Math.ceil(total / perPage);

    return {
      items,
      page,
      perPage,
      total,
      totalPages
    };
  }

  /**
   * Fetches curated / popular browse feed from Unsplash
   * @param {number} [page=1]
   * @param {number} [perPage=20]
   * @returns {Promise<{ items: Array<import('../../../../shared/types').Wallpaper>, page: number, perPage: number, total: number, totalPages: number }>}
   */
  async browse(page = 1, perPage = 20) {
    const p = Math.max(1, Number(page) || 1);
    const pp = Math.min(50, Math.max(1, Number(perPage) || 20));

    const res = await this.client.get('/photos', {
      params: {
        page: p,
        per_page: pp,
        order_by: 'popular'
      }
    });

    const results = Array.isArray(res.data) ? res.data : [];
    const items = results.map(item => this.normalize(item)).filter(Boolean);

    return {
      items,
      page: p,
      perPage: pp,
      total: items.length * 10, // Unsplash browse doesn't return total count
      totalPages: 100
    };
  }

  /**
   * Fetches a single wallpaper by ID
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
      source: 'unsplash'
    };
  }

  /**
   * Pings Unsplash download endpoint asynchronously when image is applied
   * As required by Unsplash API guideline: call photo.links.download_location with Client-ID
   * @param {string} id
   * @returns {Promise<void>}
   */
  async trackDownload(id) {
    const rawId = this._extractRawId(id);
    let downloadLocation = this.downloadLocationCache.get(rawId);

    try {
      if (!downloadLocation) {
        // If not cached, fetch photo detail to get download_location
        const res = await this.client.get(`/photos/${encodeURIComponent(rawId)}`);
        downloadLocation = res.data?.links?.download_location;
      }

      if (downloadLocation) {
        await this.client.get(downloadLocation);
      } else {
        // Fallback endpoint if specific location not found
        await this.client.get(`/photos/${encodeURIComponent(rawId)}/download`);
      }
    } catch (err) {
      // Unsplash tracking should be fire-and-forget; log without breaking wallpaper apply flow
      console.warn(`[UnsplashSource] trackDownload failed for photo ${rawId}:`, err.message);
    }
  }
}

module.exports = UnsplashSource;
