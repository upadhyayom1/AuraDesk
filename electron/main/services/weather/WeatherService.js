/**
 * WeatherService
 * Connects to OpenWeatherMap API (https://api.openweathermap.org) with strict 10-minute caching.
 * Implements:
 * - 10-minute memory and SQLite (context_cache) dual-layer caching
 * - Current weather fetching with metric units
 * - Geocoding via /geo/1.0/direct
 * - Accurate isDay calculation: (dt >= sys.sunrise && dt < sys.sunset)
 * - Four-tier dayPart derivation: 'dawn' | 'day' | 'dusk' | 'night'
 * - Graceful fallback when offline or API key is unconfigured
 */

const axios = require('axios');
const axiosRetry = require('axios-retry').default || require('axios-retry');

class WeatherService {
  /**
   * @param {Object} [options={}]
   * @param {import('../settings/AppSettings')} [options.appSettings]
   * @param {import('../../database/repositories/contextCacheRepo')} [options.contextCacheRepo]
   * @param {string} [options.apiKey]
   * @param {number} [options.cacheTtlMs=600000] - 10 minutes (600,000 ms)
   * @param {import('axios').AxiosInstance} [options.customClient]
   */
  constructor(options = {}) {
    this.appSettings = options.appSettings || null;
    this.contextCacheRepo = options.contextCacheRepo || null;
    this.apiKey = options.apiKey || process.env.OPENWEATHER_API_KEY || '';
    this.cacheTtlMs = typeof options.cacheTtlMs === 'number' ? options.cacheTtlMs : 10 * 60 * 1000;

    this.memoryCache = null; // { data, timestamp }

    if (options.customClient) {
      this.client = options.customClient;
    } else {
      this.client = axios.create({
        baseURL: 'https://api.openweathermap.org',
        timeout: 8000
      });

      axiosRetry(this.client, {
        retries: 2,
        retryDelay: axiosRetry.exponentialDelay,
        retryCondition: (error) => {
          const isNetworkOrIdempotent = axiosRetry.isNetworkOrIdempotentRequestError(error);
          const isTimeout = error.code === 'ECONNABORTED';
          const is5xx = error.response && error.response.status >= 500 && error.response.status <= 599;
          return isNetworkOrIdempotent || isTimeout || is5xx;
        }
      });
    }
  }

  /**
   * Sets or updates the OpenWeatherMap API key
   * @param {string} key
   */
  setApiKey(key) {
    this.apiKey = key;
  }

  /**
   * Calculates whether it is daytime based on unix timestamps
   * @param {number} dtSec
   * @param {number} sunriseSec
   * @param {number} sunsetSec
   * @returns {boolean}
   */
  calculateIsDay(dtSec, sunriseSec, sunsetSec) {
    if (!sunriseSec || !sunsetSec) {
      // Fallback: estimate daytime between 06:00 and 18:00 local time
      const hour = new Date(dtSec * 1000).getHours();
      return hour >= 6 && hour < 18;
    }
    return dtSec >= sunriseSec && dtSec < sunsetSec;
  }

  /**
   * Derives dayPart ('dawn' | 'day' | 'dusk' | 'night')
   * - dawn: 45 minutes before sunrise to 45 minutes after sunrise
   * - dusk: 45 minutes before sunset to 45 minutes after sunset
   * - day: between dawn and dusk
   * - night: after dusk and before dawn
   * @param {number} dtSec
   * @param {number} sunriseSec
   * @param {number} sunsetSec
   * @returns {'dawn' | 'day' | 'dusk' | 'night'}
   */
  calculateDayPart(dtSec, sunriseSec, sunsetSec) {
    if (!sunriseSec || !sunsetSec) {
      const hour = new Date(dtSec * 1000).getHours();
      if (hour >= 5 && hour < 7) return 'dawn';
      if (hour >= 7 && hour < 17) return 'day';
      if (hour >= 17 && hour < 19) return 'dusk';
      return 'night';
    }

    const dawnStart = sunriseSec - 45 * 60;
    const dawnEnd = sunriseSec + 45 * 60;
    const duskStart = sunsetSec - 45 * 60;
    const duskEnd = sunsetSec + 45 * 60;

    if (dtSec >= dawnStart && dtSec <= dawnEnd) return 'dawn';
    if (dtSec > dawnEnd && dtSec < duskStart) return 'day';
    if (dtSec >= duskStart && dtSec <= duskEnd) return 'dusk';
    return 'night';
  }

