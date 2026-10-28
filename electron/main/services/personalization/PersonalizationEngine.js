/**
 * PersonalizationEngine (Eye of Agamotto)
 * Evaluates contextual environmental state and user rules to select the active desktop wallpaper.
 *
 * Priority Evaluation Chain:
 * 1. Manual Override (survives restart, highest priority)
 * 2. Calendar Binding (active event keyword / id match)
 * 3. Personalization Rules (TIME_RANGE with midnight crossing, WEATHER, DAY_PART ordered by priority ASC)
 * 4. Scheduled Rotation (active collection cycle / shuffle)
 * 5. Fallback (safe default wallpaper)
 */

class PersonalizationEngine {
  /**
   * @param {Object} options
   * @param {import('../settings/AppSettings')} [options.appSettings]
   * @param {import('../../database/repositories/wallpaperRepo')} options.wallpaperRepo
   * @param {import('../../database/repositories/overridesRepo')} options.overridesRepo
   * @param {import('../../database/repositories/personalizationRulesRepo')} options.rulesRepo
   * @param {import('../calendar/CalendarService')} [options.calendarService]
   * @param {import('../weather/WeatherService')} [options.weatherService]
   * @param {import('../collections/CollectionsService')} [options.collectionsService]
   * @param {import('../scheduler/RotationScheduler')} [options.rotationScheduler]
   */
  constructor({
    appSettings = null,
    wallpaperRepo,
    overridesRepo,
    rulesRepo,
    calendarService = null,
    weatherService = null,
    collectionsService = null,
    rotationScheduler = null
  }) {
    this.appSettings = appSettings;
    this.wallpaperRepo = wallpaperRepo;
    this.overridesRepo = overridesRepo;
    this.rulesRepo = rulesRepo;
    this.calendarService = calendarService;
    this.weatherService = weatherService;
    this.collectionsService = collectionsService;
    this.rotationScheduler = rotationScheduler;

    // Mock Context for Demo Day evaluation
    this.mockContext = null;
  }

  /**
   * Sets mock environmental state (for testing, demoing, and live judges evaluation)
   * @param {{ weather?: string, tempC?: number, isDay?: boolean, dayPart?: string, activeEvent?: Object, now?: string } | null} mock
   */
  setMockContext(mock) {
    this.mockContext = mock ? { ...mock } : null;
  }

  /**
   * Gets current mock context
   * @returns {Object|null}
   */
  getMockContext() {
    return this.mockContext;
  }

  /**
   * Clears mock context
   */
  clearMockContext() {
    this.mockContext = null;
  }

  /**
   * Convenience toggle for mock weather (e.g. 'Rain', 'Clear', 'Snow')
   * @param {string} weatherCondition
   * @param {Object} [extraOptions={}]
   * @returns {Object|null} current mock context
   */
  toggleMockWeather(weatherCondition, extraOptions = {}) {
    if (this.mockContext?.weather?.toLowerCase() === weatherCondition.toLowerCase()) {
      delete this.mockContext.weather;
      delete this.mockContext.tempC;
      if (!this.mockContext.activeEvent && !this.mockContext.now) {
        this.mockContext = null;
      }
    } else {
      this.mockContext = {
        ...(this.mockContext || {}),
        weather: weatherCondition,
        ...extraOptions
      };
    }
    return this.mockContext;
  }

  /**
   * Convenience toggle for mock calendar event (e.g. 'Team Product Review')
   * @param {string|Object} eventOrSummary
   * @returns {Object|null} current mock context
   */
  toggleMockCalendarEvent(eventOrSummary) {
    const summary = typeof eventOrSummary === 'string'
      ? eventOrSummary
      : (eventOrSummary?.summary || eventOrSummary?.title || 'Mock Event');

    if (this.mockContext?.activeEvent?.title?.toLowerCase() === summary.toLowerCase()) {
      delete this.mockContext.activeEvent;
      if (!this.mockContext.weather && !this.mockContext.now) {
        this.mockContext = null;
      }
    } else {
      const activeEvent = typeof eventOrSummary === 'object' && eventOrSummary.id
        ? eventOrSummary
        : {
            id: 'mock-event-id',
            title: summary,
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString()
          };

      this.mockContext = {
        ...(this.mockContext || {}),
        activeEvent
      };
    }
    return this.mockContext;
  }

  /**
   * Convenience toggle for mock time (e.g. '23:30', '03:00')
   * @param {string} timeHHMM
   * @param {'dawn'|'day'|'dusk'|'night'} [dayPart]
   */
  setMockTime(timeHHMM, dayPart = null) {
    const [hours, minutes] = timeHHMM.split(':').map(Number);
    const mockDate = new Date();
    mockDate.setHours(hours, minutes, 0, 0);

    const isDay = hours >= 6 && hours < 18;
    this.mockContext = {
      ...(this.mockContext || {}),
      now: mockDate.toISOString(),
      isDay,
      dayPart: dayPart || (isDay ? 'day' : 'night')
    };
    return this.mockContext;
  }

