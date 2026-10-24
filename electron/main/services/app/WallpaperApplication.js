/**
 * WallpaperApplication
 * Root lifecycle orchestrator for the Electron main process.
 * Manages database initialization, settings loading, service bootstrapping,
 * IPC registration, window lifecycle, system tray keep-alive, and graceful shutdown.
 */

const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

const { getDatabase, closeDatabase } = require('../../database/db');
const { runMigrations } = require('../../database/migrations/index');

const SettingsRepository = require('../../database/repositories/settingsRepo');
const WallpaperRepository = require('../../database/repositories/wallpaperRepo');
const CollectionsRepository = require('../../database/repositories/collectionsRepo');

const AppSettings = require('../settings/AppSettings');
const WallpaperManager = require('../wallpaper/WallpaperManager');
const CollectionsService = require('../collections/CollectionsService');

const SystemTrayController = require('../../tray/SystemTrayController');

const { registerWallpaperHandlers } = require('../../ipc/handlers/wallpaperHandler');
const { registerCollectionsHandlers } = require('../../ipc/handlers/collectionsHandler');
const { registerSettingsHandlers } = require('../../ipc/handlers/settingsHandler');
const { registerAppHandlers } = require('../../ipc/handlers/appHandler');

class WallpaperApplication {
  constructor() {
    this.db = null;
    this.settingsRepo = null;
    this.wallpaperRepo = null;
    this.collectionsRepo = null;

    this.settings = null;
    this.wallpaperManager = null;
    this.collectionsService = null;
    this.scheduler = null; // Will be attached in Rotation milestone

    this.mainWindow = null;
    this.trayController = null;
    this.isRunning = false;
    this.isQuitting = false;
  }

  /**
   * Initializes all databases, services, window, tray, and IPC handlers in deterministic order.
   */
  async start() {
    if (this.isRunning) return;

    try {
      // 1. Initialize database connection and run schema migrations
      this.db = getDatabase();
      runMigrations(this.db);

      // 2. Initialize repositories
      this.settingsRepo = new SettingsRepository(this.db);
      this.wallpaperRepo = new WallpaperRepository(this.db);
      this.collectionsRepo = new CollectionsRepository(this.db, this.wallpaperRepo);

      // 3. Initialize Settings service and load persistent cache
      this.settings = new AppSettings(this.settingsRepo);
      await this.settings.load();

      // 4. Initialize Wallpaper & Collections services
      this.wallpaperManager = new WallpaperManager(this.db, this.wallpaperRepo);
      await this.wallpaperManager.init();

      this.collectionsService = new CollectionsService(
        this.db,
        this.collectionsRepo,
        this.wallpaperRepo,
        this.wallpaperManager
      );

      // 5. Register all IPC channel handlers
      registerWallpaperHandlers(this.wallpaperManager, () => this.mainWindow);
      registerCollectionsHandlers(this.collectionsService, () => this.mainWindow);
      registerSettingsHandlers(this.settings);
      registerAppHandlers(this.settings, () => this.mainWindow, () => this.shutdown());

      // 6. Create Main Window
      this.createMainWindow();

      // 7. Initialize System Tray Controller with keep-alive
      this.trayController = new SystemTrayController({
        getMainWindow: () => this.mainWindow,
        scheduler: this.scheduler,
        appSettings: this.settings,
        onQuit: () => this.shutdown()
      });
      this.trayController.init();

      this.isRunning = true;
      console.log('[WallpaperApplication] Successfully started AuraDesk main application.');
    } catch (err) {
      console.error('[WallpaperApplication] Fatal error during application bootstrap:', err);
      throw err;
    }
  }

  /**
   * Creates the secure Electron BrowserWindow
   */
  createMainWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    this.mainWindow = new BrowserWindow({
      width: Math.min(1280, width),
      height: Math.min(840, height),
      minWidth: 1024,
      minHeight: 700,
      backgroundColor: '#090d16',
      title: 'AuraDesk',
      webPreferences: {
        preload: path.join(__dirname, '../../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:5173').catch(() => {
        this.mainWindow.loadFile(path.join(__dirname, '../../../frontend/dist/index.html'));
      });
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../../../frontend/dist/index.html'));
    }

    // Intercept close button: Hide to tray instead of closing unless quitting
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.minimizeToTray();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  /**
   * Hides the main window while keeping background automation alive
   */
  minimizeToTray() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.hide();
    }
  }

  /**
   * Performs graceful shutdown
   */
  async shutdown() {
    if (this.isQuitting) return;
    this.isQuitting = true;
    this.isRunning = false;

    console.log('[WallpaperApplication] Shutting down AuraDesk gracefully...');

    // 1. Stop scheduler if running
    if (this.scheduler && typeof this.scheduler.stop === 'function') {
      try {
        this.scheduler.stop();
      } catch (e) {
        console.warn('[WallpaperApplication] Error stopping scheduler:', e.message);
      }
    }

    // 2. Destroy System Tray
    if (this.trayController) {
      try {
        this.trayController.destroy();
      } catch (e) {
        console.warn('[WallpaperApplication] Error destroying tray:', e.message);
      }
    }

    // 3. Flush SQLite WAL and close database
    try {
      closeDatabase();
    } catch (e) {
      console.warn('[WallpaperApplication] Error closing database:', e.message);
    }

    // 4. Quit Electron application
    app.quit();
  }
}

module.exports = WallpaperApplication;
