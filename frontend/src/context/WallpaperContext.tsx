import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wallpaper,
  WallpaperCollection,
  HistoryEntry,
  AppSettings,
  PersonalizationRule,
  CalendarEvent,
  ScalingMode,
  WeatherCondition,
  TimeOfDay,
} from '../types/wallpaper';
import {
  CURATED_WALLPAPERS,
  DEFAULT_COLLECTIONS,
  DEFAULT_RULES,
  DEFAULT_CALENDAR_EVENTS,
} from '../data/curatedWallpapers';
import {
  determineTimeOfDay,
  evaluateContextRules,
  selectEligibleWallpapers,
  pickNextWallpaper,
  ContextState,
} from '../utils/personalization';
import { electronBridge, isElectron } from '../services/electronBridge';

interface WallpaperContextType {
  wallpapers: Wallpaper[];
  collections: WallpaperCollection[];
  activeCollectionId: string;
  setActiveCollectionId: (id: string) => void;
  currentWallpaper: Wallpaper;
  scalingMode: ScalingMode;
  setScalingMode: (mode: ScalingMode) => void;
  glassTheme: 'whitish' | 'blackish';
  setGlassTheme: (theme: 'whitish' | 'blackish') => void;
  history: HistoryEntry[];
  settings: AppSettings;
  rules: PersonalizationRule[];
  calendarEvents: CalendarEvent[];
  weatherCondition: WeatherCondition;
  setWeatherCondition: (cond: WeatherCondition) => void;
  simulatedHour: number;
  setSimulatedHour: (hour: number) => void;
  isLiveClock: boolean;
  setIsLiveClock: (live: boolean) => void;
  currentTimeString: string;
  timeOfDay: TimeOfDay;
  schedulerRunning: boolean;
  secondsRemaining: number;
  activeRuleStatus: { reason: string; description: string };
  applyWallpaper: (wallpaper: Wallpaper, reason?: HistoryEntry['reason']) => void;
  rotateNext: (isManual?: boolean) => void;
  rollbackHistory: (entryId: string) => void;
  clearHistory: () => void;
  createCollection: (name: string, description: string) => WallpaperCollection;
  deleteCollection: (id: string) => void;
  toggleWallpaperInCollection: (wallpaperId: string, collectionId: string) => void;
  addCustomWallpaper: (wallpaper: Omit<Wallpaper, 'id'>) => Wallpaper;
  toggleRule: (ruleId: string) => void;
  addRule: (rule: Omit<PersonalizationRule, 'id'>) => void;
  deleteRule: (id: string) => void;
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  deleteCalendarEvent: (id: string) => void;
  toggleScheduler: () => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  isTrayOpen: boolean;
  setIsTrayOpen: (open: boolean) => void;
  isNativeElectron: boolean;
  pickNativeLocalWallpapers: () => Promise<Array<{ id: string; localPath: string; title: string; imageUrl: string }> | null>;
  minimizeAppToTray: () => void;
  quitApplication: () => void;
}

const WallpaperContext = createContext<WallpaperContextType | undefined>(undefined);

const STORAGE_KEYS = {
  WALLPAPERS: 'auradesk_wallpapers_v1',
  COLLECTIONS: 'auradesk_collections_v1',
  ACTIVE_COLLECTION: 'auradesk_active_col_v1',
  CURRENT_WALLPAPER: 'auradesk_current_wall_v1',
  HISTORY: 'auradesk_history_v1',
  RULES: 'auradesk_rules_v1',
  CALENDAR: 'auradesk_calendar_v1',
  SETTINGS: 'auradesk_settings_v1',
  WEATHER: 'auradesk_weather_v1',
};

const DEFAULT_SETTINGS: AppSettings = {
  rotationIntervalMinutes: 15,
  shuffleEnabled: true,
  autoAdaptEnabled: true,
  scalingMode: 'fill',
  avoidRecentWallpapers: true,
  recentHistoryLimit: 10,
  glassTheme: 'whitish',
  darkMode: false,
  systemTrayMinimized: false,
};

