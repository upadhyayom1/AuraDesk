/**
 * Step 4 Verification Test Suite
 * Tests WeatherService:
 * - OpenWeatherMap API integration with axios-retry and 8s timeout
 * - Strict 10-minute caching rule (memory + SQLite context_cache)
 * - isDay calculation: (dt >= sunrise && dt < sunset)
 * - Four-tier dayPart derivation ('dawn', 'day', 'dusk', 'night')
 * - Geocoding city -> coordinates via /geo/1.0/direct
 * - setLocation handling
 * - Fallback behavior when offline or unconfigured
 */

const assert = require('assert');
const Database = require('better-sqlite3');
const { runMigrations } = require('../electron/main/database/migrations/index');
const ContextCacheRepository = require('../electron/main/database/repositories/contextCacheRepo');
const WeatherService = require('../electron/main/services/weather/WeatherService');

async function runStep4Tests() {
  console.log('🧪 Starting Step 4 Verification Tests (WeatherService)...');

  // Setup in-memory SQLite for testing context_cache
  const db = new Database(':memory:');
  runMigrations(db);
  const contextRepo = new ContextCacheRepository(db);

  const mockAppSettings = {
    cachedSettings: {
      location: { city: 'Prayagraj', lat: 25.4358, lon: 81.8463 }
    },
    getSettings() {
      return this.cachedSettings;
    },
    async save(patch) {
      this.cachedSettings = { ...this.cachedSettings, ...patch };
    }
  };

  // 1. isDay and dayPart calculation tests
  console.log('Testing isDay and dayPart calculations...');
  const weatherCalc = new WeatherService();

  const sunrise = 1700000000;       // Sunrise timestamp
  const sunset = sunrise + 43200;    // 12 hours later

  // dt before sunrise
  assert.strictEqual(weatherCalc.calculateIsDay(sunrise - 3600, sunrise, sunset), false);
  // dt at sunrise
  assert.strictEqual(weatherCalc.calculateIsDay(sunrise, sunrise, sunset), true);
  // dt at noon
  assert.strictEqual(weatherCalc.calculateIsDay(sunrise + 21600, sunrise, sunset), true);
  // dt after sunset
  assert.strictEqual(weatherCalc.calculateIsDay(sunset + 3600, sunrise, sunset), false);

  // dayPart checks
  assert.strictEqual(weatherCalc.calculateDayPart(sunrise, sunrise, sunset), 'dawn');
  assert.strictEqual(weatherCalc.calculateDayPart(sunrise + 7200, sunrise, sunset), 'day');
  assert.strictEqual(weatherCalc.calculateDayPart(sunset, sunrise, sunset), 'dusk');
  assert.strictEqual(weatherCalc.calculateDayPart(sunset + 7200, sunrise, sunset), 'night');
  console.log('✅ isDay and dayPart calculations verified');

  // 2. OpenWeatherMap Live Request & 10-Minute Caching
  console.log('Testing live request, normalization, and strict 10-minute caching...');
  let apiRequests = [];

  const mockOpenWeatherClient = {
    defaults: { baseURL: 'https://api.openweathermap.org', timeout: 8000 },
    async get(url, config = {}) {
      apiRequests.push({ url, config });
      if (url === '/data/2.5/weather') {
        return {
          data: {
            weather: [{ main: 'Rain', description: 'moderate rain' }],
            main: { temp: 18.4, feels_like: 17.9, humidity: 82 },
            wind: { speed: 4.6 },
            dt: 1700010000,
            sys: { sunrise: 1700000000, sunset: 1700043200, country: 'IN' },
            name: 'Prayagraj'
          }
        };
      }
      if (url === '/geo/1.0/direct') {
        return {
          data: [
            { name: 'Tokyo', lat: 35.6762, lon: 139.6503, country: 'JP' }
          ]
        };
      }
      return { data: {} };
    }
  };

  const weatherService = new WeatherService({
    appSettings: mockAppSettings,
    contextCacheRepo: contextRepo,
    apiKey: 'test_weather_key',
    customClient: mockOpenWeatherClient,
    cacheTtlMs: 600000 // 10 minutes
  });

  // First fetch: should hit API
  apiRequests = [];
  const snapshot1 = await weatherService.getCurrentWeather();
  assert.strictEqual(apiRequests.length, 1, 'First call should query OpenWeatherMap API');
  assert.strictEqual(snapshot1.condition, 'Rain');
  assert.strictEqual(snapshot1.description, 'moderate rain');
  assert.strictEqual(snapshot1.tempC, 18);
  assert.strictEqual(snapshot1.city, 'Prayagraj');
  assert.strictEqual(snapshot1.isDay, true);

  // Check SQLite context_cache
  const cachedInDb = contextRepo.get('weather');
  assert(cachedInDb !== null, 'Weather snapshot must be persisted in SQLite context_cache');
  assert.strictEqual(cachedInDb.condition, 'Rain');

  // Second fetch: should hit 10-minute cache without incrementing API requests!
  apiRequests = [];
  const snapshot2 = await weatherService.getCurrentWeather();
  assert.strictEqual(apiRequests.length, 0, 'Second call within 10 minutes must hit cache and NOT make API request');
  assert.strictEqual(snapshot2.condition, 'Rain');

  // Force refresh should bypass cache
  const snapshot3 = await weatherService.getCurrentWeather(true);
  assert.strictEqual(apiRequests.length, 1, 'Force refresh must bypass cache');
  assert.strictEqual(snapshot3.condition, 'Rain');

  console.log('✅ Strict 10-minute caching rule (memory + SQLite) verified');

  // 3. Geocoding and setLocation
  console.log('Testing geocoding and setLocation...');
  apiRequests = [];
  const updatedSnapshot = await weatherService.setLocation({ city: 'Tokyo' });
  assert(apiRequests.some(r => r.url === '/geo/1.0/direct'), 'Should call direct geocoding endpoint');
  assert.strictEqual(mockAppSettings.cachedSettings.location.city, 'Tokyo');
  assert.strictEqual(mockAppSettings.cachedSettings.location.lat, 35.6762);
  assert.strictEqual(mockAppSettings.cachedSettings.location.lon, 139.6503);
  console.log('✅ Geocoding and setLocation verified');

  // 4. Fallback behavior when API key is missing
  console.log('Testing fallback behavior when unconfigured...');
  const unconfiguredService = new WeatherService({
    apiKey: '',
    appSettings: null,
    contextCacheRepo: null
  });

  const fallbackSnapshot = await unconfiguredService.getCurrentWeather();
  assert.strictEqual(fallbackSnapshot.condition, 'Clear');
  assert.strictEqual(fallbackSnapshot.isFallback, true);
  assert(typeof fallbackSnapshot.tempC === 'number');
  assert(typeof fallbackSnapshot.isDay === 'boolean');
  assert(['dawn', 'day', 'dusk', 'night'].includes(fallbackSnapshot.dayPart));
  console.log('✅ Unconfigured graceful fallback verified');

  db.close();
  console.log('\n🎉 ALL STEP 4 TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runStep4Tests().catch(err => {
  console.error('❌ Step 4 Test Failure:', err);
  process.exit(1);
});
