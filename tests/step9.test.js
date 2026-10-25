const assert = require('assert');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const { runMigrations } = require('../electron/main/database/migrations/index');
const PersonalizationRulesRepository = require('../electron/main/database/repositories/personalizationRulesRepo');
const OverridesRepository = require('../electron/main/database/repositories/overridesRepo');
const CalendarBindingsRepository = require('../electron/main/database/repositories/calendarBindingsRepo');
const CalendarEventsRepository = require('../electron/main/database/repositories/calendarEventsRepo');
const ContextCacheRepository = require('../electron/main/database/repositories/contextCacheRepo');

const WallpaperDiscoveryService = require('../electron/main/services/discovery/WallpaperDiscoveryService');
const { PersonalizationEngine } = require('../electron/main/services/personalization/index');
const { WallpaperSchema } = require('../shared/schemas/index');

async function runStep9Verification() {
  console.log('🧪 Starting Step 9 Verification & End-to-End Integration Tests...\n');

  // =========================================================================
  // SCENARIO 1: Test searching returns normalized Unsplash + Pexels results
  // =========================================================================
  console.log('--- Scenario 1: Search returns normalized Unsplash + Pexels results ---');

  const mockUnsplashSource = {
    name: 'unsplash',
    accessKey: 'test_unsplash_key',
    search: async (query, opts) => ({
      items: [
        {
          id: 'unsplash:photo-1',
          source: 'unsplash',
          title: 'Cyberpunk Tokyo Rain',
          imageUrl: 'https://images.unsplash.com/photo-1?raw=1',
          thumbUrl: 'https://images.unsplash.com/photo-1?thumb=1',
          photographer: 'Kenji Sato',
          creditUrl: 'https://unsplash.com/@kenjisato?utm_source=auradesk',
          width: 3840,
          height: 2160
        },
        {
          id: 'unsplash:photo-2',
          source: 'unsplash',
          title: 'Neon Alley Reflection',
          imageUrl: 'https://images.unsplash.com/photo-2?raw=1',
          thumbUrl: 'https://images.unsplash.com/photo-2?thumb=1',
          photographer: 'Elena Rostova',
          creditUrl: 'https://unsplash.com/@erostova?utm_source=auradesk',
          width: 4000,
          height: 2250
        }
      ],
      total: 15,
      page: 1,
      perPage: 2
    }),
    curated: async () => ({ items: [], total: 0 }),
    fetchWallpaper: async () => null,
    getCredits: async () => ({}),
    trackDownload: async () => {}
  };

  const mockPexelsSource = {
    name: 'pexels',
    apiKey: 'test_pexels_key',
    search: async (query, opts) => ({
      items: [
        {
          id: 'pexels:video-1',
          source: 'pexels',
          title: 'Futuristic Skyscraper City',
          imageUrl: 'https://images.pexels.com/photos/1/original.jpg',
          thumbUrl: 'https://images.pexels.com/photos/1/medium.jpg',
          photographer: 'Marcus Chen',
          creditUrl: 'https://www.pexels.com/@marcusc',
          width: 3840,
          height: 2160
        },
        {
          id: 'pexels:video-2',
          source: 'pexels',
          title: 'Cyberpunk Highway at Night',
          imageUrl: 'https://images.pexels.com/photos/2/original.jpg',
          thumbUrl: 'https://images.pexels.com/photos/2/medium.jpg',
          photographer: 'Aaliyah Khan',
          creditUrl: 'https://www.pexels.com/@aaliyahk',
          width: 5120,
          height: 2880
        }
      ],
      total: 20,
      page: 1,
      perPage: 2
    }),
    curated: async () => ({ items: [], total: 0 }),
    fetchWallpaper: async () => null,
    getCredits: async () => ({}),
    trackDownload: async () => {}
  };

  const discoveryService = new WallpaperDiscoveryService({
    unsplashSource: mockUnsplashSource,
    pexelsSource: mockPexelsSource
  });

  const searchResults = await discoveryService.search('cyberpunk neon', {
    source: 'all',
    page: 1,
    perPage: 4
  });

  assert(searchResults.items.length === 4, `Expected 4 interleaved items, got ${searchResults.items.length}`);
  
  // Verify interleaving order: [Unsplash0, Pexels0, Unsplash1, Pexels1]
  assert.strictEqual(searchResults.items[0].id, 'unsplash:photo-1');
  assert.strictEqual(searchResults.items[0].source, 'unsplash');
  assert.strictEqual(searchResults.items[1].id, 'pexels:video-1');
  assert.strictEqual(searchResults.items[1].source, 'pexels');
  assert.strictEqual(searchResults.items[2].id, 'unsplash:photo-2');
  assert.strictEqual(searchResults.items[2].source, 'unsplash');
  assert.strictEqual(searchResults.items[3].id, 'pexels:video-2');
  assert.strictEqual(searchResults.items[3].source, 'pexels');

  // Verify all items conform to WallpaperSchema
  for (const item of searchResults.items) {
    const parsed = WallpaperSchema.safeParse(item);
    assert(parsed.success, `Item ${item.id} failed WallpaperSchema validation: ${JSON.stringify(parsed.error?.errors)}`);
  }

  assert.strictEqual(searchResults.total, 35, 'Total should be sum of both sources (15 + 20)');
  console.log('✅ Scenario 1 Passed: Search successfully returned interleaved & validated Unsplash + Pexels wallpapers\n');

  // =========================================================================
  // SCENARIO 2: Test setting mock weather "Rain" triggers corresponding rule
  // =========================================================================
  console.log('--- Scenario 2: Mock weather "Rain" triggers corresponding rule ---');

  const dbPath = path.join(__dirname, 'test_step9.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  // Run real SQLite migrations
  runMigrations(db);

  // Initialize real repositories
  const rulesRepo = new PersonalizationRulesRepository(db);
  const overridesRepo = new OverridesRepository(db);
  const calendarBindingsRepo = new CalendarBindingsRepository(db);
  const calendarEventsRepo = new CalendarEventsRepository(db);
  const contextCacheRepo = new ContextCacheRepository(db);

  // Seed sample collections in database
  db.prepare(`
    INSERT INTO collections (id, name, created_at, updated_at) VALUES 
    ('col-sunny', 'Sunny Vibes', datetime('now'), datetime('now')),
    ('col-rain', 'Moody Rain Collection', datetime('now'), datetime('now')),
    ('col-calendar', 'Deep Work Focus', datetime('now'), datetime('now')),
    ('col-rotation', 'Default Landscape Rotation', datetime('now'), datetime('now'))
  `).run();

  // Seed rules: Rule 1 (Rain -> col-rain, priority 1), Rule 2 (Clear -> col-sunny, priority 2)
  rulesRepo.create({
    name: 'Rainy Atmosphere',
    conditionType: 'WEATHER',
    conditionValue: 'Rain',
    collectionId: 'col-rain',
    priority: 1,
    enabled: true
  });

  rulesRepo.create({
    name: 'Sunny Day Atmosphere',
    conditionType: 'WEATHER',
    conditionValue: 'Clear',
    collectionId: 'col-sunny',
    priority: 2,
    enabled: true
  });

  const mockWallpaperRepo = {
    getById: (id) => ({ id, title: 'Wallpaper ' + id, localPath: 'C:\\wallpapers\\' + id + '.jpg' }),
    get: (id) => ({ id, title: 'Wallpaper ' + id, localPath: 'C:\\wallpapers\\' + id + '.jpg' })
  };

  const mockCollectionsService = {
    pickItem: (collectionId) => {
      return {
        id: 'wall-for-' + collectionId,
        title: 'Selected wallpaper from ' + collectionId,
        collectionId
      };
    }
  };

  const mockRotationScheduler = {
    pickNext: () => ({
      id: 'wall-rotation-1',
      title: 'Scheduled rotation wallpaper'
    })
  };

  const mockWeatherService = {
    getCurrentWeather: async () => ({
      condition: 'Clear',
      tempC: 24,
      isDay: true,
      dayPart: 'day'
    })
  };

  const mockCalendarService = {
    getActiveEvent: () => null,
    matchBinding: () => null
  };

  const engine = new PersonalizationEngine({
    wallpaperRepo: mockWallpaperRepo,
    overridesRepo,
    rulesRepo,
    calendarService: mockCalendarService,
    weatherService: mockWeatherService,
    collectionsService: mockCollectionsService,
    rotationScheduler: mockRotationScheduler,
    appSettings: {
      getSettings: () => ({ autoAdaptEnabled: true })
    }
  });

  // Check initial evaluation under normal weather ('Clear')
  const initialDecision = await engine.chooseWallpaper();
  assert.strictEqual(initialDecision.trigger, 'RULE', 'Normal clear weather should match Clear rule');
  assert.strictEqual(initialDecision.collectionId, 'col-sunny');

  // Now set mock weather "Rain" (Demo Day simulation)
  console.log('Activating Mock Weather: "Rain"...');
  engine.setMockContext({ weather: 'Rain' });

  // Evaluate wallpaper selection with mock weather active
  const rainDecision = await engine.chooseWallpaper();
  assert.strictEqual(rainDecision.trigger, 'RULE', 'Mock weather Rain must trigger a RULE');
  assert.strictEqual(rainDecision.collectionId, 'col-rain', 'Mock weather Rain must activate col-rain collection');
  assert.strictEqual(rainDecision.wallpaper.collectionId, 'col-rain');
  console.log(`✅ Rule triggered: [${rainDecision.trigger}] collectionId: ${rainDecision.collectionId}`);
  console.log('✅ Scenario 2 Passed: Setting mock weather "Rain" triggered corresponding rule\'s collection\n');

  // =========================================================================
  // SCENARIO 3: Test manual override takes precedence over both rules & rotation
  // =========================================================================
  console.log('--- Scenario 3: Manual override takes precedence over rules & rotation ---');

  // Currently, mock weather "Rain" is still active and would select col-rain.
  // Set a manual override for a specific wallpaper
  console.log('Setting manual override for wallpaper: "wall-manual-override-99"...');
  engine.setOverride('wall-manual-override-99');

  const overrideDecision = await engine.chooseWallpaper();
  assert.strictEqual(
    overrideDecision.trigger,
    'MANUAL',
    `Expected trigger MANUAL, got ${overrideDecision.trigger}`
  );
  assert.strictEqual(
    overrideDecision.wallpaper.id,
    'wall-manual-override-99',
    'Override must return the explicitly chosen override wallpaper'
  );
  console.log(`✅ Priority 1 verified: [${overrideDecision.trigger}] wallpaper: ${overrideDecision.wallpaper.id} overrode active Rain rule`);

  // Verify override also takes precedence over calendar events
  engine.setMockContext({
    weather: 'Rain',
    activeEvent: { id: 'evt-hackathon', summary: 'Hackathon Demo Day' }
  });
  const overrideWithCalendarDecision = await engine.chooseWallpaper();
  assert.strictEqual(
    overrideWithCalendarDecision.trigger,
    'MANUAL',
    'Override must take precedence over Calendar events as well'
  );

  // Clear override and ensure system falls back to active Mock Event / Rule
  console.log('Clearing manual override...');
  engine.clearOverride();

  const postOverrideDecision = await engine.chooseWallpaper();
  // Now activeEvent or weather rule should match
  assert(
    postOverrideDecision.trigger === 'CALENDAR' || postOverrideDecision.trigger === 'RULE',
    'After clearing override, system must resume rule/calendar evaluation'
  );
  console.log(`✅ After clearing override, system correctly resumed: [${postOverrideDecision.trigger}]`);

  // Clear mock context entirely and verify fallback to rotation if no rules match
  engine.clearMockContext();
  // Disable both rules
  const allRules = rulesRepo.list();
  for (const r of allRules) {
    rulesRepo.update(r.id, { enabled: false });
  }

  const fallbackDecision = await engine.chooseWallpaper();
  assert.strictEqual(
    fallbackDecision.trigger,
    'ROTATION',
    'When no rules match and no overrides exist, system must fall back to ROTATION'
  );
  assert.strictEqual(fallbackDecision.wallpaper.id, 'wall-rotation-1');
  console.log(`✅ Rotation fallback verified: [${fallbackDecision.trigger}] wallpaper: ${fallbackDecision.wallpaper.id}`);

  console.log('✅ Scenario 3 Passed: Manual override takes strict precedence over rules and rotation\n');

  // Cleanup
  db.close();
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  console.log('🎉 ALL STEP 9 INTEGRATION VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runStep9Verification().catch(err => {
  console.error('❌ Step 9 Verification Failure:', err);
  process.exit(1);
});