  /**
   * Checks both in-memory cache and context_cache table for cached weather snapshot
   * @returns {Object | null}
   * @private
   */
  _getCachedWeather() {
    const now = Date.now();

    // 1. In-memory cache check
    if (this.memoryCache && (now - this.memoryCache.timestamp < this.cacheTtlMs)) {
      return this.memoryCache.data;
    }

    // 2. SQLite context_cache check
    if (this.contextCacheRepo) {
      try {
        const cached = this.contextCacheRepo.getWithTimestamp('weather');
        if (cached && cached.fetchedAt) {
          const fetchedTime = new Date(cached.fetchedAt).getTime();
          if (!isNaN(fetchedTime) && (now - fetchedTime < this.cacheTtlMs)) {
            this.memoryCache = {
              timestamp: fetchedTime,
              data: cached.payload
            };
            return cached.payload;
          }
        }
      } catch (err) {
        console.warn('[WeatherService] Context cache read error:', err.message);
      }
    }

    return null;
  }

  /**
   * Stores weather snapshot into in-memory cache and SQLite context_cache
   * @param {Object} snapshot
   * @private
   */
  _setCachedWeather(snapshot) {
    this.memoryCache = {
      timestamp: Date.now(),
      data: snapshot
    };

    if (this.contextCacheRepo) {
      try {
        this.contextCacheRepo.set('weather', snapshot);
      } catch (err) {
        console.warn('[WeatherService] Context cache write error:', err.message);
      }
    }
  }

  /**
   * Clears the current weather cache (both memory and SQLite)
   */
  clearCache() {
    this.memoryCache = null;
    if (this.contextCacheRepo) {
      try {
        this.contextCacheRepo.delete('weather');
      } catch (err) {
        // ignore
      }
    }
  }

  /**
   * Gets current location coordinates from AppSettings
   * @private
   */
  _getCurrentLocation() {
    if (this.appSettings) {
      const settings = this.appSettings.getSettings ? this.appSettings.getSettings() : this.appSettings.cachedSettings;
      if (settings?.location) {
        return settings.location;
      }
    }
    return {};
  }

  /**
   * Fetches the current weather snapshot adhering strictly to the 10-minute caching rule
   * @param {boolean} [forceRefresh=false]
   * @returns {Promise<Object>} Weather snapshot
   */
  async getCurrentWeather(forceRefresh = false) {
    // 1. Strict 10-Minute Caching Check
    if (!forceRefresh) {
      const cached = this._getCachedWeather();
      if (cached) {
        return cached;
      }
    }

    let location = this._getCurrentLocation();

    // 2. If city is provided without coordinates, geocode first
    if ((!location.lat || !location.lon) && location.city && this.apiKey) {
      try {
        const geocoded = await this.geocodeCity(location.city);
        if (geocoded) {
          location = {
            ...location,
            lat: geocoded.lat,
            lon: geocoded.lon,
            city: geocoded.name || location.city
          };
          if (this.appSettings && typeof this.appSettings.save === 'function') {
            await this.appSettings.save({ location });
          }
        }
      } catch (e) {
        console.warn(`[WeatherService] Geocode failed for '${location.city}':`, e.message);
      }
    }

    // 3. Fallback when API key is missing or no location is configured
    if (!this.apiKey || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
      const nowSec = Math.floor(Date.now() / 1000);
      const isDay = this.calculateIsDay(nowSec, 0, 0);
      const dayPart = this.calculateDayPart(nowSec, 0, 0);

      const fallbackSnapshot = {
        condition: 'Clear',
        description: 'Clear skies (Default)',
        tempC: 22,
        feelsLikeC: 22,
        humidity: 50,
        windSpeed: 3.5,
        city: location.city || 'Local Area',
        country: '',
        isDay,
        dayPart,
        dt: nowSec,
        sunrise: nowSec - 21600,
        sunset: nowSec + 21600,
        fetchedAt: new Date().toISOString(),
        isFallback: true
      };

      this._setCachedWeather(fallbackSnapshot);
      return fallbackSnapshot;
    }

    // 4. Query live OpenWeatherMap API
    try {
      const res = await this.client.get('/data/2.5/weather', {
        params: {
          lat: location.lat,
          lon: location.lon,
          units: 'metric',
          appid: this.apiKey
        }
      });

      const data = res.data;
      const dt = Number(data.dt) || Math.floor(Date.now() / 1000);
      const sunrise = Number(data.sys?.sunrise) || (dt - 21600);
      const sunset = Number(data.sys?.sunset) || (dt + 21600);

      // Strict isDay and dayPart calculation
      const isDay = this.calculateIsDay(dt, sunrise, sunset);
      const dayPart = this.calculateDayPart(dt, sunrise, sunset);

      const condition = data.weather?.[0]?.main || 'Clear';
      const description = data.weather?.[0]?.description || condition;

      const snapshot = {
        condition,
        description,
        tempC: Math.round(data.main?.temp ?? 20),
        feelsLikeC: Math.round(data.main?.feels_like ?? data.main?.temp ?? 20),
        humidity: Number(data.main?.humidity) || 0,
        windSpeed: Number(data.wind?.speed) || 0,
        city: data.name || location.city || 'Unknown',
        country: data.sys?.country || '',
        isDay,
        dayPart,
        dt,
        sunrise,
        sunset,
        fetchedAt: new Date().toISOString(),
        isFallback: false
      };

      this._setCachedWeather(snapshot);
      return snapshot;
    } catch (err) {
      console.error('[WeatherService] Live weather request failed:', err.message);

      // If we have stale cache in SQLite, return it instead of failing completely
      if (this.contextCacheRepo) {
        const stale = this.contextCacheRepo.get('weather');
        if (stale) {
          console.warn('[WeatherService] Serving stale weather snapshot due to API error');
          return stale;
        }
      }

      // Otherwise return safe default
      const nowSec = Math.floor(Date.now() / 1000);
      return {
        condition: 'Clear',
        description: 'Clear skies (Offline)',
        tempC: 20,
        feelsLikeC: 20,
        humidity: 50,
        windSpeed: 0,
        city: location.city || 'Offline Area',
        country: '',
        isDay: this.calculateIsDay(nowSec, 0, 0),
        dayPart: this.calculateDayPart(nowSec, 0, 0),
        dt: nowSec,
        sunrise: nowSec - 21600,
        sunset: nowSec + 21600,
        fetchedAt: new Date().toISOString(),
        isFallback: true
      };
    }
  }

