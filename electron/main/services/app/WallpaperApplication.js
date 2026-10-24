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
const RotationConfigRepository = require('../../database/repositories/rotationConfigRepo');
const RotationHistoryRepository = require('../../database/repositories/rotationHistoryRepo');
const PersonalizationRulesRepository = require('../../database/repositories/personalizationRulesRepo');
const CalendarBindingsRepository = require('../../database/repositories/calendarBindingsRepo');
const CalendarEventsRepository = require('../../database/repositories/calendarEventsRepo');
const ContextCacheRepository = require('../../database/repositories/contextCacheRepo');
const OverridesRepository = require('../../database/repositories/overridesRepo');

const AppSettings = require('../settings/AppSettings');
const WallpaperManager = require('../wallpaper/WallpaperManager');
const CollectionsService = require('../collections/CollectionsService');
const RotationScheduler = require('../scheduler/RotationScheduler');
const { WallpaperDiscoveryService } = require('../discovery/index');
const { WeatherService } = require('../weather/index');
const { CalendarService } = require('../calendar/index');
const { PersonalizationEngine } = require('../personalization/index');

const SystemTrayController = require('../../tray/SystemTrayController');

const { registerWallpaperHandlers } = require('../../ipc/handlers/wallpaperHandler');
const { registerCollectionsHandlers } = require('../../ipc/handlers/collectionsHandler');
const { registerSettingsHandlers } = require('../../ipc/handlers/settingsHandler');
const { registerAppHandlers } = require('../../ipc/handlers/appHandler');
const { registerRotationHandlers } = require('../../ipc/handlers/rotationHandler');

class WallpaperApplication {
  constructor() {
    this.db = null;
    this.settingsRepo = null;
    this.wallpaperRepo = null;
    this.collectionsRepo = null;
    this.rotationConfigRepo = null;
    this.rotationHistoryRepo = null;
    this.rulesRepo = null;
    this.calendarBindingsRepo = null;
    this.calendarEventsRepo = null;
    this.contextCacheRepo = null;
    this.overridesRepo = null;

    this.settings = null;
    this.discoveryService = null;
    this.weatherService = null;
    this.calendarService = null;
    this.personalizationEngine = null;
    this.wallpaperManager = null;
    this.collectionsService = null;
    this.scheduler = null;

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
      this.rotationConfigRepo = new RotationConfigRepository(this.db);
      this.rotationHistoryRepo = new RotationHistoryRepository(this.db, this.wallpaperRepo);
      this.rulesRepo = new PersonalizationRulesRepository(this.db);
      this.calendarBindingsRepo = new CalendarBindingsRepository(this.db);
      this.calendarEventsRepo = new CalendarEventsRepository(this.db);
      this.contextCacheRepo = new ContextCacheRepository(this.db);
      this.overridesRepo = new OverridesRepository(this.db);

      // 3. Initialize Settings service and load persistent cache
      this.settings = new AppSettings(this.settingsRepo);
      await this.settings.load();

      // 4. Initialize Wallpaper Discovery Service & Weather Service
      this.discoveryService = new WallpaperDiscoveryService({
        appSettings: this.settings
      });

      this.weatherService = new WeatherService({
        appSettings: this.settings,
        contextCacheRepo: this.contextCacheRepo
      });

      this.calendarService = new CalendarService({
        settingsRepo: this.settingsRepo,
        calendarEventsRepo: this.calendarEventsRepo,
        calendarBindingsRepo: this.calendarBindingsRepo
      });

      // 5. Initialize Wallpaper & Collections services
      this.wallpaperManager = new WallpaperManager(this.db, this.wallpaperRepo);
      await this.wallpaperManager.init();

      this.collectionsService = new CollectionsService(
        this.db,
        this.collectionsRepo,
        this.wallpaperRepo,
        this.wallpaperManager
      );

      // 6. Initialize PersonalizationEngine (Eye of Agamotto)
      this.personalizationEngine = new PersonalizationEngine({
        appSettings: this.settings,
        wallpaperRepo: this.wallpaperRepo,
        overridesRepo: this.overridesRepo,
        rulesRepo: this.rulesRepo,
        calendarService: this.calendarService,
        weatherService: this.weatherService,
        collectionsService: this.collectionsService,
        rotationScheduler: null
      });

      // 7. Initialize RotationScheduler Engine
      this.scheduler = new RotationScheduler({
        rotationConfigRepo: this.rotationConfigRepo,
        rotationHistoryRepo: this.rotationHistoryRepo,
        collectionsRepo: this.collectionsRepo,
        wallpaperManager: this.wallpaperManager,
        personalizationEngine: this.personalizationEngine,
        getMainWindow: () => this.mainWindow
      });
      this.personalizationEngine.rotationScheduler = this.scheduler;
      await this.scheduler.init();

      // 6. Register all IPC channel handlers
      registerWallpaperHandlers(this.wallpaperManager, () => this.mainWindow);
      registerCollectionsHandlers(this.collectionsService, () => this.mainWindow);
      registerSettingsHandlers(this.settings);
      registerAppHandlers(this.settings, () => this.mainWindow, () => this.shutdown());
      registerRotationHandlers(this.scheduler, this.rotationHistoryRepo);

      // 7. Create Main Window
      this.createMainWindow();

      // 8. Initialize System Tray Controller with keep-alive
      this.trayController = new SystemTrayController({
        getMainWindow: () => this.mainWindow,
        scheduler: this.scheduler,
        appSettings: this.settings,
        onQuit: () => this.shutdown()
      });
      this.trayController.init();

      this.isRunning = true;
      console.log('[WallpaperApplication] Successfully started AuraDesk main application with active scheduler.');
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
      width: Math.min(1380, width),
      height: Math.min(880, height),
      minWidth: 1024,
      minHeight: 700,
      backgroundColor: '#090d16',
      title: 'AuraDesk',
      titleBarStyle: 'hidden',
      trafficLightPosition: { x: -100, y: -100 },
      vibrancy: 'under-window',
      visualEffectState: 'active',
      webPreferences: {
        preload: path.join(__dirname, '../../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    if (process.platform === 'darwin') {
      try {
        this.mainWindow.setWindowButtonVisibility?.(false);
      } catch {
        // Ignore if unsupported in current platform build
      }
    }

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
