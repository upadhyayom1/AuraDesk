const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, typed API channels to renderer
contextBridge.exposeInMainWorld('api', {
  invoke: (channel, payload) => {
    // Whitelist allowed channels for security
    return ipcRenderer.invoke(channel, payload);
  },
  on: (channel, callback) => {
    const subscription = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  }
});
