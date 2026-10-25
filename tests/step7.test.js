/**
 * Step 7 Verification Test Suite
 * Tests Mock Context Switch (Demo Day Feature):
 * - setMockContext({ weather, activeEvent })
 * - toggleMockWeather, toggleMockCalendarEvent, setMockTime
 * - Context snapshot overlay
 * - Live wallpaper switching triggered by mock context
 * - Mock evaluation & apply
 */

const assert = require('assert');
const Database = require('better-sqlite3');
const { runMigrations } = require('../electron/main/database/migrations/index');
const WallpaperRepository = require('../electron/main/database/repositories/wallpaperRepo');
const OverridesRepository = require('../electron/main/database/repositories/overridesRepo');
const PersonalizationRulesRepository = require('../electron/main/database/repositories/personalizationRulesRepo');
const CalendarBindingsRepository = require('../electron/main/database/repositories/calendarBindingsRepo');
const PersonalizationEngine = require('../electron/main/services/personalization/PersonalizationEngine');

async function runStep7Tests() {
  console.log('🧪 Starting Step 7 Verification Tests (Mock Context Switch)...');

  // Setup in-memory SQLite DB
  const db = new Database(':memory:');
  runMigrations(db);

  const wallpaperRepo = new WallpaperRepository(db);
  const overridesRepo = new OverridesRepository(db);
  const rulesRepo = new PersonalizationRulesRepository(db);
  const calendarBindingsRepo = new CalendarBindingsRepository(db);

  // Seed sample wallpapers
  const wpRain = wallpaperRepo.upsert({
    id: 'pexels:rain-mood',
    source: 'pexels',
    title: 'Rainy Atmosphere',
    imageUrl: 'http://rain.jpg',
    thumbUrl: 'http://rain-thumb.jpg',
    photographer: 'Rain Photographer',
    creditUrl: 'http://pexels.com',
    width: 3840,
    height: 2160
  });

  const wpExam = wallpaperRepo.upsert({
    id: 'unsplash:exam-focus',
    source: 'unsplash',
    title: 'Focus & Study Space',
    imageUrl: 'http://exam.jpg',
    thumbUrl: 'http://exam-thumb.jpg',
    photographer: 'Study Pro',
    creditUrl: 'http://unsplash.com',
    width: 3840,
    height: 2160
  });

  // Seed collections
  db.prepare("INSERT INTO collections (id, name) VALUES ('col-rain', 'Rainy Mood Vault')").run();
  db.prepare("INSERT INTO collections (id, name) VALUES ('col-exam', 'Exam Focus Vault')").run();

  // Seed personalization rule: Weather == Rain -> col-rain
  rulesRepo.create({
    id: 'rule-rain',
    name: 'Rainy Days Rule',
    conditionType: 'WEATHER',
    conditionValue: { condition: 'Rain' },
    collectionId: 'col-rain',
    priority: 1,
    enabled: true
  });

  // Seed calendar binding: "exam" -> col-exam
  calendarBindingsRepo.create({
    id: 'bind-exam',
    matchType: 'KEYWORD',
    matchValue: 'exam',
    collectionId: 'col-exam',
    priority: 1
  });

  const mockCollectionsService = {
    pickItem(colId) {
      if (colId === 'col-rain') return wpRain;
      if (colId === 'col-exam') return wpExam;
      return null;
    }
  };

  const mockCalendarService = {
    matchBinding(event) {
      return calendarBindingsRepo.matchBinding(event);
    },
    getActiveEvent() {
      return null;
    }
  };

  let appliedWallpaper = null;
  let appliedTrigger = null;
  const mockWallpaperManager = {
    apply: async (wp, trigger) => {
      appliedWallpaper = wp;
      appliedTrigger = trigger;
    }
  };

  const engine = new PersonalizationEngine({
    appSettings: { cachedSettings: { autoAdaptEnabled: true } },
    wallpaperRepo,
    overridesRepo,
    rulesRepo,
    calendarService: mockCalendarService,
    collectionsService: mockCollectionsService
  });

  // 1. Initial State: No mock context
  console.log('Testing initial clean context state...');
  assert.strictEqual(engine.getMockContext(), null);

  // 2. Mock Weather Toggle
  console.log('Testing Mock Weather Toggle...');
  engine.toggleMockWeather('Rain', { tempC: 17 });
  let mockState = engine.getMockContext();
  assert(mockState !== null);
  assert.strictEqual(mockState.weather, 'Rain');
  assert.strictEqual(mockState.tempC, 17);

  // Check getContext() reflects mock weather
  let context = await engine.getContext();
  assert.strictEqual(context.weather.condition, 'Rain');
  assert.strictEqual(context.weather.tempC, 17);

  // Live Wallpaper Decision with Mock Weather: Should pick Rainy Mood collection!
  let decision = await engine.chooseWallpaper();
  assert.strictEqual(decision.trigger, 'RULE');
  assert.strictEqual(decision.rule.id, 'rule-rain');
  assert.strictEqual(decision.wallpaper.id, 'pexels:rain-mood');
  console.log('✅ Mock weather "Rain" immediately activates Rainy rule');

  // Toggle off mock weather
  engine.toggleMockWeather('Rain');
  assert.strictEqual(engine.getMockContext(), null);
  console.log('✅ Mock weather toggle off validated');

  // 3. Mock Calendar Event Toggle
  console.log('Testing Mock Calendar Event Toggle...');
  engine.toggleMockCalendarEvent('Softablitz Final Exam');
  mockState = engine.getMockContext();
  assert(mockState !== null);
  assert.strictEqual(mockState.activeEvent.title, 'Softablitz Final Exam');

  context = await engine.getContext();
  assert(context.activeEvent !== null);
  assert.strictEqual(context.activeEvent.title, 'Softablitz Final Exam');

  // Live Wallpaper Decision with Mock Calendar: Should pick Exam Focus collection!
  decision = await engine.chooseWallpaper();
  assert.strictEqual(decision.trigger, 'CALENDAR');
  assert.strictEqual(decision.collectionId, 'col-exam');
  assert.strictEqual(decision.wallpaper.id, 'unsplash:exam-focus');
  console.log('✅ Mock calendar event immediately activates Calendar binding');

  // Toggle off calendar event
  engine.toggleMockCalendarEvent('Softablitz Final Exam');
  assert.strictEqual(engine.getMockContext(), null);
  console.log('✅ Mock calendar toggle off validated');

  // 4. Mock Time & DayPart
  console.log('Testing Mock Time & DayPart...');
  engine.setMockTime('23:45', 'night');
  mockState = engine.getMockContext();
  assert.strictEqual(mockState.isDay, false);
  assert.strictEqual(mockState.dayPart, 'night');

  context = await engine.getContext();
  assert.strictEqual(context.isDay, false);
  assert.strictEqual(context.weather.dayPart, 'night');
  console.log('✅ Mock time and dayPart validated');

  // 5. evaluateAndApplyMock Demo Switch
  console.log('Testing evaluateAndApplyMock live application...');
  engine.setMockContext({ weather: 'Rain' });
  const mockApplyResult = await engine.evaluateAndApplyMock(mockWallpaperManager);
  assert.strictEqual(mockApplyResult.applied, true);
  assert.strictEqual(appliedWallpaper.id, 'pexels:rain-mood');
  assert.strictEqual(appliedTrigger, 'RULE');
  console.log('✅ evaluateAndApplyMock successfully applied wallpaper to manager');

  // 6. Clear Mock Context
  engine.clearMockContext();
  assert.strictEqual(engine.getMockContext(), null);

  db.close();
  console.log('\n🎉 ALL STEP 7 TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runStep7Tests().catch(err => {
  console.error('❌ Step 7 Test Failure:', err);
  process.exit(1);
});