  /**
   * Evaluates rules against mock context and optionally applies wallpaper immediately.
   * Perfect for live demo day presentation!
   * @param {import('../wallpaper/WallpaperManager')} [wallpaperManager]
   * @returns {Promise<{ decision: Object, applied: boolean }>}
   */
  async evaluateAndApplyMock(wallpaperManager = null) {
    const context = await this.getContext();
    const decision = await this.chooseWallpaper(context);

    let applied = false;
    const wm = wallpaperManager || this.wallpaperManager;

    if (decision && decision.wallpaper && wm && typeof wm.apply === 'function') {
      await wm.apply(decision.wallpaper, decision.trigger, decision.collectionId);
      applied = true;
    }

    return {
      decision,
      applied,
      context
    };
  }

  /**
   * Compiles the current contextual environmental snapshot (weather, time, calendar)
   * Overlays mock context when active.
   * @returns {Promise<import('../../../../shared/types').ContextSnapshot>}
   */
  async getContext() {
    const now = new Date();
    let weather = null;
    let activeEvent = null;

    if (this.weatherService && typeof this.weatherService.getCurrentWeather === 'function') {
      try {
        weather = await this.weatherService.getCurrentWeather();
      } catch (e) {
        console.warn('[PersonalizationEngine] Could not get weather for context:', e.message);
      }
    }

    if (this.calendarService && typeof this.calendarService.getActiveEvent === 'function') {
      try {
        activeEvent = this.calendarService.getActiveEvent(now);
      } catch (e) {
        console.warn('[PersonalizationEngine] Could not get active calendar event:', e.message);
      }
    }

    const defaultIsDay = weather?.isDay ?? (now.getHours() >= 6 && now.getHours() < 18);

    const snapshot = {
      now: now.toISOString(),
      weather: weather ? {
        condition: weather.condition,
        tempC: weather.tempC,
        isDay: weather.isDay,
        dayPart: weather.dayPart
      } : {
        condition: 'Clear',
        tempC: 22,
        isDay: defaultIsDay,
        dayPart: defaultIsDay ? 'day' : 'night'
      },
      activeEvent,
      isDay: defaultIsDay
    };

    // Apply mock context overrides if enabled
    if (this.mockContext) {
      if (this.mockContext.weather) {
        snapshot.weather.condition = this.mockContext.weather;
      }
      if (typeof this.mockContext.tempC === 'number') {
        snapshot.weather.tempC = this.mockContext.tempC;
      }
      if (typeof this.mockContext.isDay === 'boolean') {
        snapshot.weather.isDay = this.mockContext.isDay;
        snapshot.isDay = this.mockContext.isDay;
      }
      if (this.mockContext.dayPart) {
        snapshot.weather.dayPart = this.mockContext.dayPart;
      }
      if (this.mockContext.activeEvent !== undefined) {
        snapshot.activeEvent = this.mockContext.activeEvent;
      }
    }

    return snapshot;
  }

