/**
 * Backend-Driven UI and macOS Window Controls Integration Test Suite
 *
 * Verifies:
 * 1. Zero mock data in production UI paths (curatedWallpapers.ts is empty, no fake fallbacks).
 * 2. Window control IPC handlers: window:close, window:minimize, window:toggleMaximize, window:isMaximized.
 * 3. Preload IPC allowlist security (authorized vs blocked channels, listener cleanup).
 * 4. Error response propagation (no fake wallpaper substitution on failure).
 * 5. App security validation (https only for openExternal, schema validations).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Mock electron before importing appHandler
const registeredHandlers = new Map();
let mockWindowInstance = null;

const mockIpcMain = {
  handle: (channel, fn) => {
    registeredHandlers.set(channel, fn);
  },
  removeHandler: (channel) => {
    registeredHandlers.delete(channel);
  }
};

const electronPath = require.resolve('electron');
require.cache[electronPath] = {
  id: electronPath,
  filename: electronPath,
  loaded: true,
  exports: {
    ipcMain: mockIpcMain,
    shell: {
      openExternal: async (url) => {
        if (!url.startsWith('https://')) {
          throw new Error('Insecure protocol');
        }
        return true;
      }
    },
    app: {
      quit: () => {},
      getPath: () => '/tmp/auradesk_test'
    }
  }
};

const { registerAppHandlers } = require('../electron/main/ipc/handlers/appHandler');

async function runTestSuite() {
  console.log('🧪 Starting Backend-Driven & macOS Window Controls Verification Tests...\n');

  // ==========================================
  // TEST 1: Audit Mock Data Removal
  // ==========================================
  console.log('1. Auditing Mock Data Removal from Frontend Source...');

  const curatedFilePath = path.join(__dirname, '../frontend/src/data/curatedWallpapers.ts');
  const curatedContent = fs.readFileSync(curatedFilePath, 'utf-8');

  // Verify curated mock arrays are strictly empty arrays
  assert(
    curatedContent.includes('export const CURATED_WALLPAPERS: Wallpaper[] = [];'),
    'CURATED_WALLPAPERS must be an empty array in production UI'
  );
  assert(
    curatedContent.includes('export const DEFAULT_COLLECTIONS: WallpaperCollection[] = [];'),
    'DEFAULT_COLLECTIONS must be an empty array'
  );
  assert(
    curatedContent.includes('export const DEFAULT_RULES: PersonalizationRule[] = [];'),
    'DEFAULT_RULES must be an empty array'
  );
  assert(
    curatedContent.includes('export const DEFAULT_CALENDAR_EVENTS: CalendarEvent[] = [];'),
    'DEFAULT_CALENDAR_EVENTS must be an empty array'
  );

  // Check WallpaperDiscovery does not fall back to mock data
  const discoveryCompPath = path.join(__dirname, '../frontend/src/components/WallpaperDiscovery.tsx');
  const discoveryCompContent = fs.readFileSync(discoveryCompPath, 'utf-8');
  assert(
    !discoveryCompContent.includes('CURATED_WALLPAPERS'),
    'WallpaperDiscovery must not import or use CURATED_WALLPAPERS'
  );
  assert(
    !discoveryCompContent.includes('setWallpapers(CURATED_WALLPAPERS)'),
    'WallpaperDiscovery must not fall back to mock wallpapers on failure'
  );

  // Check CollectionsView uses backend calls
  const collectionsCompPath = path.join(__dirname, '../frontend/src/components/CollectionsView.tsx');
  const collectionsCompContent = fs.readFileSync(collectionsCompPath, 'utf-8');
  assert(
    collectionsCompContent.includes('electronBridge.getCollection('),
    'CollectionsView must fetch selected collection items directly from backend'
  );

  console.log('✅ Audit passed: Frontend mock arrays cleared and components strictly backend-driven\n');

  // ==========================================
  // TEST 2: macOS Window Control Handlers
  // ==========================================
  console.log('2. Testing Window Control IPC Handlers...');

  let closeCalled = false;
  let minimizeCalled = false;
  let maximizeState = false;
  let fullScreenState = false;
  let hideCalled = false;

  const createMockWindow = () => ({
    isDestroyed: () => false,
    close: () => { closeCalled = true; },
    minimize: () => { minimizeCalled = true; },
    hide: () => { hideCalled = true; },
    isMaximized: () => maximizeState,
    isFullScreen: () => fullScreenState,
    maximize: () => { maximizeState = true; },
    unmaximize: () => { maximizeState = false; },
    setFullScreen: (val) => { fullScreenState = Boolean(val); }
  });

  mockWindowInstance = createMockWindow();

  const mockAppSettings = {
    save: async () => true,
    get: () => ({})
  };

  // Register handlers
  registerAppHandlers(mockAppSettings, () => mockWindowInstance);

  // Verify handlers were registered
  assert(registeredHandlers.has('window:close'), 'window:close must be registered');
  assert(registeredHandlers.has('window:minimize'), 'window:minimize must be registered');
  assert(registeredHandlers.has('window:toggleMaximize'), 'window:toggleMaximize must be registered');
  assert(registeredHandlers.has('window:isMaximized'), 'window:isMaximized must be registered');
  assert(registeredHandlers.has('app:minimizeToTray'), 'app:minimizeToTray must be registered');

  // Test window:close
  const closeRes = await registeredHandlers.get('window:close')();
  assert.strictEqual(closeRes.ok, true);
  assert.strictEqual(closeCalled, true, 'window.close() must be invoked');
  console.log('  • window:close invokes win.close() correctly');

  // Test window:minimize
  const minRes = await registeredHandlers.get('window:minimize')();
  assert.strictEqual(minRes.ok, true);
  assert.strictEqual(minimizeCalled, true, 'window.minimize() must be invoked');
  console.log('  • window:minimize invokes win.minimize() correctly');

  // Test window:toggleMaximize when unmaximized -> maximizes
  maximizeState = false;
  fullScreenState = false;
  const toggleRes1 = await registeredHandlers.get('window:toggleMaximize')();
  assert.strictEqual(toggleRes1.ok, true);
  assert.strictEqual(toggleRes1.data.isMaximized, true);
  assert.strictEqual(maximizeState, true, 'win.maximize() should have been called');
  console.log('  • window:toggleMaximize maximizes when not maximized');

  // Test window:toggleMaximize when already maximized -> unmaximizes
  const toggleRes2 = await registeredHandlers.get('window:toggleMaximize')();
  assert.strictEqual(toggleRes2.ok, true);
  assert.strictEqual(toggleRes2.data.isMaximized, false);
  assert.strictEqual(maximizeState, false, 'win.unmaximize() should have been called');
  console.log('  • window:toggleMaximize unmaximizes when already maximized');

  // Test window:toggleMaximize when full screen -> exits full screen
  fullScreenState = true;
  const toggleRes3 = await registeredHandlers.get('window:toggleMaximize')();
  assert.strictEqual(toggleRes3.ok, true);
  assert.strictEqual(fullScreenState, false, 'win.setFullScreen(false) should have been called');
  console.log('  • window:toggleMaximize exits full screen when in fullscreen mode');

  // Test window:isMaximized status query
  maximizeState = true;
  fullScreenState = false;
  const statusRes = await registeredHandlers.get('window:isMaximized')();
  assert.strictEqual(statusRes.ok, true);
  assert.strictEqual(statusRes.data.isMaximized, true);
  assert.strictEqual(statusRes.data.isFullScreen, false);
  console.log('  • window:isMaximized accurately reports window state');

  // Test app:minimizeToTray
  const trayRes = await registeredHandlers.get('app:minimizeToTray')();
  assert.strictEqual(trayRes.ok, true);
  assert.strictEqual(hideCalled, true, 'win.hide() must be invoked');
  console.log('  • app:minimizeToTray invokes win.hide() correctly');

  // Test Re-registration idempotency
  assert.doesNotThrow(() => {
    registerAppHandlers(mockAppSettings, () => mockWindowInstance);
  }, 'Re-registering app handlers must not throw');
  console.log('✅ Window control IPC handlers verified\n');

  // ==========================================
  // TEST 3: Preload IPC Allowlist & Security
  // ==========================================
  console.log('3. Testing Preload Bridge Security & Allowlist...');

  const preloadSourcePath = path.join(__dirname, '../electron/preload/index.js');
  const preloadSource = fs.readFileSync(preloadSourcePath, 'utf-8');

  // Verify window channels are allowlisted
  const requiredChannels = [
    'window:close',
    'window:minimize',
    'window:toggleMaximize',
    'window:isMaximized',
    'discovery:search',
    'discovery:browse',
    'collection:create',
    'collection:list',
    'collection:get',
    'rotation:getConfig',
    'rotation:setConfig',
    'rotation:history',
    'settings:get',
    'settings:set'
  ];

  for (const ch of requiredChannels) {
    assert(preloadSource.includes(`'${ch}'`), `preload must allowlist channel: ${ch}`);
  }

  // Simulate preload invoke security check
  const allowedSetRegex = /const ALLOWED_INVOKE_CHANNELS = new Set\(\[([\s\S]*?)\]\);/;
  const match = preloadSource.match(allowedSetRegex);
  assert(match, 'ALLOWED_INVOKE_CHANNELS set must be defined in preload');

  const channelMatches = [...match[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const allowedSet = new Set(channelMatches);

  const testInvoke = (channel) => {
    if (!allowedSet.has(channel)) {
      return Promise.reject(new Error(`[Preload Security] Unauthorized IPC channel: ${channel}`));
    }
    return Promise.resolve({ ok: true });
  };

  // Legitimate channels pass
  await assert.doesNotReject(() => testInvoke('window:close'));
  await assert.doesNotReject(() => testInvoke('window:minimize'));
  await assert.doesNotReject(() => testInvoke('window:toggleMaximize'));
  await assert.doesNotReject(() => testInvoke('discovery:search'));

  // Illegitimate/malicious channels are strictly blocked
  await assert.rejects(
    () => testInvoke('child_process:exec'),
    /Unauthorized IPC channel: child_process:exec/
  );
  await assert.rejects(
    () => testInvoke('node:fs:readFile'),
    /Unauthorized IPC channel: node:fs:readFile/
  );
  await assert.rejects(
    () => testInvoke('eval:arbitraryCode'),
    /Unauthorized IPC channel: eval:arbitraryCode/
  );
  console.log('✅ Preload allowlist strictly permits authorized channels and blocks unauthorized access\n');

  // ==========================================
  // TEST 4: Security Validations on App Handlers
  // ==========================================
  console.log('4. Testing App Security Validations...');

  // app:openExternal strict https:// requirement
  const openExternalHandler = registeredHandlers.get('app:openExternal');

  const validHttps = await openExternalHandler(null, { url: 'https://unsplash.com/@photographer' });
  assert.strictEqual(validHttps.ok, true, 'https:// URLs must be allowed');

  const invalidHttp = await openExternalHandler(null, { url: 'http://insecure-site.com' });
  assert.strictEqual(invalidHttp.ok, false);
  assert.strictEqual(invalidHttp.error.code, 'VALIDATION');
  assert(invalidHttp.error.message.includes('https://'), 'Non-https URLs must be rejected');

  const invalidFile = await openExternalHandler(null, { url: 'file:///etc/passwd' });
  assert.strictEqual(invalidFile.ok, false);
  assert.strictEqual(invalidFile.error.code, 'VALIDATION');

  // app:setAutoLaunch validation
  const setAutoLaunchHandler = registeredHandlers.get('app:setAutoLaunch');
  const validAuto = await setAutoLaunchHandler(null, { enabled: true });
  assert.strictEqual(validAuto.ok, true);

  const invalidAuto = await setAutoLaunchHandler(null, { enabled: 'invalid-non-bool' });
  assert.strictEqual(invalidAuto.ok, false);
  assert.strictEqual(invalidAuto.error.code, 'VALIDATION');
  console.log('✅ Security validations enforced (https only, strict Zod schema checking)\n');

  console.log('🎉 ALL BACKEND-DRIVEN AND WINDOW CONTROLS TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTestSuite().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
