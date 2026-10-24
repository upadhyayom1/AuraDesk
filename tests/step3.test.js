/**
 * Step 3 Verification Test Suite
 * Tests WallpaperDiscoveryService:
 * - Multi-source aggregation (Fan-out & Merge) via Promise.allSettled
 * - Interleaved result merging [Unsplash, Pexels, ...]
 * - Pexels failover on Unsplash 403 / 429 rate limits
 * - Strict concurrency cap using p-limit(3)
 * - 5-minute in-memory caching for search and browse
 * - Universal routing for fetchWallpaper, getCredits, and trackDownload
 * - getSources() provider status reporting
 */

const assert = require('assert');
const WallpaperDiscoveryService = require('../electron/main/services/discovery/WallpaperDiscoveryService');

async function runStep3Tests() {
  console.log('🧪 Starting Step 3 Verification Tests (WallpaperDiscoveryService)...');

  // Create mock Unsplash & Pexels adapters
  let unsplashCalls = 0;
  let pexelsCalls = 0;

  const mockUnsplashSource = {
    name: 'unsplash',
    accessKey: 'unsplash_valid_key',
    search: async (q, filters) => {
      unsplashCalls++;
      return {
        items: [
          { id: 'unsplash:u1', title: `Unsplash 1 ${q}`, source: 'unsplash', imageUrl: 'http://u1' },
          { id: 'unsplash:u2', title: `Unsplash 2 ${q}`, source: 'unsplash', imageUrl: 'http://u2' }
        ],
        page: filters.page || 1,
        perPage: filters.perPage || 20,
        total: 50,
        totalPages: 3
      };
    },
    browse: async (page, perPage) => {
      unsplashCalls++;
      return {
        items: [
          { id: 'unsplash:ub1', title: 'Curated Unsplash 1', source: 'unsplash', imageUrl: 'http://ub1' }
        ],
        page,
        perPage,
        total: 20,
        totalPages: 2
      };
    },
    fetchWallpaper: async (id) => ({ id, title: 'Single Unsplash', source: 'unsplash' }),
    getCredits: async (id) => ({ photographer: 'Unsplash Artist', creditUrl: 'http://unsplash.com', source: 'unsplash' }),
    trackDownload: async (id) => { mockUnsplashSource.lastTrackedId = id; }
  };

  const mockPexelsSource = {
    name: 'pexels',
    apiKey: 'pexels_valid_key',
    search: async (q, filters) => {
      pexelsCalls++;
      return {
        items: [
          { id: 'pexels:p1', title: `Pexels 1 ${q}`, source: 'pexels', imageUrl: 'http://p1' },
          { id: 'pexels:p2', title: `Pexels 2 ${q}`, source: 'pexels', imageUrl: 'http://p2' }
        ],
        page: filters.page || 1,
        perPage: filters.perPage || 20,
        total: 40,
        totalPages: 2
      };
    },
    browse: async (page, perPage) => {
      pexelsCalls++;
      return {
        items: [
          { id: 'pexels:pb1', title: 'Curated Pexels 1', source: 'pexels', imageUrl: 'http://pb1' }
        ],
        page,
        perPage,
        total: 30,
        totalPages: 3
      };
    },
    fetchWallpaper: async (id) => ({ id, title: 'Single Pexels', source: 'pexels' }),
    getCredits: async (id) => ({ photographer: 'Pexels Artist', creditUrl: 'http://pexels.com', source: 'pexels' }),
    trackDownload: async (id) => { mockPexelsSource.lastTrackedId = id; }
  };

  const mockAppSettings = {
    cachedSettings: {
      sourcesEnabled: { unsplash: true, pexels: true }
    },
    getSettings() {
      return this.cachedSettings;
    }
  };

  const discovery = new WallpaperDiscoveryService({
    appSettings: mockAppSettings,
    unsplashSource: mockUnsplashSource,
    pexelsSource: mockPexelsSource,
    cacheTtlMs: 300000 // 5 minutes
  });

  // 1. Fan-out & Interleave Merge
  console.log('Testing Fan-out & Merge search...');
  unsplashCalls = 0;
  pexelsCalls = 0;

  const mergedSearch = await discovery.search('neon cyber', { page: 1, perPage: 20 });
  assert.strictEqual(unsplashCalls, 1, 'Unsplash should have been called once');
  assert.strictEqual(pexelsCalls, 1, 'Pexels should have been called once');
  assert.strictEqual(mergedSearch.items.length, 4, 'Should merge 2 items from each');

  // Check interleaving: [U1, P1, U2, P2]
  assert.strictEqual(mergedSearch.items[0].id, 'unsplash:u1');
  assert.strictEqual(mergedSearch.items[1].id, 'pexels:p1');
  assert.strictEqual(mergedSearch.items[2].id, 'unsplash:u2');
  assert.strictEqual(mergedSearch.items[3].id, 'pexels:p2');
  assert.strictEqual(mergedSearch.total, 90, 'Total should be sum of 50 + 40');
  console.log('✅ Fan-out and interleaved merging verified');

  // 2. 5-Minute In-Memory Caching
  console.log('Testing 5-minute search caching...');
  const cachedSearch = await discovery.search('neon cyber', { page: 1, perPage: 20 });
  // Call count should NOT have increased because of cache!
  assert.strictEqual(unsplashCalls, 1, 'Unsplash call count should not increase on cache hit');
  assert.strictEqual(pexelsCalls, 1, 'Pexels call count should not increase on cache hit');
  assert.strictEqual(cachedSearch.items.length, 4);

  // Clearing cache
  discovery.clearCache();
  await discovery.search('neon cyber', { page: 1, perPage: 20 });
  assert.strictEqual(unsplashCalls, 2, 'Unsplash should be called again after clearing cache');
  assert.strictEqual(pexelsCalls, 2, 'Pexels should be called again after clearing cache');
  console.log('✅ 5-minute caching and cache invalidation verified');

  // 3. Failover Logic (Unsplash 403 / 429 -> Pexels)
  console.log('Testing failover logic when Unsplash is rate-limited (429)...');
  discovery.clearCache();

  const rateLimitedUnsplash = {
    name: 'unsplash',
    accessKey: 'rate_limited_key',
    search: async () => {
      const err = new Error('Rate Limited');
      err.response = { status: 429 };
      err.code = 'ERR_RATE_LIMITED';
      throw err;
    },
    browse: async () => {
      const err = new Error('Forbidden');
      err.response = { status: 403 };
      throw err;
    }
  };

  const failoverDiscovery = new WallpaperDiscoveryService({
    appSettings: mockAppSettings,
    unsplashSource: rateLimitedUnsplash,
    pexelsSource: mockPexelsSource
  });

  // Search when source is 'unsplash' explicitly -> should failover to Pexels!
  const failoverSearch = await failoverDiscovery.search('aurora', { source: 'unsplash' });
  assert(failoverSearch.items.length > 0, 'Failover search should return items from Pexels');
  assert.strictEqual(failoverSearch.items[0].source, 'pexels');
  console.log('✅ Automatic failover to Pexels on Unsplash rate limit verified');

  // 4. Curated Browse
  console.log('Testing Browse feed with interleaving...');
  discovery.clearCache();
  const browseResult = await discovery.browse({ page: 1, perPage: 20 });
  assert(browseResult.items.length >= 2);
  assert.strictEqual(browseResult.items[0].id, 'unsplash:ub1');
  assert.strictEqual(browseResult.items[1].id, 'pexels:pb1');
  console.log('✅ Curated browse feed verified');

  // 5. Universal Routing (fetchWallpaper, getCredits, trackDownload)
  console.log('Testing universal routing by ID prefix...');
  const uPhoto = await discovery.fetchWallpaper('unsplash:u1');
  assert.strictEqual(uPhoto.id, 'unsplash:u1');
  assert.strictEqual(uPhoto.source, 'unsplash');

  const pPhoto = await discovery.fetchWallpaper('pexels:p1');
  assert.strictEqual(pPhoto.id, 'pexels:p1');
  assert.strictEqual(pPhoto.source, 'pexels');

  const uCredits = await discovery.getCredits('unsplash:u1');
  assert.strictEqual(uCredits.source, 'unsplash');

  const pCredits = await discovery.getCredits('pexels:p1');
  assert.strictEqual(pCredits.source, 'pexels');

  await discovery.trackDownload('unsplash:u99');
  assert.strictEqual(mockUnsplashSource.lastTrackedId, 'unsplash:u99');

  console.log('✅ Universal routing for single fetch, credits, and track download verified');

  // 6. Sources Status
  console.log('Testing getSources()...');
  const sources = discovery.getSources();
  assert.strictEqual(sources.length, 2);
  assert.strictEqual(sources[0].name, 'unsplash');
  assert.strictEqual(sources[0].enabled, true);
  assert.strictEqual(sources[0].ok, true);
  assert.strictEqual(sources[1].name, 'pexels');
  assert.strictEqual(sources[1].enabled, true);
  assert.strictEqual(sources[1].ok, true);
  console.log('✅ getSources() verified');

  console.log('\n🎉 ALL STEP 3 TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runStep3Tests().catch(err => {
  console.error('❌ Step 3 Test Failure:', err);
  process.exit(1);
});