  /**
   * Geocodes a city name to latitude and longitude
   * @param {string} city
   * @returns {Promise<{ lat: number, lon: number, name: string, country: string } | null>}
   */
  async geocodeCity(city) {
    if (!city || typeof city !== 'string') {
      throw new Error('City name must be a non-empty string');
    }

    if (!this.apiKey) {
      throw new Error('OpenWeatherMap API key is required to geocode city');
    }

    const res = await this.client.get('/geo/1.0/direct', {
      params: {
        q: city.trim(),
        limit: 1,
        appid: this.apiKey
      }
    });

    const results = Array.isArray(res.data) ? res.data : [];
    if (results.length === 0) {
      return null;
    }

    const first = results[0];
    return {
      lat: Number(first.lat),
      lon: Number(first.lon),
      name: first.name,
      country: first.country || ''
    };
  }

  /**
   * Updates user location in settings, invalidates cache, and fetches updated weather
   * @param {{ city?: string, lat?: number, lon?: number }} locationInput
   * @returns {Promise<Object>} Updated weather snapshot
   */
  async setLocation(locationInput) {
    if (!locationInput || typeof locationInput !== 'object') {
      throw new Error('Invalid location payload');
    }

    let updatedLocation = {};

    if (locationInput.city && (!locationInput.lat || !locationInput.lon)) {
      const geocoded = await this.geocodeCity(locationInput.city);
      if (!geocoded) {
        throw new Error(`Location not found: "${locationInput.city}"`);
      }
      updatedLocation = {
        city: geocoded.name,
        country: geocoded.country,
        lat: geocoded.lat,
        lon: geocoded.lon
      };
    } else if (typeof locationInput.lat === 'number' && typeof locationInput.lon === 'number') {
      updatedLocation = {
        lat: locationInput.lat,
        lon: locationInput.lon,
        city: locationInput.city || ''
      };
    } else {
      throw new Error('Location payload must include either city or lat/lon coordinates');
    }

    // Persist to AppSettings
    if (this.appSettings && typeof this.appSettings.save === 'function') {
      await this.appSettings.save({ location: updatedLocation });
    }

    // Invalidate existing cache and fetch fresh weather for the new location
    this.clearCache();
    return this.getCurrentWeather(true);
  }
}

module.exports = WeatherService;
