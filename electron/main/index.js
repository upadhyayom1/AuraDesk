const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables for main process
dotenv.config();

const { getDatabase, closeDatabase } = require('./database/db');
const { runMigrations } = require('./database/migrations');
const WallpaperRepository = require('./database/repositories/wallpaperRepo');
const CollectionsRepository = require('./database/repositories/collectionsRepo');
const WallpaperManager = require('./services/wallpaper/WallpaperManager');
const CollectionsService = require('./services/collections/CollectionsService');
const { registerWallpaperHandlers } = require('./ipc/handlers/wallpaperHandler');
const { registerCollectionsHandlers } = require('./ipc/handlers/collectionsHandler');

let mainWindow = null;
let wallpaperManager = null;
let collectionsService = null;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1280, width),
    height: Math.min(840, height),
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#090d16',
    title: 'AuraDesk',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      mainWindow.loadFile(path.join(__dirname, '../../frontend/dist/index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../frontend/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    // 1. Initialize SQLite Database & execute migrations
    const db = getDatabase();
    runMigrations(db);

    // 2. Initialize Repositories
    const wallpaperRepo = new WallpaperRepository(db);
    const collectionsRepo = new CollectionsRepository(db, wallpaperRepo);

    // 3. Initialize Services (Sanctum of Memories & Reality Manifestation)
    wallpaperManager = new WallpaperManager(db, wallpaperRepo);
    await wallpaperManager.init();

    collectionsService = new CollectionsService(db, collectionsRepo, wallpaperRepo, wallpaperManager);

    // 4. Register IPC Handlers
    registerWallpaperHandlers(wallpaperManager, () => mainWindow);
    registerCollectionsHandlers(collectionsService, () => mainWindow);

    console.log('[AuraDesk] Database, Services, and IPC Handlers successfully initialized.');
  } catch (err) {
    console.error('[AuraDesk] Initialization error:', err);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Respect tray behavior: keep alive on Darwin or when tray is active
  if (process.platform !== 'darwin') {
    closeDatabase();
    app.quit();
  }
});

app.on('before-quit', () => {
  closeDatabase();
});