  /**
   * Helper that formats a Date object into "HH:MM" 24-hour string
   * @param {Date} date
   * @returns {string}
   * @private
   */
  _formatTimeHHMM(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Evaluates if a given rule's condition matches the current context snapshot
   * @param {import('../../../../shared/types').PersonalizationRule} rule
   * @param {import('../../../../shared/types').ContextSnapshot} context
   * @returns {boolean}
   */
  matchesCondition(rule, context) {
    if (!rule || !rule.conditionType) return false;

    let val = rule.conditionValue;
    if (typeof val === 'string') {
      try {
        val = JSON.parse(val);
      } catch {
        // Keep as string
      }
    }

    const now = context?.now ? new Date(context.now) : new Date();

    switch (rule.conditionType) {
      case 'TIME_RANGE': {
        if (!val || typeof val !== 'object') return false;
        const from = val.from;
        const to = val.to;
        if (!from || !to) return false;

        const currentHHMM = this._formatTimeHHMM(now);

        // Handle normal range vs range crossing midnight (e.g. 22:00 to 05:00)
        if (from <= to) {
          return currentHHMM >= from && currentHHMM <= to;
        } else {
          // Crosses midnight
          return currentHHMM >= from || currentHHMM <= to;
        }
      }

      case 'WEATHER': {
        const targetCondition = typeof val === 'object' ? val.condition : String(val);
        if (!targetCondition || !context.weather?.condition) return false;
        return context.weather.condition.toLowerCase() === targetCondition.toLowerCase();
      }

      case 'DAY_PART': {
        const targetPart = typeof val === 'object' ? val.part : String(val);
        if (!targetPart) return false;

        const actualPart = context.weather?.dayPart || (context.isDay ? 'day' : 'night');
        return actualPart.toLowerCase() === targetPart.toLowerCase();
      }

      default:
        return false;
    }
  }

  /**
   * Dry-run rule evaluation ("Test My Rules"):
   * Iterates enabled rules sorted by priority ASC and returns first matching rule.
   * Does NOT alter the OS desktop wallpaper.
   * @param {import('../../../../shared/types').ContextSnapshot} [contextSnapshot]
   * @returns {Promise<import('../../../../shared/types').PersonalizationRule | null>}
   */
  async evaluateRules(contextSnapshot = null) {
    const context = contextSnapshot || await this.getContext();
    const rules = this.rulesRepo.listEnabled(); // Ordered by priority ASC

    for (const rule of rules) {
      if (this.matchesCondition(rule, context)) {
        return rule;
      }
    }

    return null;
  }

  /**
   * The core 5-step priority evaluation chain determining which wallpaper should be on screen right now.
   *
   * Priority:
   * 1. Manual Override check (survives restart, highest priority)
   * 2. Calendar Binding check (if autoAdaptEnabled and active event matches keyword)
   * 3. Personalization Rules check (if autoAdaptEnabled and rule matches time/weather/day_part)
   * 4. Scheduled Rotation (active collection cycle / shuffle)
   * 5. Fallback (default wallpaper)
   *
   * @param {import('../../../../shared/types').ContextSnapshot} [context]
   * @returns {Promise<{ wallpaper: Object, trigger: 'MANUAL'|'ROTATION'|'RULE'|'CALENDAR', rule?: Object, event?: Object, collectionId?: string, override?: Object }>}
   */
  async chooseWallpaper(context = null) {
    const currentContext = context || await this.getContext();

    // 1. Manual Override check (survives restart, highest priority)
    const override = this.overridesRepo.get();
    if (override && (!override.expiresAt || new Date(override.expiresAt) > new Date())) {
      const wp = this.wallpaperRepo.getById(override.wallpaperId);
      if (wp) {
        return {
          wallpaper: wp,
          trigger: 'MANUAL',
          override
        };
      }
    }

    // Check if auto-adaptation is enabled in settings
    let isAutoAdapt = true;
    if (this.appSettings) {
      const settings = this.appSettings.getSettings ? this.appSettings.getSettings() : this.appSettings.cachedSettings;
      if (typeof settings?.autoAdaptEnabled === 'boolean') {
        isAutoAdapt = settings.autoAdaptEnabled;
      }
    }

    if (isAutoAdapt) {
      // 2. Calendar Binding check
      if (currentContext.activeEvent && this.calendarService) {
        const boundCollectionId = this.calendarService.matchBinding(currentContext.activeEvent);
        if (boundCollectionId && this.collectionsService) {
          const wp = this.collectionsService.pickItem(boundCollectionId, 'next');
          if (wp) {
            return {
              wallpaper: wp,
              trigger: 'CALENDAR',
              event: currentContext.activeEvent,
              collectionId: boundCollectionId
            };
          }
        }
      }

      // 3. Personalization Rules check (ordered by priority ASC)
      const matchingRule = await this.evaluateRules(currentContext);
      if (matchingRule && this.collectionsService) {
        const wp = this.collectionsService.pickItem(matchingRule.collectionId, 'next');
        if (wp) {
          return {
            wallpaper: wp,
            trigger: 'RULE',
            rule: matchingRule,
            collectionId: matchingRule.collectionId
          };
        }
      }
    }

    // 4. Default Scheduled Rotation
    if (this.rotationScheduler && typeof this.rotationScheduler.pickNext === 'function') {
      const wp = this.rotationScheduler.pickNext();
      if (wp) {
        return {
          wallpaper: wp,
          trigger: 'ROTATION'
        };
      }
    }

    // 5. Fallback: Pick any wallpaper from database or return safe default
    let fallbackWp = null;
    try {
      const allWallpapers = this.wallpaperRepo.getAll ? this.wallpaperRepo.getAll() : [];
      if (allWallpapers.length > 0) {
        fallbackWp = allWallpapers[0];
      }
    } catch {
      // ignore
    }

    if (!fallbackWp) {
      fallbackWp = {
        id: 'unsplash:default-fallback',
        source: 'unsplash',
        title: 'AuraDesk Default Wallpaper',
        imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
        thumbUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
        photographer: 'AuraDesk System',
        creditUrl: 'https://auradesk.app',
        width: 3840,
        height: 2160
      };
    }

    return {
      wallpaper: fallbackWp,
      trigger: 'ROTATION'
    };
  }

  // ==========================================
  // DELEGATOR METHODS FOR REPO & OVERRIDES
  // ==========================================

  getOverride() {
    return this.overridesRepo.get();
  }

  setOverride(wallpaperId, expiresAt = null) {
    return this.overridesRepo.set(wallpaperId, expiresAt);
  }

  clearOverride() {
    return this.overridesRepo.clear();
  }

  listRules() {
    return this.rulesRepo.list();
  }

  createRule(rule) {
    return this.rulesRepo.create(rule);
  }

  updateRule(id, patch) {
    return this.rulesRepo.update(id, patch);
  }

  deleteRule(id) {
    return this.rulesRepo.delete(id);
  }

  reorderRules(orderedIds) {
    return this.rulesRepo.reorder(orderedIds);
  }
}

module.exports = PersonalizationEngine;
