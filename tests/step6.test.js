/**
 * Step 6 Verification Test Suite
 * Tests PersonalizationEngine:
 * - Rule condition matchers:
 *   - TIME_RANGE with midnight crossing (e.g. 22:00 -> 05:00)
 *   - WEATHER ("Rain", "Clear", case-insensitive)
 *   - DAY_PART ("dawn", "day", "dusk", "night")
 * - 5-Step Priority Evaluation Chain:
 *   1. Manual Override > 2. Calendar Binding > 3. Rules (priority ASC) > 4. Rotation > 5. Fallback
 * - autoAdaptEnabled bypass
 * - Dry-run evaluateRules()
 * - Mock Context switch
 */

const assert = require('assert');
const Database = require('better-sqlite3');
const { runMigrations } = require('../electron/main/database/migrations/index');
const WallpaperRepository = require('../electron/main/database/repositories/wallpaperRepo');
const OverridesRepository = require('../electron/main/database/repositories/overridesRepo');
const PersonalizationRulesRepository = require('../electron/main/database/repositories/personalizationRulesRepo');
const CalendarBindingsRepository = require('../electron/main/database/repositories/calendarBindingsRepo');
const CalendarEventsRepository = require('../electron/main/database/repositories/calendarEventsRepo');
const PersonalizationEngine = require('../electron/main/services/personalization/PersonalizationEngine');

