const { app, BrowserWindow } = require('electron');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables for main process
// 1. In development, load from project root
dotenv.config();

// 2. In packaged production, look in resources directory and user data directory
try {
  if (app && app.isPackaged) {
    const resourcesEnv = path.join(process.resourcesPath, '.env');
    if (fs.existsSync(resourcesEnv)) {
      dotenv.config({ path: resourcesEnv, override: true });
    }
    const userEnv = path.join(app.getPath('userData'), '.env');
    if (fs.existsSync(userEnv)) {
      dotenv.config({ path: userEnv, override: true });
    }
  }
} catch (e) {
  // Ignore in test or headless environments
}

const WallpaperApplication = require('./services/app/WallpaperApplication');

const auraDeskApp = new WallpaperApplication();

app.whenReady().then(async () => {
  try {
    await auraDeskApp.start();
  } catch (err) {
    console.error('[AuraDesk] Critical startup failure:', err);
  }

  app.on('activate', () => {
    if (auraDeskApp.mainWindow) {
      auraDeskApp.mainWindow.show();
      auraDeskApp.mainWindow.focus();
    } else if (BrowserWindow.getAllWindows().length === 0) {
      auraDeskApp.createMainWindow();
    }
  });
});

// Prevent app termination when all windows are closed so system tray and background automation remain active
app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('before-quit', async (e) => {
  if (!auraDeskApp.isQuitting) {
    e.preventDefault();
    await auraDeskApp.shutdown();
  }
});

