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
import { electronBridge, isElectron, getPlatform, normalizeBackendWallpaper } from '../services/electronBridge';

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
  schedulerRunning: boolean;
  secondsRemaining: number;
  isLoadingBackend: boolean;
  applyWallpaper: (wallpaper: Wallpaper, reason?: HistoryEntry['reason']) => Promise<boolean>;
  unsetWallpaper: () => Promise<boolean>;
  rotateNext: (isManual?: boolean) => Promise<void>;
  rollbackHistory: (entryId: string) => Promise<void>;
  clearHistory: () => Promise<boolean>;
  createCollection: (name: string, description?: string) => Promise<WallpaperCollection | null>;
  deleteCollection: (id: string) => Promise<boolean>;
  toggleWallpaperInCollection: (wallpaperId: string, collectionId: string, wallpaperObj?: Wallpaper) => Promise<boolean>;
  applyCollection: (collectionId: string, mode?: 'random' | 'next') => Promise<any>;
  exportCollection: (collectionId: string) => Promise<any>;
  addCustomWallpaper: (wallpaper: Omit<Wallpaper, 'id'>) => Promise<Wallpaper>;
  toggleScheduler: () => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  refreshCollections: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  isTrayOpen: boolean;
  setIsTrayOpen: (open: boolean) => void;
  isNativeElectron: boolean;
  backendStatus: 'initializing' | 'ready' | 'offline' | 'error' | 'disconnected';
  backendError: string | null;
  platformName: string;
  pickNativeLocalWallpapers: () => Promise<Array<{ id: string; localPath: string; title: string; imageUrl: string }> | null>;
  minimizeAppToTray: () => void;
  quitApplication: () => void;
  closeWindow: () => void;
  minimizeWindow: () => void;
  toggleMaximizeWindow: () => void;
  currentTimeString: string;
  // Stubs for backward compatibility
  rules: PersonalizationRule[];
  calendarEvents: CalendarEvent[];
  weatherCondition: WeatherCondition;
  setWeatherCondition: (cond: WeatherCondition) => void;
  simulatedHour: number;
  setSimulatedHour: (hour: number) => void;
  isLiveClock: boolean;
  setIsLiveClock: (live: boolean) => void;
  timeOfDay: TimeOfDay;
  activeRuleStatus: { reason: string; description: string };
  toggleRule: (ruleId: string) => void;
  addRule: (rule: Omit<PersonalizationRule, 'id'>) => void;
  deleteRule: (id: string) => void;
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  deleteCalendarEvent: (id: string) => void;
}

const WallpaperContext = createContext<WallpaperContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
  rotationIntervalMinutes: 15,
  shuffleEnabled: true,
  autoAdaptEnabled: true,
  scalingMode: 'fill',
  avoidRecentWallpapers: true,
  recentHistoryLimit: 10,
  glassTheme: 'blackish',
  darkMode: true,
  systemTrayMinimized: false,
};

const INITIAL_WALLPAPER: Wallpaper = {
  id: 'auradesk-initial',
  title: 'AuraDesk Engine',
  imageUrl: '',
  sourceCredit: 'AuraDesk Desktop Engine',
  category: 'nature',
  width: 3840,
  height: 2160,
  aspectRatio: '16:9',
  tags: ['ready'],
};

