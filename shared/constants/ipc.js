// AuraDesk Internal IPC Channels (from Softablitz specification Part 3)
export const IPC_CHANNELS = {
  // Discovery
  DISCOVERY_SEARCH: 'discovery:search',
  DISCOVERY_BROWSE: 'discovery:browse',
  DISCOVERY_GET: 'discovery:get',
  DISCOVERY_CREDITS: 'discovery:credits',
  DISCOVERY_SOURCES: 'discovery:sources',

  // Wallpaper & OS Desktop
  WALLPAPER_PREVIEW: 'wallpaper:preview',
  WALLPAPER_APPLY: 'wallpaper:apply',
  WALLPAPER_CURRENT: 'wallpaper:current',
  WALLPAPER_PICK_LOCAL: 'wallpaper:pickLocal',
  WALLPAPER_DISPLAYS: 'wallpaper:displays',

  // Collections (Sanctum of Memories)
  COLLECTION_CREATE: 'collection:create',
  COLLECTION_LIST: 'collection:list',
  COLLECTION_GET: 'collection:get',
  COLLECTION_RENAME: 'collection:rename',
  COLLECTION_DELETE: 'collection:delete',
  COLLECTION_ADD_ITEM: 'collection:addItem',
  COLLECTION_REMOVE_ITEM: 'collection:removeItem',
  COLLECTION_REORDER: 'collection:reorder',
  COLLECTION_APPLY: 'collection:apply',
  COLLECTION_EXPORT: 'collection:export',
  COLLECTION_IMPORT: 'collection:import',

  // Rotation & History (Time Stone)
  ROTATION_GET_CONFIG: 'rotation:getConfig',
  ROTATION_SET_CONFIG: 'rotation:setConfig',
  ROTATION_PAUSE: 'rotation:pause',
  ROTATION_RESUME: 'rotation:resume',
  ROTATION_NOW: 'rotation:now',
  ROTATION_HISTORY: 'rotation:history',
  ROTATION_CLEAR_HISTORY: 'rotation:clearHistory',

  // Personalization & Rules (Eye of Agamotto)
  PERSONALIZATION_GET_STATE: 'personalization:getState',
  PERSONALIZATION_SET_ENABLED: 'personalization:setEnabled',
  RULE_LIST: 'rule:list',
  RULE_CREATE: 'rule:create',
  RULE_UPDATE: 'rule:update',
  RULE_DELETE: 'rule:delete',
  RULE_REORDER: 'rule:reorder',
  PERSONALIZATION_EVALUATE: 'personalization:evaluate',
  PERSONALIZATION_SET_MOCK_CONTEXT: 'personalization:setMockContext',
  PERSONALIZATION_GET_MOCK_CONTEXT: 'personalization:getMockContext',
  PERSONALIZATION_CLEAR_MOCK_CONTEXT: 'personalization:clearMockContext',
  OVERRIDE_SET: 'override:set',
  OVERRIDE_CLEAR: 'override:clear',

  // Calendar & Weather
  CALENDAR_CONNECT: 'calendar:connect',
  CALENDAR_DISCONNECT: 'calendar:disconnect',
  CALENDAR_STATUS: 'calendar:status',
  CALENDAR_UPCOMING: 'calendar:upcoming',
  CALENDAR_BINDING_LIST: 'calendar:binding:list',
  CALENDAR_BINDING_CREATE: 'calendar:binding:create',
  CALENDAR_BINDING_DELETE: 'calendar:binding:delete',
  WEATHER_SET_LOCATION: 'weather:setLocation',
  WEATHER_CURRENT: 'weather:current',

  // Settings & Window
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  WINDOW_CLOSE: 'window:close',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_TOGGLE_MAXIMIZE: 'window:toggleMaximize',
  WINDOW_IS_MAXIMIZED: 'window:isMaximized',
  APP_MINIMIZE_TO_TRAY: 'app:minimizeToTray',
  APP_SET_AUTO_LAUNCH: 'app:setAutoLaunch',
  APP_OPEN_EXTERNAL: 'app:openExternal',
  APP_QUIT: 'app:quit'
};

export const IPC_EVENTS = {
  WALLPAPER_CHANGED: 'wallpaper:changed',
  ROTATION_STATE: 'rotation:state',
  PERSONALIZATION_STATE: 'personalization:state',
  CALENDAR_EVENT_STARTED: 'calendar:eventStarted',
  CALENDAR_EVENT_ENDED: 'calendar:eventEnded',
  NETWORK_STATUS: 'network:status',
  APP_ERROR: 'app:error'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    IPC_CHANNELS,
    IPC_EVENTS
  };
}