async function runStep6Tests() {
  console.log('🧪 Starting Step 6 Verification Tests (PersonalizationEngine)...');

  // Setup SQLite in-memory DB
  const db = new Database(':memory:');
  runMigrations(db);

  const wallpaperRepo = new WallpaperRepository(db);
  const overridesRepo = new OverridesRepository(db);
  const rulesRepo = new PersonalizationRulesRepository(db);
  const calendarBindingsRepo = new CalendarBindingsRepository(db);
  const calendarEventsRepo = new CalendarEventsRepository(db);

  // Seed Wallpapers
  const wpOverride = wallpaperRepo.upsert({
    id: 'local:wp-override',
    source: 'local',
    title: 'Override Wallpaper',
    imageUrl: 'http://override',
    thumbUrl: 'http://override-thumb',
    photographer: 'Admin',
    creditUrl: 'http://admin',
    width: 1920,
    height: 1080
  });

  const wpCalendar = wallpaperRepo.upsert({
    id: 'unsplash:wp-calendar',
    source: 'unsplash',
    title: 'Focus Calendar Wallpaper',
    imageUrl: 'http://calendar',
    thumbUrl: 'http://calendar-thumb',
    photographer: 'Unsplash User',
    creditUrl: 'http://unsplash.com',
    width: 3840,
    height: 2160
  });

  const wpRain = wallpaperRepo.upsert({
    id: 'pexels:wp-rain',
    source: 'pexels',
    title: 'Rainy Moody Wallpaper',
    imageUrl: 'http://rain',
    thumbUrl: 'http://rain-thumb',
    photographer: 'Pexels User',
    creditUrl: 'http://pexels.com',
    width: 2560,
    height: 1440
  });

  const wpNight = wallpaperRepo.upsert({
    id: 'unsplash:wp-night',
    source: 'unsplash',
    title: 'Night Sky Wallpaper',
    imageUrl: 'http://night',
    thumbUrl: 'http://night-thumb',
    photographer: 'Sky Watcher',
    creditUrl: 'http://unsplash.com',
    width: 3840,
    height: 2160
  });

  const wpRotation = wallpaperRepo.upsert({
    id: 'unsplash:wp-rotation',
    source: 'unsplash',
    title: 'Normal Rotation Wallpaper',
    imageUrl: 'http://rotation',
    thumbUrl: 'http://rotation-thumb',
    photographer: 'Rotation Artist',
    creditUrl: 'http://unsplash.com',
    width: 1920,
    height: 1080
  });

  // Seed Collections
  db.prepare("INSERT INTO collections (id, name) VALUES ('col-exam', 'Exam Focus Vault')").run();
  db.prepare("INSERT INTO collections (id, name) VALUES ('col-rain', 'Rainy Mood Vault')").run();
  db.prepare("INSERT INTO collections (id, name) VALUES ('col-night', 'Night Sanctuary')").run();

  // Mock services
  const mockCollectionsService = {
    pickItem(colId) {
      if (colId === 'col-exam') return wpCalendar;
      if (colId === 'col-rain') return wpRain;
      if (colId === 'col-night') return wpNight;
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

  const mockRotationScheduler = {
    pickNext() {
      return wpRotation;
    }
  };

  const mockAppSettings = {
    cachedSettings: { autoAdaptEnabled: true },
    getSettings() { return this.cachedSettings; }
  };

  const engine = new PersonalizationEngine({
    appSettings: mockAppSettings,
    wallpaperRepo,
    overridesRepo,
    rulesRepo,
    calendarService: mockCalendarService,
    collectionsService: mockCollectionsService,
    rotationScheduler: mockRotationScheduler
  });

  // 1. Test Rule Condition Matchers
  console.log('Testing Condition Matchers (TIME_RANGE, WEATHER, DAY_PART)...');

  // A. TIME_RANGE normal
  const normalTimeRule = {
    conditionType: 'TIME_RANGE',
    conditionValue: { from: '09:00', to: '17:00' }
  };
  const dateNoon = new Date();
  dateNoon.setHours(12, 30, 0, 0);
  assert.strictEqual(engine.matchesCondition(normalTimeRule, { now: dateNoon }), true);

  const dateEvening = new Date();
  dateEvening.setHours(20, 0, 0, 0);
  assert.strictEqual(engine.matchesCondition(normalTimeRule, { now: dateEvening }), false);

  // B. TIME_RANGE crossing midnight (e.g. 22:00 to 05:00)
  const midnightCrossingRule = {
    conditionType: 'TIME_RANGE',
    conditionValue: { from: '22:00', to: '05:00' }
  };
  const dateLateNight = new Date();
  dateLateNight.setHours(23, 30, 0, 0);
  assert.strictEqual(engine.matchesCondition(midnightCrossingRule, { now: dateLateNight }), true);

  const dateEarlyMorning = new Date();
  dateEarlyMorning.setHours(3, 30, 0, 0);
  assert.strictEqual(engine.matchesCondition(midnightCrossingRule, { now: dateEarlyMorning }), true);

  const dateAfternoon = new Date();
  dateAfternoon.setHours(14, 0, 0, 0);
  assert.strictEqual(engine.matchesCondition(midnightCrossingRule, { now: dateAfternoon }), false);

  // C. WEATHER condition
  const weatherRule = {
    conditionType: 'WEATHER',
    conditionValue: { condition: 'Rain' }
  };
  assert.strictEqual(engine.matchesCondition(weatherRule, { weather: { condition: 'Rain' } }), true);
  assert.strictEqual(engine.matchesCondition(weatherRule, { weather: { condition: 'rain' } }), true); // Case-insensitive
  assert.strictEqual(engine.matchesCondition(weatherRule, { weather: { condition: 'Clear' } }), false);

  // D. DAY_PART condition
  const dayPartRule = {
    conditionType: 'DAY_PART',
    conditionValue: { part: 'night' }
  };
  assert.strictEqual(engine.matchesCondition(dayPartRule, { weather: { dayPart: 'night' } }), true);
  assert.strictEqual(engine.matchesCondition(dayPartRule, { weather: { dayPart: 'day' } }), false);
  console.log('✅ Condition matchers validated');

  // Seed rules in DB
  rulesRepo.create({
    id: 'rule-rain',
    name: 'Rain Rule',
    conditionType: 'WEATHER',
    conditionValue: { condition: 'Rain' },
    collectionId: 'col-rain',
    priority: 2,
    enabled: true
  });

  rulesRepo.create({
    id: 'rule-night',
    name: 'Night Rule',
    conditionType: 'DAY_PART',
    conditionValue: { part: 'night' },
    collectionId: 'col-night',
    priority: 1,
    enabled: true
  });

  // Seed calendar binding
  calendarBindingsRepo.create({
    id: 'bind-exam',
    matchType: 'KEYWORD',
    matchValue: 'exam',
    collectionId: 'col-exam',
    priority: 1
  });

  // 2. Priority 1: Manual Override Check
  console.log('Testing Priority 1: Manual Override precedence...');
  overridesRepo.set('local:wp-override');

  let decision = await engine.chooseWallpaper({
    now: new Date().toISOString(),
    weather: { condition: 'Rain', dayPart: 'night' },
    activeEvent: { title: 'Final exam' }
  });
  assert.strictEqual(decision.trigger, 'MANUAL', 'Override must beat Calendar and Rules');
  assert.strictEqual(decision.wallpaper.id, 'local:wp-override');

  // Clear override for next tests
  overridesRepo.clear();

  // 3. Priority 2: Calendar Binding Check
  console.log('Testing Priority 2: Calendar Binding precedence...');
  decision = await engine.chooseWallpaper({
    now: new Date().toISOString(),
    weather: { condition: 'Rain', dayPart: 'night' },
    activeEvent: { title: 'Softablitz Final Exam' }
  });
  assert.strictEqual(decision.trigger, 'CALENDAR', 'Active Calendar event binding must beat Rules and Rotation');
  assert.strictEqual(decision.wallpaper.id, 'unsplash:wp-calendar');

  // 4. Priority 3: Personalization Rules (Sorted priority ASC)
  console.log('Testing Priority 3: Rules priority ASC evaluation...');
  // When both Night (priority 1) and Rain (priority 2) match:
  decision = await engine.chooseWallpaper({
    now: new Date().toISOString(),
    weather: { condition: 'Rain', dayPart: 'night' },
    activeEvent: null
  });
  assert.strictEqual(decision.trigger, 'RULE');
  assert.strictEqual(decision.rule.id, 'rule-night', 'Rule with priority 1 (Night) must win over priority 2 (Rain)');
  assert.strictEqual(decision.wallpaper.id, 'unsplash:wp-night');

  // When only Rain matches:
  decision = await engine.chooseWallpaper({
    now: new Date().toISOString(),
    weather: { condition: 'Rain', dayPart: 'day' },
    activeEvent: null
  });
  assert.strictEqual(decision.trigger, 'RULE');
  assert.strictEqual(decision.rule.id, 'rule-rain');
  assert.strictEqual(decision.wallpaper.id, 'pexels:wp-rain');

  // 5. Priority 4: Scheduled Rotation
  console.log('Testing Priority 4: Rotation fallback when no rules match...');
  decision = await engine.chooseWallpaper({
    now: new Date().toISOString(),
    weather: { condition: 'Clear', dayPart: 'day' },
    activeEvent: null
  });
  assert.strictEqual(decision.trigger, 'ROTATION');
  assert.strictEqual(decision.wallpaper.id, 'unsplash:wp-rotation');

  // 6. autoAdaptEnabled = false check
  console.log('Testing autoAdaptEnabled disabled check...');
  mockAppSettings.cachedSettings.autoAdaptEnabled = false;
  decision = await engine.chooseWallpaper({
    now: new Date().toISOString(),
    weather: { condition: 'Rain', dayPart: 'night' },
    activeEvent: { title: 'Final Exam' }
  });
  assert.strictEqual(decision.trigger, 'ROTATION', 'When autoAdaptEnabled is false, must bypass rules and calendar');
  assert.strictEqual(decision.wallpaper.id, 'unsplash:wp-rotation');
  mockAppSettings.cachedSettings.autoAdaptEnabled = true;

  // 7. Dry-Run evaluateRules()
  console.log('Testing dry-run evaluateRules()...');
  const dryRunMatch = await engine.evaluateRules({
    now: new Date().toISOString(),
    weather: { condition: 'Rain', dayPart: 'day' }
  });
  assert(dryRunMatch !== null);
  assert.strictEqual(dryRunMatch.id, 'rule-rain');

  // 8. Mock Context Switch
  console.log('Testing Mock Context Switch...');
  engine.setMockContext({ weather: 'Rain', dayPart: 'day' });
  const mockContext = await engine.getContext();
  assert.strictEqual(mockContext.weather.condition, 'Rain');
  engine.clearMockContext();
  assert.strictEqual(engine.getMockContext(), null);

  db.close();
  console.log('\n🎉 ALL STEP 6 TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runStep6Tests().catch(err => {
  console.error('❌ Step 6 Test Failure:', err);
  process.exit(1);
});