export const WallpaperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load persistent state from localStorage with fallbacks
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WALLPAPERS);
      return saved ? JSON.parse(saved) : CURATED_WALLPAPERS;
    } catch {
      return CURATED_WALLPAPERS;
    }
  });

  const [collections, setCollections] = useState<WallpaperCollection[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
      return saved ? JSON.parse(saved) : DEFAULT_COLLECTIONS;
    } catch {
      return DEFAULT_COLLECTIONS;
    }
  });

  const [activeCollectionId, setActiveCollectionId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_COLLECTION) || 'col-curated';
    } catch {
      return 'col-curated';
    }
  });

  const [currentWallpaper, setCurrentWallpaper] = useState<Wallpaper>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_WALLPAPER);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return CURATED_WALLPAPERS[0];
  });

  const [scalingMode, setScalingModeState] = useState<ScalingMode>('fill');

  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'hist-init',
        wallpaperId: CURATED_WALLPAPERS[0].id,
        wallpaperTitle: CURATED_WALLPAPERS[0].title,
        imageUrl: CURATED_WALLPAPERS[0].imageUrl,
        sourceCredit: CURATED_WALLPAPERS[0].sourceCredit,
        appliedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reason: 'manual',
      },
    ];
  });

  const [rules, setRules] = useState<PersonalizationRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RULES);
      return saved ? JSON.parse(saved) : DEFAULT_RULES;
    } catch {
      return DEFAULT_RULES;
    }
  });

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CALENDAR);
      return saved ? JSON.parse(saved) : DEFAULT_CALENDAR_EVENTS;
    } catch {
      return DEFAULT_CALENDAR_EVENTS;
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Weather & Time simulation context
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>('clear');
  const [isLiveClock, setIsLiveClock] = useState<boolean>(true);
  const [simulatedHour, setSimulatedHour] = useState<number>(14);
  const [simulatedMinute, setSimulatedMinute] = useState<number>(30);
  const [schedulerRunning, setSchedulerRunning] = useState<boolean>(true);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(settings.rotationIntervalMinutes * 60);
  const [isTrayOpen, setIsTrayOpen] = useState<boolean>(false);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WALLPAPERS, JSON.stringify(wallpapers));
      localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_COLLECTION, activeCollectionId);
      localStorage.setItem(STORAGE_KEYS.CURRENT_WALLPAPER, JSON.stringify(currentWallpaper));
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
      localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(rules));
      localStorage.setItem(STORAGE_KEYS.CALENDAR, JSON.stringify(calendarEvents));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [wallpapers, collections, activeCollectionId, currentWallpaper, history, rules, calendarEvents, settings]);

  // Current system / simulated time string calculation
  const [liveDate, setLiveDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = isLiveClock ? liveDate.getHours() : simulatedHour;
  const currentMinute = isLiveClock ? liveDate.getMinutes() : simulatedMinute;

  const currentTimeString = useMemo(() => {
    const h = String(currentHour).padStart(2, '0');
    const m = String(currentMinute).padStart(2, '0');
    return `${h}:${m}`;
  }, [currentHour, currentMinute]);

  const timeOfDay = useMemo(() => {
    return determineTimeOfDay(currentHour, currentMinute);
  }, [currentHour, currentMinute]);

  // Context rules evaluation
  const contextState: ContextState = useMemo(() => ({
    timeOfDay,
    weatherCondition,
    currentTimeHHMM: currentTimeString,
    activeCalendarEvents: calendarEvents,
  }), [timeOfDay, weatherCondition, currentTimeString, calendarEvents]);

  const ruleEvaluation = useMemo(() => {
    return evaluateContextRules(rules, contextState, settings.autoAdaptEnabled);
  }, [rules, contextState, settings.autoAdaptEnabled]);

  const activeRuleStatus = useMemo(() => ({
    reason: ruleEvaluation.reason,
    description: ruleEvaluation.description,
  }), [ruleEvaluation]);

  // Apply wallpaper with history record and native OS desktop update
  const applyWallpaper = useCallback((wallpaper: Wallpaper, reason: HistoryEntry['reason'] = 'manual') => {
    setCurrentWallpaper(wallpaper);
    const newEntry: HistoryEntry = {
      id: 'hist-' + Date.now(),
      wallpaperId: wallpaper.id,
      wallpaperTitle: wallpaper.title,
      imageUrl: wallpaper.imageUrl,
      sourceCredit: wallpaper.sourceCredit,
      appliedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reason,
    };
    setHistory(prev => [newEntry, ...prev.slice(0, settings.recentHistoryLimit - 1)]);
    setSecondsRemaining(settings.rotationIntervalMinutes * 60);

    const trigger = reason === 'calendar' ? 'CALENDAR' : reason === 'rule' ? 'RULE' : reason === 'rotation' ? 'ROTATION' : 'MANUAL';
    electronBridge.applyWallpaper(wallpaper, trigger).catch((err) => {
      console.warn('[WallpaperContext] Native wallpaper apply error:', err);
    });
  }, [settings.recentHistoryLimit, settings.rotationIntervalMinutes]);

  // Rollback to earlier history
  const rollbackHistory = useCallback((entryId: string) => {
    const target = history.find(h => h.id === entryId);
    if (!target) return;
    const foundWall = wallpapers.find(w => w.id === target.wallpaperId);
    if (foundWall) {
      applyWallpaper(foundWall, 'manual');
    }
  }, [history, wallpapers, applyWallpaper]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Automatic or Manual next rotation
  const rotateNext = useCallback((isManual: boolean = false) => {
    // Determine target collection
    let targetColId = activeCollectionId;
    if (settings.autoAdaptEnabled && ruleEvaluation.targetCollectionId) {
      targetColId = ruleEvaluation.targetCollectionId;
    }

    const currentCollection = collections.find(c => c.id === targetColId) || collections[0];
    const recentIds = history.map(h => h.wallpaperId);

    const eligible = selectEligibleWallpapers(
      wallpapers,
      currentCollection,
      recentIds,
      settings.avoidRecentWallpapers
    );

    const next = pickNextWallpaper(eligible, currentWallpaper?.id || null, settings.shuffleEnabled);
    if (next) {
      const reason = isManual ? 'manual' : ruleEvaluation.reason;
      applyWallpaper(next, reason);
    }
  }, [
    activeCollectionId,
    settings.autoAdaptEnabled,
    settings.avoidRecentWallpapers,
    settings.shuffleEnabled,
    ruleEvaluation,
    collections,
    history,
    wallpapers,
    currentWallpaper,
    applyWallpaper,
  ]);

  // Countdown timer for automatic rotation
  useEffect(() => {
    if (!schedulerRunning) return;

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          rotateNext(false);
          return settings.rotationIntervalMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [schedulerRunning, settings.rotationIntervalMinutes, rotateNext]);

  // Collection management
  const createCollection = useCallback((name: string, description: string) => {
    const newCol: WallpaperCollection = {
      id: 'col-' + Date.now(),
      name,
      description,
      createdAt: new Date().toISOString().split('T')[0],
      wallpaperIds: [],
    };
    setCollections(prev => [...prev, newCol]);
    return newCol;
  }, []);

  const deleteCollection = useCallback((id: string) => {
    setCollections(prev => prev.filter(c => c.id !== id));
    if (activeCollectionId === id) {
      setActiveCollectionId('col-curated');
    }
  }, [activeCollectionId]);

  const toggleWallpaperInCollection = useCallback((wallpaperId: string, collectionId: string) => {
    setCollections(prev =>
      prev.map(c => {
        if (c.id === collectionId) {
          const exists = c.wallpaperIds.includes(wallpaperId);
          return {
            ...c,
            wallpaperIds: exists
              ? c.wallpaperIds.filter(id => id !== wallpaperId)
              : [...c.wallpaperIds, wallpaperId],
          };
        }
        return c;
      })
    );
  }, []);

  // Add custom wallpaper
  const addCustomWallpaper = useCallback((newWall: Omit<Wallpaper, 'id'>) => {
    const created: Wallpaper = {
      ...newWall,
      id: 'custom-' + Date.now(),
      isCustom: true,
    };
    setWallpapers(prev => [created, ...prev]);
    // Also add to active collection
    toggleWallpaperInCollection(created.id, activeCollectionId);
    return created;
  }, [activeCollectionId, toggleWallpaperInCollection]);

  // Rule management
  const toggleRule = useCallback((ruleId: string) => {
    setRules(prev =>
      prev.map(r => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  }, []);

  const addRule = useCallback((ruleData: Omit<PersonalizationRule, 'id'>) => {
    const newRule: PersonalizationRule = {
      ...ruleData,
      id: 'rule-' + Date.now(),
    };
    setRules(prev => [...prev, newRule]);
  }, []);

  const deleteRule = useCallback((id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  }, []);

  // Calendar event management
  const addCalendarEvent = useCallback((eventData: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...eventData,
      id: 'cal-' + Date.now(),
    };
    setCalendarEvents(prev => [...prev, newEvent]);
  }, []);

  const deleteCalendarEvent = useCallback((id: string) => {
    setCalendarEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const toggleScheduler = useCallback(() => {
    setSchedulerRunning(prev => !prev);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const merged = { ...prev, ...newSettings };
      electronBridge.saveSettings(merged).catch(console.warn);
      return merged;
    });
  }, []);

  // Sync state with native Electron main process on mount
  useEffect(() => {
    if (isElectron()) {
      // 1. Fetch current desktop wallpaper from SQLite / OS
      electronBridge.getCurrentWallpaper().then((backendCurrent) => {
        if (backendCurrent && backendCurrent.imageUrl) {
          setCurrentWallpaper(prev => ({
            ...prev,
            id: backendCurrent.id || prev.id,
            title: backendCurrent.title || prev.title,
            imageUrl: backendCurrent.imageUrl,
            sourceCredit: backendCurrent.creditUrl || backendCurrent.photographer || prev.sourceCredit,
            photographer: backendCurrent.photographer || prev.photographer,
          }));
        }
      }).catch(console.warn);

      // 2. Listen to background wallpaper rotation events
      const cleanup = electronBridge.onWallpaperChanged((eventData) => {
        if (eventData && eventData.wallpaper) {
          const wp = eventData.wallpaper;
          setCurrentWallpaper({
            id: wp.id,
            title: wp.title || 'Desktop Wallpaper',
            category: 'nature',
            imageUrl: wp.imageUrl || wp.thumbUrl,
            sourceCredit: wp.creditUrl || wp.photographer || 'AuraDesk Engine',
            resolution: { width: wp.width || 3840, height: wp.height || 2160 },
            tags: ['active', 'synced'],
          });
        }
      });

      return () => {
        if (typeof cleanup === 'function') cleanup();
      };
    }
  }, []);

  const pickNativeLocalWallpapers = useCallback(async () => {
    const picked = await electronBridge.pickLocalWallpapers();
    if (picked && picked.length > 0) {
      const added: Wallpaper[] = picked.map(p => ({
        id: p.id,
        title: p.title || 'Local Wallpaper',
        imageUrl: p.imageUrl,
        category: 'minimalist' as const,
        sourceCredit: 'Local Disk: ' + p.localPath,
        resolution: { width: 3840, height: 2160 },
        tags: ['local', 'custom'],
        isCustom: true,
      }));
      setWallpapers(prev => [...added, ...prev]);
      if (added[0]) {
        applyWallpaper(added[0], 'manual');
      }
      return picked;
    }
    return null;
  }, [applyWallpaper]);

  const minimizeAppToTray = useCallback(() => {
    electronBridge.minimizeToTray();
  }, []);

  const quitApplication = useCallback(() => {
    electronBridge.quitApp();
  }, []);

  const [glassTheme, setGlassThemeState] = useState<'whitish' | 'blackish'>(settings.glassTheme || 'whitish');

  const setGlassTheme = useCallback((theme: 'whitish' | 'blackish') => {
    setGlassThemeState(theme);
    setSettings(prev => ({ ...prev, glassTheme: theme }));
  }, []);

  const setScalingMode = useCallback((mode: ScalingMode) => {
    setScalingModeState(mode);
    setSettings(prev => ({ ...prev, scalingMode: mode }));
  }, []);

  return (
    <WallpaperContext.Provider
      value={{
        wallpapers,
        collections,
        activeCollectionId,
        setActiveCollectionId,
        currentWallpaper,
        scalingMode,
        setScalingMode,
        glassTheme,
        setGlassTheme,
        history,
        settings,
        rules,
        calendarEvents,
        weatherCondition,
        setWeatherCondition,
        simulatedHour,
        setSimulatedHour,
        isLiveClock,
        setIsLiveClock,
        currentTimeString,
        timeOfDay,
        schedulerRunning,
        secondsRemaining,
        activeRuleStatus,
        applyWallpaper,
        rotateNext,
        rollbackHistory,
        clearHistory,
        createCollection,
        deleteCollection,
        toggleWallpaperInCollection,
        addCustomWallpaper,
        toggleRule,
        addRule,
        deleteRule,
        addCalendarEvent,
        deleteCalendarEvent,
        toggleScheduler,
        updateSettings,
        isTrayOpen,
        setIsTrayOpen,
        isNativeElectron: isElectron(),
        pickNativeLocalWallpapers,
        minimizeAppToTray,
        quitApplication,
      }}
    >
      {children}
    </WallpaperContext.Provider>
  );
};

export const useWallpaper = (): WallpaperContextType => {
  const context = useContext(WallpaperContext);
  if (!context) {
    throw new Error('useWallpaper must be used within a WallpaperProvider');
  }
  return context;
};
