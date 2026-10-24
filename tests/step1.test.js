/**
 * Step 1 Verification Test
 * Tests migrations and CRUD repositories for:
 * - personalization_rules
 * - calendar_bindings
 * - calendar_events_cache
 * - context_cache
 * - overrides
 */

const assert = require('assert');
const Database = require('better-sqlite3');
const { runMigrations } = require('../electron/main/database/migrations/index');
const PersonalizationRulesRepository = require('../electron/main/database/repositories/personalizationRulesRepo');
const CalendarBindingsRepository = require('../electron/main/database/repositories/calendarBindingsRepo');
const CalendarEventsRepository = require('../electron/main/database/repositories/calendarEventsRepo');
const ContextCacheRepository = require('../electron/main/database/repositories/contextCacheRepo');
const OverridesRepository = require('../electron/main/database/repositories/overridesRepo');

function runTests() {
  console.log('🧪 Starting Step 1 Verification Tests...');

  // Setup in-memory SQLite database
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  // 1. Run migrations
  runMigrations(db);
  console.log('✅ Migrations executed successfully');

  // Verify all 5 tables exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
  const requiredTables = [
    'personalization_rules',
    'calendar_bindings',
    'calendar_events_cache',
    'context_cache',
    'overrides'
  ];

  for (const table of requiredTables) {
    assert(tables.includes(table), `Table ${table} must exist in database`);
  }
  console.log('✅ All 5 tables confirmed in sqlite_master');

  // Create a dummy collection for foreign key references
  db.prepare("INSERT INTO collections (id, name) VALUES ('col-1', 'Default Collection')").run();
  db.prepare("INSERT INTO collections (id, name) VALUES ('col-2', 'Rainy Vault')").run();
  db.prepare("INSERT INTO collections (id, name) VALUES ('col-3', 'Exam Focus')").run();

  // 2. Test PersonalizationRulesRepository
  console.log('Testing PersonalizationRulesRepository...');
  const rulesRepo = new PersonalizationRulesRepository(db);

  const rule1 = rulesRepo.create({
    id: 'rule-rain',
    name: 'Rainy Mood',
    conditionType: 'WEATHER',
    conditionValue: { condition: 'Rain' },
    collectionId: 'col-2',
    priority: 2,
    enabled: true
  });
  assert.strictEqual(rule1.name, 'Rainy Mood');
  assert.strictEqual(rule1.conditionValue.condition, 'Rain');

  const rule2 = rulesRepo.create({
    id: 'rule-night',
    name: 'Night Owl',
    conditionType: 'DAY_PART',
    conditionValue: { part: 'night' },
    collectionId: 'col-1',
    priority: 1,
    enabled: true
  });

  const rule3 = rulesRepo.create({
    id: 'rule-evening',
    name: 'Evening Chill',
    conditionType: 'TIME_RANGE',
    conditionValue: { from: '18:00', to: '22:00' },
    collectionId: 'col-1',
    priority: 3,
    enabled: false
  });

  // Test list & listEnabled (sorted by priority ASC)
  const allRules = rulesRepo.list();
  assert.strictEqual(allRules.length, 3);
  assert.strictEqual(allRules[0].id, 'rule-night'); // priority 1
  assert.strictEqual(allRules[1].id, 'rule-rain');  // priority 2
  assert.strictEqual(allRules[2].id, 'rule-evening'); // priority 3

  const enabledRules = rulesRepo.listEnabled();
  assert.strictEqual(enabledRules.length, 2);

  // Test update
  const updatedRule = rulesRepo.update('rule-rain', { name: 'Heavy Rain Mood', enabled: false });
  assert.strictEqual(updatedRule.name, 'Heavy Rain Mood');
  assert.strictEqual(updatedRule.enabled, false);

  // Test reorder
  const reordered = rulesRepo.reorder(['rule-evening', 'rule-rain', 'rule-night']);
  assert.strictEqual(reordered[0].id, 'rule-evening');
  assert.strictEqual(reordered[0].priority, 1);
  assert.strictEqual(reordered[1].id, 'rule-rain');
  assert.strictEqual(reordered[1].priority, 2);
  assert.strictEqual(reordered[2].id, 'rule-night');
  assert.strictEqual(reordered[2].priority, 3);

  // Test delete
  assert(rulesRepo.delete('rule-evening'));
  assert.strictEqual(rulesRepo.list().length, 2);
  console.log('✅ PersonalizationRulesRepository tests passed');

  // 3. Test CalendarBindingsRepository
  console.log('Testing CalendarBindingsRepository...');
  const bindingsRepo = new CalendarBindingsRepository(db);

  bindingsRepo.create({
    id: 'bind-exam',
    matchType: 'KEYWORD',
    matchValue: 'exam',
    collectionId: 'col-3',
    priority: 1
  });

  bindingsRepo.create({
    id: 'bind-meeting',
    matchType: 'KEYWORD',
    matchValue: 'meeting',
    collectionId: 'col-1',
    priority: 2
  });

  const bindings = bindingsRepo.list();
  assert.strictEqual(bindings.length, 2);
  assert.strictEqual(bindings[0].matchValue, 'exam');

  // Test matchBinding
  const match1 = bindingsRepo.matchBinding('Final Softablitz Exam on Saturday');
  assert.strictEqual(match1, 'col-3');

  const match2 = bindingsRepo.matchBinding({ title: 'Team Meeting with Mentor' });
  assert.strictEqual(match2, 'col-1');

  const matchNone = bindingsRepo.matchBinding('Just relaxing with games');
  assert.strictEqual(matchNone, null);

  assert(bindingsRepo.delete('bind-meeting'));
  assert.strictEqual(bindingsRepo.list().length, 1);
  console.log('✅ CalendarBindingsRepository tests passed');

  // 4. Test CalendarEventsRepository
  console.log('Testing CalendarEventsRepository...');
  const eventsRepo = new CalendarEventsRepository(db);

  const now = new Date();
  const past = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const future1 = new Date(now.getTime() + 1 * 60 * 60 * 1000);
  const future2 = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  eventsRepo.saveEvents([
    {
      id: 'evt-past',
      title: 'Morning Standup',
      startTime: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      endTime: past.toISOString()
    },
    {
      id: 'evt-active',
      title: 'Current Softablitz Sprint',
      startTime: past.toISOString(),
      endTime: future1.toISOString()
    },
    {
      id: 'evt-future',
      title: 'Project Presentation',
      startTime: future1.toISOString(),
      endTime: future2.toISOString()
    }
  ]);

  // Test getActiveEvent
  const active = eventsRepo.getActiveEvent(now);
  assert(active !== null);
  assert.strictEqual(active.id, 'evt-active');
  assert.strictEqual(active.title, 'Current Softablitz Sprint');

  // Test getUpcoming
  const upcoming = eventsRepo.getUpcoming(5, now);
  assert.strictEqual(upcoming.length, 2); // evt-active and evt-future

  // Test clearOldEvents
  const deletedOld = eventsRepo.clearOldEvents(now);
  assert.strictEqual(deletedOld, 1); // evt-past deleted

  console.log('✅ CalendarEventsRepository tests passed');

  // 5. Test ContextCacheRepository
  console.log('Testing ContextCacheRepository...');
  const contextRepo = new ContextCacheRepository(db);

  contextRepo.set('weather', {
    condition: 'Rain',
    tempC: 18.5,
    city: 'Prayagraj',
    isDay: false
  });

  const weatherCache = contextRepo.get('weather');
  assert.strictEqual(weatherCache.condition, 'Rain');
  assert.strictEqual(weatherCache.tempC, 18.5);

  const withTimestamp = contextRepo.getWithTimestamp('weather');
  assert(withTimestamp !== null);
  assert(withTimestamp.fetchedAt !== undefined);

  assert(contextRepo.delete('weather'));
  assert.strictEqual(contextRepo.get('weather'), null);
  console.log('✅ ContextCacheRepository tests passed');

  // 6. Test OverridesRepository
  console.log('Testing OverridesRepository...');
  const overridesRepo = new OverridesRepository(db);

  // Set override
  overridesRepo.set('wallpaper-unsplash-123', null);
  let currentOverride = overridesRepo.get();
  assert(currentOverride !== null);
  assert.strictEqual(currentOverride.wallpaperId, 'wallpaper-unsplash-123');
  assert.strictEqual(currentOverride.expiresAt, null);

  // Test overriding with expiration
  const futureExp = new Date(Date.now() + 60000).toISOString();
  overridesRepo.set('wallpaper-pexels-456', futureExp);
  currentOverride = overridesRepo.get();
  assert.strictEqual(currentOverride.wallpaperId, 'wallpaper-pexels-456');

  // Test expired override cleanup
  const pastExp = new Date(Date.now() - 60000).toISOString();
  overridesRepo.set('wallpaper-old', pastExp);
  const expiredOverride = overridesRepo.get();
  assert.strictEqual(expiredOverride, null);

  // Test clear
  overridesRepo.set('wallpaper-fresh', null);
  assert(overridesRepo.clear());
  assert.strictEqual(overridesRepo.get(), null);
  console.log('✅ OverridesRepository tests passed');

  // 7. Test Cascading Foreign Key Deletions
  console.log('Testing Foreign Key Cascade on collection deletion...');
  db.prepare("DELETE FROM collections WHERE id = 'col-2'").run();
  const rulesAfterColDelete = rulesRepo.list();
  // rule-rain (col-2) should have been cascaded and deleted!
  assert(!rulesAfterColDelete.some(r => r.collectionId === 'col-2'));
  console.log('✅ Foreign Key ON DELETE CASCADE works properly');

  db.close();
  console.log('\n🎉 ALL STEP 1 TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTests();