export const WallpaperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Authoritative Backend States (strictly zero hardcoded mocks)
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [collections, setCollections] = useState<WallpaperCollection[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string>('');
  const [currentWallpaper, setCurrentWallpaper] = useState<Wallpaper>(INITIAL_WALLPAPER);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [scalingMode, setScalingModeState] = useState<ScalingMode>('fill');
  const [glassTheme, setGlassThemeState] = useState<'whitish' | 'blackish'>('blackish');
  const [schedulerRunning, setSchedulerRunning] = useState<boolean>(true);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);
  const [isTrayOpen, setIsTrayOpen] = useState<boolean>(false);
  const [isLoadingBackend, setIsLoadingBackend] = useState<boolean>(true);
  const [backendStatus, setBackendStatus] = useState<'initializing' | 'ready' | 'offline' | 'error' | 'disconnected'>(
    isElectron() ? 'initializing' : 'disconnected'
  );
  const [backendError, setBackendError] = useState<string | null>(null);

  const platformName = useMemo(() => {
    const p = getPlatform();
    return p === 'darwin' ? 'macOS' : (p === 'win32' ? 'Windows' : 'Linux');
  }, []);

  // Time display
  const [liveDate, setLiveDate] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentTimeString = useMemo(() => {
    const hours = liveDate.getHours().toString().padStart(2, '0');
    const minutes = liveDate.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }, [liveDate]);

  // ==========================================
  // AUTHORITATIVE BACKEND REFRESH METHODS
  // ==========================================

  // Refreshes Collections from SQLite
  const refreshCollections = useCallback(async () => {
    if (!isElectron()) return;
    try {
      const summaries = await electronBridge.listCollections();
      if (!summaries || !Array.isArray(summaries)) {
        setCollections([]);
        return;
      }

      const loadedCollections: WallpaperCollection[] = [];
      const allCollectionWallpapers: Wallpaper[] = [];

      for (const s of summaries) {
        const detail = await electronBridge.getCollection(s.id);
        const itemIds: string[] = [];

        if (detail && Array.isArray(detail.items)) {
          for (const it of detail.items) {
            itemIds.push(it.id);
            allCollectionWallpapers.push(normalizeBackendWallpaper(it));
          }
        }

        loadedCollections.push({
          id: s.id,
          name: s.name,
          description: `${itemIds.length} wallpapers`,
          createdAt: s.createdAt,
          wallpaperIds: itemIds,
        });
      }

      setCollections(loadedCollections);
      if (allCollectionWallpapers.length > 0) {
        setWallpapers(prev => {
          const map = new Map(prev.map(p => [p.id, p]));
          allCollectionWallpapers.forEach(w => map.set(w.id, w));
          return Array.from(map.values());
        });
      }

      if (loadedCollections.length > 0) {
        setActiveCollectionId(prev => {
          if (prev && loadedCollections.some(c => c.id === prev)) return prev;
          return loadedCollections[0].id;
        });
      } else {
        setActiveCollectionId('');
      }
    } catch (err) {
      console.warn('[WallpaperContext] Failed to refresh collections from SQLite:', err);
    }
  }, []);

  // Refreshes Rotation History from SQLite
  const refreshHistory = useCallback(async () => {
    if (!isElectron()) return;
    try {
      const entries = await electronBridge.getRotationHistory(50, 0);
      if (entries && Array.isArray(entries)) {
        const mapped: HistoryEntry[] = entries.map(e => ({
          id: String(e.id),
          wallpaperId: e.wallpaperId,
          wallpaperTitle: e.wallpaper?.title || 'Desktop Wallpaper',
          imageUrl: e.wallpaper?.imageUrl || e.wallpaper?.thumbUrl || '',
          sourceCredit: e.wallpaper?.creditUrl || e.wallpaper?.photographer || 'AuraDesk Engine',
          appliedAt: e.appliedAt,
          reason: (e.trigger?.toLowerCase() === 'rotation' ? 'scheduler' : 'manual') as any,
        })).filter(h => Boolean(h.imageUrl));

        setHistory(mapped);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.warn('[WallpaperContext] Failed to refresh history from SQLite:', err);
    }
  }, []);

  // ==========================================
  // INITIALIZATION & REAL-TIME EVENT SUBSCRIPTION
  // ==========================================
  useEffect(() => {
    if (!isElectron()) {
      setIsLoadingBackend(false);
      return;
    }

    let isMounted = true;
    setIsLoadingBackend(true);

    const initBackend = async () => {
      try {
        setBackendStatus('initializing');
        setBackendError(null);

        // 1. Current wallpaper from OS / SQLite
        const backendCurrent = await electronBridge.getCurrentWallpaper();
        if (isMounted && backendCurrent && backendCurrent.imageUrl) {
          setCurrentWallpaper(normalizeBackendWallpaper(backendCurrent));
        }

        // 2. Collections from SQLite
        await refreshCollections();

        // 3. History from SQLite
        await refreshHistory();

        // 4. Rotation config from backend scheduler
        const config = await electronBridge.getRotationConfig();
        if (isMounted && config) {
          setSchedulerRunning(config.enabled);
          setSettings(prev => ({
            ...prev,
            rotationIntervalMinutes: config.intervalMinutes,
            shuffleEnabled: config.shuffle,
          }));
          setSecondsRemaining(config.intervalMinutes * 60);
        }

        // 5. Settings from SQLite
        const savedSettings = await electronBridge.getSettings();
        if (isMounted && savedSettings) {
          const loadedTheme = (savedSettings.glassTheme as 'whitish' | 'blackish') || (savedSettings.darkMode ? 'blackish' : 'whitish') || 'blackish';
          setGlassThemeState(loadedTheme);
          setSettings(prev => ({
            ...prev,
            ...savedSettings,
            glassTheme: loadedTheme,
            darkMode: loadedTheme === 'blackish',
            rotationIntervalMinutes: savedSettings.rotationInterval ?? prev.rotationIntervalMinutes,
            shuffleEnabled: savedSettings.shuffleEnabled ?? prev.shuffleEnabled,
            autoAdaptEnabled: savedSettings.autoAdaptEnabled ?? prev.autoAdaptEnabled,
          }));
        }

        if (isMounted) {
          setBackendStatus('ready');
        }
      } catch (err: any) {
        console.warn('[WallpaperContext] Error during backend initialization:', err);
        if (isMounted) {
          setBackendStatus('error');
          setBackendError(err?.message || 'Backend connection error');
        }
      } finally {
        if (isMounted) {
          setIsLoadingBackend(false);
        }
      }
    };

    initBackend();

    // Push Event: Desktop Wallpaper Changed (from rotation, tray, or manual apply)
    const unsubWallpaper = electronBridge.onWallpaperChanged((eventData) => {
      if (eventData && eventData.wallpaper) {
        const wp = normalizeBackendWallpaper(eventData.wallpaper);
        setCurrentWallpaper(wp);
        refreshHistory();
      }
    });

    // Push Event: Rotation State Changed
    const unsubRotation = electronBridge.onRotationState((state) => {
      if (state && typeof state.enabled === 'boolean') {
        setSchedulerRunning(state.enabled);
      }
    });

    return () => {
      isMounted = false;
      if (typeof unsubWallpaper === 'function') unsubWallpaper();
      if (typeof unsubRotation === 'function') unsubRotation();
    };
  }, [refreshCollections, refreshHistory]);

  // ==========================================
  // BACKEND-DRIVEN MUTATION ACTIONS
  // ==========================================

  // Apply Wallpaper to host OS and persist to SQLite
  const applyWallpaper = useCallback(async (wallpaper: Wallpaper, reason: HistoryEntry['reason'] = 'manual'): Promise<boolean> => {
    if (!isElectron()) return false;

    const trigger = reason === 'scheduler' ? 'ROTATION' : 'MANUAL';
    const res = await electronBridge.applyWallpaper(wallpaper, trigger, activeCollectionId);

    if (res.success) {
      setCurrentWallpaper(wallpaper);
      await refreshHistory();
      return true;
    } else {
      console.warn('[WallpaperContext] Wallpaper application failed:', res.error);
      return false;
    }
  }, [activeCollectionId, refreshHistory]);

  // Rotate next wallpaper in active collection via backend scheduler
  const rotateNext = useCallback(async (isManual = true): Promise<void> => {
    if (isElectron()) {
      const backendWp = await electronBridge.rotateNow();
      if (backendWp) {
        setCurrentWallpaper(normalizeBackendWallpaper(backendWp));
        await refreshHistory();
      }
    }
  }, [refreshHistory]);

  // Rollback to prior history item
  const rollbackHistory = useCallback(async (entryId: string): Promise<void> => {
    const entry = history.find(h => h.id === entryId);
    if (!entry) return;

    const target: Wallpaper = {
      id: entry.wallpaperId,
      title: entry.wallpaperTitle,
      imageUrl: entry.imageUrl,
      thumbUrl: entry.imageUrl,
      sourceCredit: entry.sourceCredit,
      category: 'nature',
      width: 3840,
      height: 2160,
      aspectRatio: '16:9',
      tags: ['rollback'],
    };

    await applyWallpaper(target, 'manual');
  }, [history, applyWallpaper]);

  // Unset current wallpaper: clears manual override and reverts to prior wallpaper or next rotation item
  const unsetWallpaper = useCallback(async (): Promise<boolean> => {
    try {
      if (isElectron()) {
        await electronBridge.clearOverride();
      }

      // If previous wallpaper exists in history, revert to it
      if (history.length > 1) {
        const prevEntry = history[1];
        await rollbackHistory(prevEntry.id);
        return true;
      }

      // If rotation or collection exists, rotate to next
      if (isElectron()) {
        const nextWp = await electronBridge.rotateNow();
        if (nextWp) {
          setCurrentWallpaper(normalizeBackendWallpaper(nextWp));
          await refreshHistory();
          return true;
        }
      }

      // Reset to engine initial wallpaper
      setCurrentWallpaper(INITIAL_WALLPAPER);
      return true;
    } catch (err) {
      console.warn('[WallpaperContext] Failed to unset wallpaper:', err);
      return false;
    }
  }, [history, rollbackHistory, refreshHistory]);

  // Clear rotation history in SQLite
  const clearHistory = useCallback(async (): Promise<boolean> => {
    if (isElectron()) {
      const success = await electronBridge.clearRotationHistory();
      if (success) {
        setHistory([]);
        return true;
      }
    }
    return false;
  }, []);

  // Create Collection in SQLite
  const createCollection = useCallback(async (name: string, description: string = ''): Promise<WallpaperCollection | null> => {
    if (!isElectron()) return null;

    const created = await electronBridge.createCollection(name);
    if (created && created.id) {
      await refreshCollections();
      setActiveCollectionId(created.id);
      return {
        id: created.id,
        name: created.name,
        description: description || 'Custom Collection',
        createdAt: created.createdAt,
        wallpaperIds: [],
      };
    }
    return null;
  }, [refreshCollections]);

  // Delete Collection in SQLite
  const deleteCollection = useCallback(async (id: string): Promise<boolean> => {
    if (!isElectron()) return false;

    const success = await electronBridge.deleteCollection(id);
    if (success) {
      await refreshCollections();
      return true;
    }
    return false;
  }, [refreshCollections]);

  // Toggle/Add/Remove wallpaper in a collection in SQLite
  const toggleWallpaperInCollection = useCallback(async (
    wallpaperId: string,
    collectionId: string,
    wallpaperObj?: Wallpaper
  ): Promise<boolean> => {
    if (!isElectron()) return false;

    const col = collections.find(c => c.id === collectionId);
    const exists = col?.wallpaperIds.includes(wallpaperId);

    if (exists) {
      await electronBridge.removeCollectionItem(collectionId, wallpaperId);
    } else {
      const wpToSave = wallpaperObj || wallpapers.find(w => w.id === wallpaperId) || {
        id: wallpaperId,
        title: 'Wallpaper',
        imageUrl: '',
        thumbUrl: '',
        sourceCredit: 'AuraDesk',
        category: 'nature' as const,
        width: 3840,
        height: 2160,
        aspectRatio: '16:9',
        tags: [],
      };
      await electronBridge.addCollectionItem(collectionId, wpToSave);
    }

    await refreshCollections();
    return true;
  }, [collections, wallpapers, refreshCollections]);

  // Apply an entire collection to the desktop (shuffle or cycle)
  const applyCollection = useCallback(async (collectionId: string, mode: 'random' | 'next' = 'next') => {
    if (isElectron()) {
      const res = await electronBridge.applyCollection(collectionId, mode);
      if (res) {
        const wp = normalizeBackendWallpaper(res);
        setCurrentWallpaper(wp);
        await refreshHistory();
        return res;
      }
    }
    return null;
  }, [refreshHistory]);

  // Export collection to JSON vault
  const exportCollection = useCallback(async (collectionId: string) => {
    return electronBridge.exportCollection(collectionId);
  }, []);

  // Add Custom Wallpaper (saves to SQLite and applies)
  const addCustomWallpaper = useCallback(async (newWall: Omit<Wallpaper, 'id'>): Promise<Wallpaper> => {
    const created: Wallpaper = {
      ...newWall,
      id: `local:${Date.now()}`,
      isCustom: true,
    };

    if (activeCollectionId) {
      await electronBridge.addCollectionItem(activeCollectionId, created);
      await refreshCollections();
    }

    await applyWallpaper(created, 'manual');
    return created;
  }, [activeCollectionId, refreshCollections, applyWallpaper]);

  // Native Local Wallpaper Picker
  const pickNativeLocalWallpapers = useCallback(async () => {
    const picked = await electronBridge.pickLocalWallpapers();
    if (picked && picked.length > 0) {
      const first = picked[0];
      const wp: Wallpaper = {
        id: first.id,
        title: first.title || 'Local Wallpaper',
        imageUrl: first.imageUrl,
        thumbUrl: first.imageUrl,
        category: 'minimalist',
        sourceCredit: 'Local Disk: ' + first.localPath,
        width: 3840,
        height: 2160,
        aspectRatio: '16:9',
        tags: ['local', 'custom'],
        isCustom: true,
      };

      if (activeCollectionId) {
        await electronBridge.addCollectionItem(activeCollectionId, wp);
        await refreshCollections();
      }

      await applyWallpaper(wp, 'manual');
      return picked;
    }
    return null;
  }, [activeCollectionId, refreshCollections, applyWallpaper]);

  // Scheduler Toggle
  const toggleScheduler = useCallback(() => {
    setSchedulerRunning(prev => {
      const next = !prev;
      if (isElectron()) {
        if (next) {
          electronBridge.resumeRotation().catch(console.warn);
        } else {
          electronBridge.pauseRotation().catch(console.warn);
        }
      }
      return next;
    });
  }, []);

  // Settings & Theme
  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const merged = { ...prev, ...newSettings };
      if (isElectron()) {
        electronBridge.saveSettings(merged).catch(console.warn);
        if (typeof newSettings.rotationIntervalMinutes === 'number' || typeof newSettings.shuffleEnabled === 'boolean') {
          electronBridge.setRotationConfig({
            intervalMinutes: merged.rotationIntervalMinutes,
            shuffle: merged.shuffleEnabled,
          }).catch(console.warn);
        }
      }
      return merged;
    });
  }, []);

  const setGlassTheme = useCallback((theme: 'whitish' | 'blackish') => {
    setGlassThemeState(theme);
    updateSettings({ glassTheme: theme, darkMode: theme === 'blackish' });
  }, [updateSettings]);

  const setScalingMode = useCallback((mode: ScalingMode) => {
    setScalingModeState(mode);
    updateSettings({ scalingMode: mode });
  }, [updateSettings]);

  // Window Controls
  const minimizeAppToTray = useCallback(() => {
    electronBridge.minimizeToTray();
  }, []);

  const quitApplication = useCallback(() => {
    electronBridge.quitApp();
  }, []);

  const closeWindow = useCallback(() => {
    electronBridge.closeWindow();
  }, []);

  const minimizeWindow = useCallback(() => {
    electronBridge.minimizeWindow();
  }, []);

  const toggleMaximizeWindow = useCallback(() => {
    electronBridge.toggleMaximizeWindow();
  }, []);

  // Timer countdown for rotation
  useEffect(() => {
    if (!schedulerRunning) return;
    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          return settings.rotationIntervalMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [schedulerRunning, settings.rotationIntervalMinutes]);

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
        schedulerRunning,
        secondsRemaining,
        isLoadingBackend,
        applyWallpaper,
        unsetWallpaper,
        rotateNext,
        rollbackHistory,
        clearHistory,
        createCollection,
        deleteCollection,
        toggleWallpaperInCollection,
        applyCollection,
        exportCollection,
        addCustomWallpaper,
        toggleScheduler,
        updateSettings,
        refreshCollections,
        refreshHistory,
        isTrayOpen,
        setIsTrayOpen,
        isNativeElectron: isElectron(),
        backendStatus,
        backendError,
        platformName,
        pickNativeLocalWallpapers,
        minimizeAppToTray,
        quitApplication,
        closeWindow,
        minimizeWindow,
        toggleMaximizeWindow,
        currentTimeString,
        // Stubs for backward compatibility
        rules: [],
        calendarEvents: [],
        weatherCondition: 'clear',
        setWeatherCondition: () => { },
        simulatedHour: 14,
        setSimulatedHour: () => { },
        isLiveClock: true,
        setIsLiveClock: () => { },
        timeOfDay: 'day',
        activeRuleStatus: { reason: 'Active Rotation', description: 'Scheduled rotation active' },
        toggleRule: () => { },
        addRule: () => { },
        deleteRule: () => { },
        addCalendarEvent: () => { },
        deleteCalendarEvent: () => { },
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
