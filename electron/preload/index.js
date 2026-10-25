const { contextBridge, ipcRenderer } = require('electron');

/**
 * Strict allowlist of IPC channels that the renderer process is permitted to invoke.
 * Protects against unauthorized IPC calls and prevents access to raw Node/Electron primitives.
 */
const ALLOWED_INVOKE_CHANNELS = new Set([
  // Discovery
  'discovery:search',
  'discovery:browse',
  'discovery:get',
  'discovery:credits',
  'discovery:sources',

  // Wallpaper & OS Desktop
  'wallpaper:preview',
  'wallpaper:apply',
  'wallpaper:current',
  'wallpaper:pickLocal',
  'wallpaper:displays',

  // Collections (Sanctum of Memories)
  'collection:create',
  'collection:list',
  'collection:get',
  'collection:rename',
  'collection:delete',
  'collection:addItem',
  'collection:removeItem',
  'collection:reorder',
  'collection:apply',
  'collection:export',
  'collection:import',

  // Rotation & History (Time Stone)
  'rotation:getConfig',
  'rotation:setConfig',
  'rotation:pause',
  'rotation:resume',
  'rotation:now',
  'rotation:history',
  'rotation:clearHistory',

  // Personalization & Rules (Eye of Agamotto)
  'personalization:getState',
  'personalization:setEnabled',
  'rule:list',
  'rule:create',
  'rule:update',
  'rule:delete',
  'rule:reorder',
  'personalization:evaluate',
  'override:set',
  'override:clear',

  // Calendar & Weather
  'calendar:connect',
  'calendar:disconnect',
  'calendar:status',
  'calendar:upcoming',
  'calendar:binding:list',
  'calendar:binding:create',
  'calendar:binding:delete',
  'weather:setLocation',
  'weather:current',

  // Settings & Window
  'settings:get',
  'settings:set',
  'app:minimizeToTray',
  'app:setAutoLaunch',
  'app:openExternal',
  'app:quit'
]);

/**
 * Strict allowlist of main->renderer push event subscriptions
 */
const ALLOWED_EVENTS = new Set([
  'wallpaper:changed',
  'rotation:state',
  'personalization:state',
  'calendar:eventStarted',
  'calendar:eventEnded',
  'network:status',
  'app:error'
]);

// Expose safe, allowlisted, context-isolated API to renderer
contextBridge.exposeInMainWorld('api', {
  /**
   * Generic allowlisted invoke method
   * @param {string} channel
   * @param {any} [payload]
   */
  invoke: (channel, payload) => {
    if (!ALLOWED_INVOKE_CHANNELS.has(channel)) {
      return Promise.reject(new Error(`[Preload Security] Unauthorized IPC channel: ${channel}`));
    }
    return ipcRenderer.invoke(channel, payload);
  },

  /**
   * Safe allowlisted event listener with clean unsubscribe callback
   * @param {string} channel
   * @param {(...args: any[]) => void} callback
   * @returns {() => void} Unsubscribe function
   */
  on: (channel, callback) => {
    if (!ALLOWED_EVENTS.has(channel)) {
      throw new Error(`[Preload Security] Unauthorized IPC event: ${channel}`);
    }
    const subscription = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },

  // Explicit, typed discovery helpers
  discovery: {
    search: (params) => ipcRenderer.invoke('discovery:search', params),
    browse: (params) => ipcRenderer.invoke('discovery:browse', params),
    get: (wallpaperId) => ipcRenderer.invoke('discovery:get', { wallpaperId }),
    credits: (wallpaperId) => ipcRenderer.invoke('discovery:credits', { wallpaperId }),
    sources: () => ipcRenderer.invoke('discovery:sources')
  }
});
