const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Set up mock electron environment before importing handlers
const handlers = new Map();
const mockIpcMain = {
  handle: (channel, handler) => {
    handlers.set(channel, handler);
  },
  removeHandler: (channel) => {
    handlers.delete(channel);
  }
};

require.cache[require.resolve('electron')] = {
  exports: {
    ipcMain: mockIpcMain
  }
};

const { registerDiscoveryHandlers } = require('../electron/main/ipc/handlers/discoveryHandler');
const { registerPersonalizationHandlers } = require('../electron/main/ipc/handlers/personalizationHandler');
const { registerCalendarWeatherHandlers } = require('../electron/main/ipc/handlers/calendarWeatherHandler');

async function invoke(channel, payload) {
  const handler = handlers.get(channel);
  if (!handler) {
    throw new Error(`Handler not registered for channel: ${channel}`);
  }
  return await handler({ sender: {} }, payload);
}

async function runStep8Tests() {
  console.log('--- Step 8: IPC Handlers Registration & Zod Validation Tests ---');

  // ========================================================
  // 1. Mock Services
  // ========================================================
  const mockDiscoveryService = {
    search: async (query, opts) => [{ id: 'unsplash:123', provider: 'unsplash', title: query }],
    browse: async (opts) => [{ id: 'pexels:456', provider: 'pexels' }],
    fetchWallpaper: async (id) => (id === 'found' ? { id: 'found', url: 'https://img.com/found.jpg' } : null),
    getCredits: async (id) => ({ photographer: 'John Doe', sourceUrl: 'https://unsplash.com' }),
    getSources: () => [
      { name: 'unsplash', enabled: true, ok: true },
      { name: 'pexels', enabled: true, ok: true }
    ]
  };

  const mockRules = [];
  let overrideState = null;
  let mockContextState = null;

  const mockPersonalizationEngine = {
    getContext: async () => ({
      time: '14:30',
      dayPart: 'day',
      weather: { condition: 'Clear', tempC: 22, isDay: true },
      activeEvent: null
    }),
    evaluateRules: async (ctx) => (mockRules.length > 0 ? mockRules[0] : null),
    getOverride: () => overrideState,
    setOverride: (id, exp) => {
      overrideState = { wallpaperId: id, expiresAt: exp };
      return overrideState;
    },
    clearOverride: () => {
      overrideState = null;
      return true;
    },
    listRules: () => [...mockRules],
    createRule: (rule) => {
      const created = { id: 'rule-' + (mockRules.length + 1), ...rule };
      mockRules.push(created);
      return created;
    },
    updateRule: (id, patch) => {
      const rule = mockRules.find(r => r.id === id);
      if (!rule) return null;
      Object.assign(rule, patch);
      return rule;
    },
    deleteRule: (id) => {
      const idx = mockRules.findIndex(r => r.id === id);
      if (idx === -1) return false;
      mockRules.splice(idx, 1);
      return true;
    },
    reorderRules: (ids) => {
      return ids.map((id, index) => {
        const rule = mockRules.find(r => r.id === id);
        if (rule) rule.priority = index + 1;
        return rule;
      }).filter(Boolean);
    },
    chooseWallpaper: async (ctx) => ({
      wallpaper: { id: 'w-1', title: 'Wallpaper 1' },
      trigger: 'RULE',
      collectionId: 'c-1'
    }),
    setMockContext: (ctx) => { mockContextState = ctx; },
    getMockContext: () => mockContextState,
    clearMockContext: () => { mockContextState = null; }
  };

  const mockAppSettings = {
    cachedSettings: { autoAdaptEnabled: true },
    getSettings: () => mockAppSettings.cachedSettings,
    save: async (patch) => { Object.assign(mockAppSettings.cachedSettings, patch); }
  };

  const mockCalendarBindings = [];
  const mockCalendarService = {
    connect: async () => ({ account: 'user@example.com' }),
    disconnect: async () => ({ disconnected: true }),
    getStatus: () => ({ connected: true, account: 'user@example.com', lastSyncAt: new Date().toISOString() }),
    getUpcoming: (hours) => [{ id: 'evt-1', title: 'Softablitz Evaluation', hours }],
    listBindings: () => [...mockCalendarBindings],
    createBinding: (binding) => {
      const created = { id: 'cb-' + (mockCalendarBindings.length + 1), ...binding };
      mockCalendarBindings.push(created);
      return created;
    },
    deleteBinding: (id) => {
      const idx = mockCalendarBindings.findIndex(b => b.id === id);
      if (idx === -1) return false;
      mockCalendarBindings.splice(idx, 1);
      return true;
    }
  };

  const mockWeatherService = {
    setLocation: async (loc) => ({ condition: 'Rain', tempC: 18, city: loc.city || 'Custom' }),
    getCurrentWeather: async () => ({ condition: 'Rain', tempC: 18, isFallback: false })
  };

  // Register all handlers
  registerDiscoveryHandlers(mockDiscoveryService);
  registerPersonalizationHandlers(mockPersonalizationEngine, mockAppSettings, null);
  registerCalendarWeatherHandlers(mockCalendarService, mockWeatherService);

  // ========================================================
  // 2. Test Discovery Handlers
  // ========================================================
  console.log('Testing Discovery Handlers & Schemas...');

  // 2.1 discovery:search validation failure on empty query
  const resSearchFail = await invoke('discovery:search', { query: '' });
  assert.strictEqual(resSearchFail.ok, false, 'discovery:search should fail validation with empty query');
  assert.strictEqual(resSearchFail.error.code, 'VALIDATION');

  // 2.2 discovery:search success
  const resSearchOk = await invoke('discovery:search', { query: 'nature', perPage: 10 });
  assert.strictEqual(resSearchOk.ok, true);
  assert.strictEqual(resSearchOk.data[0].id, 'unsplash:123');

  // 2.3 discovery:browse validation failure on invalid perPage (>50)
  const resBrowseFail = await invoke('discovery:browse', { perPage: 100 });
  assert.strictEqual(resBrowseFail.ok, false, 'discovery:browse should fail validation with perPage > 50');

  // 2.4 discovery:browse success
  const resBrowseOk = await invoke('discovery:browse', { page: 1, perPage: 20 });
  assert.strictEqual(resBrowseOk.ok, true);
  assert.strictEqual(resBrowseOk.data[0].id, 'pexels:456');

  // 2.5 discovery:get validation failure
  const resGetFail = await invoke('discovery:get', {});
  assert.strictEqual(resGetFail.ok, false);
  assert.strictEqual(resGetFail.error.code, 'VALIDATION');

  // 2.6 discovery:get found and not found
  const resGetNotFound = await invoke('discovery:get', { wallpaperId: 'nonexistent' });
  assert.strictEqual(resGetNotFound.ok, false);
  assert.strictEqual(resGetNotFound.error.code, 'NOT_FOUND');

  const resGetOk = await invoke('discovery:get', { wallpaperId: 'found' });
  assert.strictEqual(resGetOk.ok, true);
  assert.strictEqual(resGetOk.data.id, 'found');

  // 2.7 discovery:credits & sources
  const resCredits = await invoke('discovery:credits', { wallpaperId: 'found' });
  assert.strictEqual(resCredits.ok, true);
  assert.strictEqual(resCredits.data.photographer, 'John Doe');

  const resSources = await invoke('discovery:sources');
  assert.strictEqual(resSources.ok, true);
  assert.strictEqual(resSources.data[0].name, 'unsplash');
  assert.strictEqual(resSources.data[0].enabled, true);

  // ========================================================
  // 3. Test Personalization Handlers
  // ========================================================
  console.log('Testing Personalization & Rule Handlers & Schemas...');

  // 3.1 personalization:getState
  const resState = await invoke('personalization:getState');
  assert.strictEqual(resState.ok, true);
  assert.strictEqual(resState.data.enabled, true);
  assert.strictEqual(resState.data.context.dayPart, 'day');

  // 3.2 personalization:setEnabled
  const resSetEnabled = await invoke('personalization:setEnabled', { enabled: false });
  assert.strictEqual(resSetEnabled.ok, true);
  assert.strictEqual(resSetEnabled.data.enabled, false);
  assert.strictEqual(mockAppSettings.cachedSettings.autoAdaptEnabled, false);

  // 3.3 rule:create with invalid conditionType fails validation
  const resRuleFail = await invoke('rule:create', {
    name: 'Invalid Rule',
    conditionType: 'INVALID_TYPE',
    conditionValue: 'xyz',
    collectionId: 'c1'
  });
  assert.strictEqual(resRuleFail.ok, false);
  assert.strictEqual(resRuleFail.error.code, 'VALIDATION');

  // 3.4 rule:create success
  const resRuleCreate = await invoke('rule:create', {
    name: 'Rainy Mood',
    conditionType: 'WEATHER',
    conditionValue: 'Rain',
    collectionId: 'col-rain'
  });
  assert.strictEqual(resRuleCreate.ok, true);
  assert.strictEqual(resRuleCreate.data.name, 'Rainy Mood');

  // 3.5 rule:list
  const resRuleList = await invoke('rule:list');
  assert.strictEqual(resRuleList.ok, true);
  assert.strictEqual(resRuleList.data.length, 1);

  // 3.6 rule:update
  const resRuleUpdate = await invoke('rule:update', {
    id: resRuleCreate.data.id,
    patch: { name: 'Heavy Rain Mood' }
  });
  assert.strictEqual(resRuleUpdate.ok, true);
  assert.strictEqual(resRuleUpdate.data.name, 'Heavy Rain Mood');

  // 3.7 rule:reorder
  const rule2 = await invoke('rule:create', {
    name: 'Night Vibe',
    conditionType: 'DAY_PART',
    conditionValue: 'night',
    collectionId: 'col-night'
  });
  const resReorder = await invoke('rule:reorder', { ruleIds: [rule2.data.id, resRuleCreate.data.id] });
  assert.strictEqual(resReorder.ok, true);
  assert.strictEqual(resReorder.data[0].id, rule2.data.id);
  assert.strictEqual(resReorder.data[0].priority, 1);

  // 3.8 personalization:evaluate (dry run)
  const resEval = await invoke('personalization:evaluate', {});
  assert.strictEqual(resEval.ok, true);
  assert.ok(resEval.data.wallpaper);

  // 3.9 override:set & override:clear
  const resOverrideFail = await invoke('override:set', {});
  assert.strictEqual(resOverrideFail.ok, false);
  assert.strictEqual(resOverrideFail.error.code, 'VALIDATION');

  const resOverrideSet = await invoke('override:set', { wallpaperId: 'wall-override-1' });
  assert.strictEqual(resOverrideSet.ok, true);
  assert.strictEqual(resOverrideSet.data.override.wallpaperId, 'wall-override-1');

  const resOverrideClear = await invoke('override:clear');
  assert.strictEqual(resOverrideClear.ok, true);
  assert.strictEqual(mockPersonalizationEngine.getOverride(), null);

  // 3.10 Mock Context IPC channels
  const resSetMock = await invoke('personalization:setMockContext', { weather: 'Snow' });
  assert.strictEqual(resSetMock.ok, true);
  assert.strictEqual(resSetMock.data.mockContext.weather, 'Snow');

  const resGetMock = await invoke('personalization:getMockContext');
  assert.strictEqual(resGetMock.ok, true);
  assert.strictEqual(resGetMock.data.mockContext.weather, 'Snow');

  const resClearMock = await invoke('personalization:clearMockContext');
  assert.strictEqual(resClearMock.ok, true);
  assert.strictEqual(mockPersonalizationEngine.getMockContext(), null);

  // ========================================================
  // 4. Test Calendar & Weather Handlers
  // ========================================================
  console.log('Testing Calendar & Weather Handlers & Schemas...');

  // 4.1 calendar:status & connect & disconnect
  const resCalStatus = await invoke('calendar:status');
  assert.strictEqual(resCalStatus.ok, true);
  assert.strictEqual(resCalStatus.data.connected, true);

  const resCalConn = await invoke('calendar:connect');
  assert.strictEqual(resCalConn.ok, true);

  const resCalDisc = await invoke('calendar:disconnect');
  assert.strictEqual(resCalDisc.ok, true);

  // 4.2 calendar:upcoming
  const resCalUpcoming = await invoke('calendar:upcoming', { hours: 48 });
  assert.strictEqual(resCalUpcoming.ok, true);
  assert.strictEqual(resCalUpcoming.data[0].hours, 48);

  // 4.3 calendar:binding:create & list & delete
  const resBindFail = await invoke('calendar:binding:create', { matchType: 'INVALID' });
  assert.strictEqual(resBindFail.ok, false);
  assert.strictEqual(resBindFail.error.code, 'VALIDATION');

  const resBindCreate = await invoke('calendar:binding:create', {
    matchType: 'KEYWORD',
    matchValue: 'Exam',
    collectionId: 'col-focus'
  });
  assert.strictEqual(resBindCreate.ok, true);
  assert.strictEqual(resBindCreate.data.matchValue, 'Exam');

  const resBindList = await invoke('calendar:binding:list');
  assert.strictEqual(resBindList.ok, true);
  assert.strictEqual(resBindList.data.length, 1);

  const resBindDelete = await invoke('calendar:binding:delete', { id: resBindCreate.data.id });
  assert.strictEqual(resBindDelete.ok, true);

  // 4.4 weather:setLocation validation
  const resWeatherLocFail = await invoke('weather:setLocation', { invalidField: 123 });
  assert.strictEqual(resWeatherLocFail.ok, false);
  assert.strictEqual(resWeatherLocFail.error.code, 'VALIDATION');

  const resWeatherLocCity = await invoke('weather:setLocation', { city: 'Tokyo' });
  assert.strictEqual(resWeatherLocCity.ok, true);
  assert.strictEqual(resWeatherLocCity.data.city, 'Tokyo');

  // 4.5 weather:current
  const resWeatherCurrent = await invoke('weather:current');
  assert.strictEqual(resWeatherCurrent.ok, true);
  assert.strictEqual(resWeatherCurrent.data.condition, 'Rain');

  console.log('✅ ALL STEP 8 TESTS PASSED SUCCESSFULLY!');
}

runStep8Tests().catch(err => {
  console.error('❌ Step 8 tests failed:', err);
  process.exit(1);
});
