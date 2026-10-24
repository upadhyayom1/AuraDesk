/**
 * Step 5 Verification Test Suite
 * Tests CalendarService:
 * - PKCE generation (code_verifier and S256 code_challenge)
 * - SafeStorage / AES encrypted token persistence in SQLite settings table
 * - HTTP loopback server redirect and OAuth code capture
 * - Timed vs All-day event normalization (start.dateTime & start.date)
 * - 5-minute event synchronization into calendar_events_cache
 * - Keyword-to-collection binding matches
 * - Disconnect & cache eviction
 */

const assert = require('assert');
const http = require('http');
const Database = require('better-sqlite3');
const { runMigrations } = require('../electron/main/database/migrations/index');
const SettingsRepository = require('../electron/main/database/repositories/settingsRepo');
const CalendarEventsRepository = require('../electron/main/database/repositories/calendarEventsRepo');
const CalendarBindingsRepository = require('../electron/main/database/repositories/calendarBindingsRepo');
const CalendarService = require('../electron/main/services/calendar/CalendarService');

async function runStep5Tests() {
  console.log('🧪 Starting Step 5 Verification Tests (CalendarService)...');

  // Setup SQLite in-memory DB
  const db = new Database(':memory:');
  runMigrations(db);

  const settingsRepo = new SettingsRepository(db);
  const eventsRepo = new CalendarEventsRepository(db);
  const bindingsRepo = new CalendarBindingsRepository(db);

  // Seed sample collection and keyword binding
  db.prepare("INSERT INTO collections (id, name) VALUES ('col-exam', 'Exam Focus')").run();
  db.prepare("INSERT INTO collections (id, name) VALUES ('col-meet', 'Meetings & Work')").run();

  bindingsRepo.create({
    id: 'bind-1',
    matchType: 'KEYWORD',
    matchValue: 'hackathon',
    collectionId: 'col-exam',
    priority: 1
  });

  bindingsRepo.create({
    id: 'bind-2',
    matchType: 'KEYWORD',
    matchValue: 'interview',
    collectionId: 'col-meet',
    priority: 2
  });

  const calendarService = new CalendarService({
    settingsRepo,
    calendarEventsRepo: eventsRepo,
    calendarBindingsRepo: bindingsRepo,
    clientId: 'test-google-client-id.apps.googleusercontent.com',
    clientSecret: 'test-google-client-secret'
  });

  // 1. PKCE Generation
  console.log('Testing PKCE code_verifier and code_challenge generation...');
  const pkce = calendarService.generatePKCE();
  assert(pkce.codeVerifier && pkce.codeVerifier.length >= 43, 'codeVerifier must be >= 43 chars');
  assert(pkce.codeChallenge && pkce.codeChallenge.length >= 43, 'codeChallenge must be >= 43 chars');
  assert(!pkce.codeChallenge.includes('='), 'base64url should not have padding');
  console.log('✅ PKCE generation validated');

  // 2. Encryption and Decryption
  console.log('Testing Token Encryption & Decryption...');
  const sampleToken = 'ya29.a0AfH6SMD_very_secret_oauth_token_123456789';
  const encrypted = calendarService._encrypt(sampleToken);
  assert.notStrictEqual(encrypted, sampleToken, 'Encrypted token must never equal plaintext');
  assert(encrypted.startsWith('safe:') || encrypted.startsWith('aes:'), 'Must use safe or aes encryption prefix');

  const decrypted = calendarService._decrypt(encrypted);
  assert.strictEqual(decrypted, sampleToken, 'Decrypted token must match original token exactly');

  // Verify stored in DB is encrypted
  calendarService._saveTokens({ access_token: sampleToken }, 'testuser@example.com');
  const storedSetting = settingsRepo.get('google_calendar_tokens');
  assert(storedSetting && storedSetting.encryptedTokens);
  assert.strictEqual(storedSetting.account, 'testuser@example.com');
  assert(!JSON.stringify(storedSetting).includes(sampleToken), 'Plaintext token must NEVER appear in SQLite settings');
  console.log('✅ Safe token encryption & SQLite storage validated');

  // 3. HTTP Loopback Server
  console.log('Testing OAuth HTTP Loopback Server on 127.0.0.1...');
  const loopback = await calendarService._startLoopbackServer();
  assert(loopback.port > 0, 'Port must be positive integer');
  assert.strictEqual(loopback.redirectUri, `http://127.0.0.1:${loopback.port}`);

  // Simulate browser sending code back
  http.get(`http://127.0.0.1:${loopback.port}/?code=mock_oauth_auth_code_999`, (res) => {
    assert.strictEqual(res.statusCode, 200);
  });

  const receivedCode = await loopback.waitForCode;
  assert.strictEqual(receivedCode, 'mock_oauth_auth_code_999', 'Loopback server must capture code from redirect');
  loopback.close();
  console.log('✅ OAuth loopback redirect server validated');

  // 4. Event Normalization (Timed & All-day)
  console.log('Testing Event Normalization...');
  const timedRaw = {
    id: 'evt-timed-1',
    summary: 'Softablitz Project Submission',
    start: { dateTime: '2026-10-25T14:00:00+05:30' },
    end: { dateTime: '2026-10-25T16:00:00+05:30' }
  };
  const timedNormalized = calendarService.normalizeEvent(timedRaw);
  assert.strictEqual(timedNormalized.id, 'evt-timed-1');
  assert.strictEqual(timedNormalized.title, 'Softablitz Project Submission');
  assert(timedNormalized.startTime.includes('2026-10-25'));
  assert(timedNormalized.endTime.includes('2026-10-25'));

  const allDayRaw = {
    id: 'evt-allday-2',
    summary: 'Hackathon Demo Day',
    start: { date: '2026-10-26' },
    end: { date: '2026-10-26' }
  };
  const allDayNormalized = calendarService.normalizeEvent(allDayRaw);
  assert.strictEqual(allDayNormalized.id, 'evt-allday-2');
  assert(allDayNormalized.startTime.includes('00:00:00'));
  assert(allDayNormalized.endTime.includes('23:59:59'));
  console.log('✅ Timed and all-day event normalization validated');

  // 5. Sync Upcoming Events & Active Event Matching
  console.log('Testing Sync with Mock Google Calendar Client...');
  const now = new Date();
  const past = new Date(now.getTime() - 10 * 60 * 1000);
  const future = new Date(now.getTime() + 50 * 60 * 1000);

  const mockCalendarClient = {
    events: {
      list: async () => ({
        data: {
          items: [
            {
              id: 'mock-1',
              summary: 'Softablitz Hackathon Final Presentation',
              start: { dateTime: past.toISOString() },
              end: { dateTime: future.toISOString() }
            },
            {
              id: 'mock-2',
              summary: 'Technical Interview Prep',
              start: { dateTime: new Date(now.getTime() + 3600000).toISOString() },
              end: { dateTime: new Date(now.getTime() + 7200000).toISOString() }
            }
          ]
        }
      })
    }
  };

  calendarService.customCalendarClient = mockCalendarClient;
  const syncedEvents = await calendarService.syncUpcomingEvents();
  assert.strictEqual(syncedEvents.length, 2);

  // Active event check
  const activeEvent = calendarService.getActiveEvent(now);
  assert(activeEvent !== null, 'Should detect event happening right now');
  assert.strictEqual(activeEvent.id, 'mock-1');

  // Keyword binding check
  const matchedCollection = calendarService.matchBinding(activeEvent);
  assert.strictEqual(matchedCollection, 'col-exam', 'Hackathon keyword should match col-exam');

  const matchedInterview = calendarService.matchBinding('Google Interview Tomorrow');
  assert.strictEqual(matchedInterview, 'col-meet', 'Interview keyword should match col-meet');

  console.log('✅ Event synchronization, active event detection, and keyword binding validated');

  // 6. Disconnect & Cache Eviction
  console.log('Testing Disconnect & cache eviction...');
  const disconnectResult = await calendarService.disconnect();
  assert.strictEqual(disconnectResult.connected, false);
  assert.strictEqual(settingsRepo.get('google_calendar_tokens'), null, 'Stored tokens must be deleted from DB on disconnect');
  assert.strictEqual(calendarService.getUpcoming().length, 0, 'Cached events must be wiped on disconnect');
  console.log('✅ Disconnect and full token / cache cleanup validated');

  db.close();
  console.log('\n🎉 ALL STEP 5 TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runStep5Tests().catch(err => {
  console.error('❌ Step 5 Test Failure:', err);
  process.exit(1);
});
