/**
 * AppSettings Service
 * In-memory cache and persistence orchestrator for application configuration.
 */

const { app } = require('electron');
const { AppSettingsSchema, AppSettingsPatchSchema } = require('../../../../shared/schemas/index');

const DEFAULT_SETTINGS = {
  rotationInterval: 30,
  shuffleEnabled: false,
  autoAdaptEnabled: true,
  location: {},
  launchOnStartup: false,
  sourcesEnabled: {
    unsplash: true,
    pexels: true
  }
};

class AppSettings {
  /**
   * @param {import('../../database/repositories/settingsRepo')} settingsRepo
   */
  constructor(settingsRepo) {
    this.settingsRepo = settingsRepo;
    this.cachedSettings = { ...DEFAULT_SETTINGS };
  }

  /**
   * Loads settings from the database and populates in-memory cache.
   * Unset keys will receive their default values.
   * @returns {Promise<import('../../../../shared/types/index').AppSettingsData>}
   */
  async load() {
    try {
      const persisted = this.settingsRepo.getAll();

      // Deep merge loaded settings over defaults
      this.cachedSettings = {
        rotationInterval: typeof persisted.rotationInterval === 'number' && persisted.rotationInterval >= 1
          ? persisted.rotationInterval
          : DEFAULT_SETTINGS.rotationInterval,
        shuffleEnabled: typeof persisted.shuffleEnabled === 'boolean'
          ? persisted.shuffleEnabled
          : DEFAULT_SETTINGS.shuffleEnabled,
        autoAdaptEnabled: typeof persisted.autoAdaptEnabled === 'boolean'
          ? persisted.autoAdaptEnabled
          : DEFAULT_SETTINGS.autoAdaptEnabled,
        location: {
          ...DEFAULT_SETTINGS.location,
          ...(persisted.location || {})
        },
        launchOnStartup: typeof persisted.launchOnStartup === 'boolean'
          ? persisted.launchOnStartup
          : DEFAULT_SETTINGS.launchOnStartup,
        sourcesEnabled: {
          ...DEFAULT_SETTINGS.sourcesEnabled,
          ...(persisted.sourcesEnabled || {})
        }
      };

      // Sync launchOnStartup with OS if app is ready
      if (app && typeof app.setLoginItemSettings === 'function') {
        try {
          app.setLoginItemSettings({ openAtLogin: this.cachedSettings.launchOnStartup });
        } catch (e) {
          console.warn('[AppSettings] Could not set login item settings on load:', e.message);
        }
      }
    } catch (err) {
      console.error('[AppSettings] Error loading settings from database; using defaults:', err.message);
      this.cachedSettings = { ...DEFAULT_SETTINGS };
    }

    return this.get();
  }

  /**
   * Returns a copy of the current cached settings.
   * @returns {import('../../../../shared/types/index').AppSettingsData}
   */
  get() {
    return JSON.parse(JSON.stringify(this.cachedSettings));
  }

  /**
   * Validates and applies a partial patch to settings, persisting changes to SQLite.
   * @param {Partial<import('../../../../shared/types/index').AppSettingsData>} patch
   * @returns {Promise<import('../../../../shared/types/index').AppSettingsData>}
   */
  async save(patch) {
    // 1. Validate patch schema
    const parsed = AppSettingsPatchSchema.safeParse(patch || {});
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Invalid settings payload';
      throw new Error(`VALIDATION: ${errorMsg}`);
    }

    const validatedPatch = parsed.data;
    const dbUpdates = {};

    // 2. Compute updated settings with safe deep merge on nested objects
    const nextSettings = {
      ...this.cachedSettings
    };

    if (validatedPatch.rotationInterval !== undefined) {
      nextSettings.rotationInterval = validatedPatch.rotationInterval;
      dbUpdates.rotationInterval = validatedPatch.rotationInterval;
    }

    if (validatedPatch.shuffleEnabled !== undefined) {
      nextSettings.shuffleEnabled = validatedPatch.shuffleEnabled;
      dbUpdates.shuffleEnabled = validatedPatch.shuffleEnabled;
    }

    if (validatedPatch.autoAdaptEnabled !== undefined) {
      nextSettings.autoAdaptEnabled = validatedPatch.autoAdaptEnabled;
      dbUpdates.autoAdaptEnabled = validatedPatch.autoAdaptEnabled;
    }

    if (validatedPatch.location !== undefined) {
      nextSettings.location = {
        ...this.cachedSettings.location,
        ...validatedPatch.location
      };
      dbUpdates.location = nextSettings.location;
    }

    if (validatedPatch.launchOnStartup !== undefined) {
      nextSettings.launchOnStartup = validatedPatch.launchOnStartup;
      dbUpdates.launchOnStartup = validatedPatch.launchOnStartup;

      // Sync OS login items
      if (app && typeof app.setLoginItemSettings === 'function') {
        try {
          app.setLoginItemSettings({ openAtLogin: validatedPatch.launchOnStartup });
        } catch (e) {
          console.warn('[AppSettings] Could not set login item settings:', e.message);
        }
      }
    }

    if (validatedPatch.sourcesEnabled !== undefined) {
      nextSettings.sourcesEnabled = {
        ...this.cachedSettings.sourcesEnabled,
        ...validatedPatch.sourcesEnabled
      };
      dbUpdates.sourcesEnabled = nextSettings.sourcesEnabled;
    }

    // 3. Persist to SQLite in a single transaction
    if (Object.keys(dbUpdates).length > 0) {
      this.settingsRepo.setMany(dbUpdates);
    }

    // 4. Update in-memory cache
    this.cachedSettings = nextSettings;

    return this.get();
  }
}

module.exports = AppSettings;
