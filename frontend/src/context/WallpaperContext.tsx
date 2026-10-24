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
} from '../data/curatedWallpapers';
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
  schedulerRunning: boolean;
  secondsRemaining: number;
  applyWallpaper: (wallpaper: Wallpaper, reason?: HistoryEntry['reason']) => void;
  rotateNext: (isManual?: boolean) => void;
  rollbackHistory: (entryId: string) => void;
  clearHistory: () => void;
  createCollection: (name: string, description?: string) => WallpaperCollection;
  deleteCollection: (id: string) => void;
  toggleWallpaperInCollection: (wallpaperId: string, collectionId: string) => void;
  applyCollection: (collectionId: string, mode?: 'random' | 'next') => Promise<any>;
  exportCollection: (collectionId: string) => Promise<any>;
  addCustomWallpaper: (wallpaper: Omit<Wallpaper, 'id'>) => Wallpaper;
  toggleScheduler: () => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  isTrayOpen: boolean;
  setIsTrayOpen: (open: boolean) => void;
  isNativeElectron: boolean;
  pickNativeLocalWallpapers: () => Promise<Array<{ id: string; localPath: string; title: string; imageUrl: string }> | null>;
  minimizeAppToTray: () => void;
  quitApplication: () => void;
  currentTimeString: string;
  // Backward compatibility stubs for UI components
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

const STORAGE_KEYS = {
  WALLPAPERS: 'auradesk_wallpapers_v1',
  COLLECTIONS: 'auradesk_collections_v1',
  ACTIVE_COLLECTION: 'auradesk_active_col_v1',
  CURRENT_WALLPAPER: 'auradesk_current_wp_v1',
  SETTINGS: 'auradesk_settings_v1',
  HISTORY: 'auradesk_history_v1',
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
  // 1. Wallpapers Repository
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WALLPAPERS);
      return saved ? JSON.parse(saved) : CURATED_WALLPAPERS;
    } catch {
      return CURATED_WALLPAPERS;
    }
  });

  // 2. Collections (Sanctum of Memories)
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

  // 3. Current Wallpaper
  const [currentWallpaper, setCurrentWallpaper] = useState<Wallpaper>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_WALLPAPER);
      return saved ? JSON.parse(saved) : CURATED_WALLPAPERS[0];
    } catch {
      return CURATED_WALLPAPERS[0];
    }
  });

  // 4. History (Time Stone)
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 5. Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [scalingMode, setScalingModeState] = useState<ScalingMode>(settings.scalingMode || 'fill');
  const [glassTheme, setGlassThemeState] = useState<'whitish' | 'blackish'>(settings.glassTheme || 'whitish');
  const [schedulerRunning, setSchedulerRunning] = useState<boolean>(true);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(settings.rotationIntervalMinutes * 60);
  const [isTrayOpen, setIsTrayOpen] = useState<boolean>(false);

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

  // Sync state to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WALLPAPERS, JSON.stringify(wallpapers));
      localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_COLLECTION, activeCollectionId);
      localStorage.setItem(STORAGE_KEYS.CURRENT_WALLPAPER, JSON.stringify(currentWallpaper));
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [wallpapers, collections, activeCollectionId, currentWallpaper, history, settings]);

  // ==========================================
  // BACKEND INTEGRATION & INITIALIZATION
  // ==========================================
  useEffect(() => {
    if (!isElectron()) return;

    let isMounted = true;

    // A. Sync current wallpaper from SQLite / OS
    electronBridge.getCurrentWallpaper().then((backendCurrent) => {
      if (isMounted && backendCurrent && backendCurrent.imageUrl) {
        setCurrentWallpaper(prev => ({
          ...prev,
          id: backendCurrent.id || prev.id,
          title: backendCurrent.title || prev.title,
          imageUrl: backendCurrent.imageUrl,
          sourceCredit: backendCurrent.creditUrl || backendCurrent.photographer || prev.sourceCredit,
        }));
      }
    }).catch(console.warn);

    // B. Load collections from SQLite
    electronBridge.listCollections().then(async (summaries) => {
      if (!isMounted || !summaries || summaries.length === 0) return;

      const loadedCollections: WallpaperCollection[] = [];
      const loadedWallpapers: Wallpaper[] = [];

      for (const s of summaries) {
        const detail = await electronBridge.getCollection(s.id);
        const itemIds: string[] = [];

        if (detail && detail.items) {
          for (const it of detail.items) {
            itemIds.push(it.id);
            loadedWallpapers.push({
              id: it.id,
              title: it.title || 'Collection Wallpaper',
              imageUrl: it.imageUrl || it.thumbUrl,
              sourceCredit: it.creditUrl || it.photographer || 'AuraDesk',
              category: 'nature',
              width: it.width || 3840,
              height: it.height || 2160,
              aspectRatio: '16:9',
              tags: ['collection'],
              isCustom: it.source === 'local',
            });
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

      if (isMounted) {
        if (loadedCollections.length > 0) {
          setCollections(loadedCollections);
          if (!loadedCollections.some(c => c.id === activeCollectionId)) {
            setActiveCollectionId(loadedCollections[0].id);
          }
        }
        if (loadedWallpapers.length > 0) {
          setWallpapers(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const fresh = loadedWallpapers.filter(w => !existingIds.has(w.id));
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
        }
      }
    }).catch(console.warn);

    // C. Load rotation history from SQLite
    electronBridge.getRotationHistory(30, 0).then((entries) => {
      if (isMounted && entries && entries.length > 0) {
        const mapped: HistoryEntry[] = entries.map(e => ({
          id: String(e.id),
          wallpaperId: e.wallpaperId,
          wallpaperTitle: e.wallpaper?.title || 'Desktop Wallpaper',
          imageUrl: e.wallpaper?.imageUrl || e.wallpaper?.thumbUrl || '',
          sourceCredit: e.wallpaper?.creditUrl || e.wallpaper?.photographer || 'AuraDesk Engine',
          appliedAt: e.appliedAt,
          reason: (e.trigger?.toLowerCase() === 'rotation' ? 'scheduler' : 'manual') as any,
        })).filter(h => Boolean(h.imageUrl));

        if (mapped.length > 0) {
          setHistory(mapped);
        }
      }
    }).catch(console.warn);

    // D. Load rotation config from backend
    electronBridge.getRotationConfig().then((config) => {
      if (isMounted && config) {
        setSchedulerRunning(config.enabled);
        setSettings(prev => ({
          ...prev,
          rotationIntervalMinutes: config.intervalMinutes,
          shuffleEnabled: config.shuffle,
        }));
      }
    }).catch(console.warn);

    // E. Subscribe to push events from Electron
    const unsubWallpaper = electronBridge.onWallpaperChanged((eventData) => {
      if (eventData && eventData.wallpaper) {
        const wp = eventData.wallpaper;
        const newWp: Wallpaper = {
          id: wp.id,
          title: wp.title || 'Desktop Wallpaper',
          imageUrl: wp.imageUrl || wp.thumbUrl,
          sourceCredit: wp.creditUrl || wp.photographer || 'AuraDesk Engine',
          category: 'nature',
          width: wp.width || 3840,
          height: wp.height || 2160,
          aspectRatio: '16:9',
          tags: ['active'],
        };
        setCurrentWallpaper(newWp);
        setHistory(prev => [
          {
            id: 'hist-' + Date.now(),
            wallpaperId: newWp.id,
            wallpaperTitle: newWp.title,
            imageUrl: newWp.imageUrl,
            sourceCredit: newWp.sourceCredit,
            appliedAt: eventData.appliedAt || new Date().toISOString(),
            reason: eventData.trigger?.toLowerCase() === 'rotation' ? 'scheduler' : 'manual',
          },
          ...prev.slice(0, 49),
        ]);
      }
    });

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
  }, []);

  // ==========================================
  // ACTION HANDLERS
  // ==========================================

  // Apply Wallpaper to desktop & record history
  const applyWallpaper = useCallback((wallpaper: Wallpaper, reason: HistoryEntry['reason'] = 'manual') => {
    setCurrentWallpaper(wallpaper);

    const newEntry: HistoryEntry = {
      id: 'hist-' + Date.now(),
      wallpaperId: wallpaper.id,
      wallpaperTitle: wallpaper.title,
      imageUrl: wallpaper.imageUrl,
      sourceCredit: wallpaper.sourceCredit,
      appliedAt: new Date().toISOString(),
      reason,
    };

    setHistory(prev => [newEntry, ...prev.filter(e => e.wallpaperId !== wallpaper.id)].slice(0, 50));

    if (isElectron()) {
      const trigger = reason === 'scheduler' ? 'ROTATION' : 'MANUAL';
      electronBridge.applyWallpaper(wallpaper, trigger, activeCollectionId).catch(console.warn);
    }
  }, [activeCollectionId]);

  // Rotate next wallpaper
  const rotateNext = useCallback((isManual = true) => {
    if (isElectron()) {
      electronBridge.rotateNow().then((backendWp) => {
        if (backendWp) {
          const wp: Wallpaper = {
            id: backendWp.id,
            title: backendWp.title || 'Rotated Wallpaper',
            imageUrl: backendWp.imageUrl || backendWp.thumbUrl,
            sourceCredit: backendWp.creditUrl || backendWp.photographer || 'AuraDesk Engine',
            category: 'nature',
            width: backendWp.width || 3840,
            height: backendWp.height || 2160,
            aspectRatio: '16:9',
            tags: ['rotated'],
          };
          setCurrentWallpaper(wp);
        }
      }).catch(console.warn);
      return;
    }

    // Fallback rotation
    const pool = wallpapers;
    if (pool.length === 0) return;
    const currentIndex = pool.findIndex(w => w.id === currentWallpaper.id);
    const nextIndex = (currentIndex + 1) % pool.length;
    applyWallpaper(pool[nextIndex], isManual ? 'manual' : 'scheduler');
  }, [wallpapers, currentWallpaper.id, applyWallpaper]);

  // Rollback to history item
  const rollbackHistory = useCallback((entryId: string) => {
    const entry = history.find(h => h.id === entryId);
    if (!entry) return;
    const wp = wallpapers.find(w => w.id === entry.wallpaperId) || {
      id: entry.wallpaperId,
      title: entry.wallpaperTitle,
      imageUrl: entry.imageUrl,
      sourceCredit: entry.sourceCredit,
      category: 'nature' as const,
      width: 3840,
      height: 2160,
      aspectRatio: '16:9',
      tags: ['rollback'],
    };
    applyWallpaper(wp, 'manual');
  }, [history, wallpapers, applyWallpaper]);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
    if (isElectron()) {
      electronBridge.clearRotationHistory().catch(console.warn);
    }
  }, []);

  // Create Collection
  const createCollection = useCallback((name: string, description: string = '') => {
    const tempId = 'col-' + Date.now();
    const created: WallpaperCollection = {
      id: tempId,
      name,
      description: description || 'Custom Collection',
      createdAt: new Date().toISOString(),
      wallpaperIds: [],
    };

    setCollections(prev => [...prev, created]);
    setActiveCollectionId(tempId);

    if (isElectron()) {
      electronBridge.createCollection(name).then((backendCol) => {
        if (backendCol && backendCol.id) {
          setCollections(prev => prev.map(c => c.id === tempId ? { ...c, id: backendCol.id } : c));
          setActiveCollectionId(backendCol.id);
        }
      }).catch(console.warn);
    }

    return created;
  }, []);

  // Delete Collection
  const deleteCollection = useCallback((id: string) => {
    setCollections(prev => {
      const remaining = prev.filter(c => c.id !== id);
      if (activeCollectionId === id && remaining.length > 0) {
        setActiveCollectionId(remaining[0].id);
      }
      return remaining;
    });

    if (isElectron()) {
      electronBridge.deleteCollection(id).catch(console.warn);
    }
  }, [activeCollectionId]);

  // Toggle Wallpaper in Collection
  const toggleWallpaperInCollection = useCallback((wallpaperId: string, collectionId: string) => {
    const wpObj = wallpapers.find(w => w.id === wallpaperId);

    setCollections(prev =>
      prev.map(col => {
        if (col.id === collectionId) {
          const exists = col.wallpaperIds.includes(wallpaperId);
          const nextIds = exists
            ? col.wallpaperIds.filter(id => id !== wallpaperId)
            : [...col.wallpaperIds, wallpaperId];

          if (isElectron() && wpObj) {
            if (exists) {
              electronBridge.removeCollectionItem(collectionId, wallpaperId).catch(console.warn);
            } else {
              electronBridge.addCollectionItem(collectionId, wpObj).catch(console.warn);
            }
          }

          return { ...col, wallpaperIds: nextIds };
        }
        return col;
      })
    );
  }, [wallpapers]);

  // Apply Collection (Cycle or Shuffle)
  const applyCollection = useCallback(async (collectionId: string, mode: 'random' | 'next' = 'next') => {
    if (isElectron()) {
      const res = await electronBridge.applyCollection(collectionId, mode);
      if (res) {
        const wp: Wallpaper = {
          id: res.id,
          title: res.title || 'Collection Wallpaper',
          imageUrl: res.imageUrl || res.thumbUrl,
          sourceCredit: res.creditUrl || res.photographer || 'AuraDesk',
          category: 'nature',
          width: res.width || 3840,
          height: res.height || 2160,
          aspectRatio: '16:9',
          tags: ['collection'],
        };
        setCurrentWallpaper(wp);
        return res;
      }
    }

    // Fallback
    const col = collections.find(c => c.id === collectionId);
    if (col && col.wallpaperIds.length > 0) {
      const targetWp = wallpapers.find(w => w.id === col.wallpaperIds[0]);
      if (targetWp) applyWallpaper(targetWp, 'scheduler');
    }
  }, [collections, wallpapers, applyWallpaper]);

  // Export Collection to JSON
  const exportCollection = useCallback(async (collectionId: string) => {
    return electronBridge.exportCollection(collectionId);
  }, []);

  // Add Custom Wallpaper
  const addCustomWallpaper = useCallback((newWall: Omit<Wallpaper, 'id'>) => {
    const created: Wallpaper = {
      ...newWall,
      id: 'custom-' + Date.now(),
      isCustom: true,
    };
    setWallpapers(prev => [created, ...prev]);
    toggleWallpaperInCollection(created.id, activeCollectionId);
    return created;
  }, [activeCollectionId, toggleWallpaperInCollection]);

  // Native Local Wallpaper Picker
  const pickNativeLocalWallpapers = useCallback(async () => {
    const picked = await electronBridge.pickLocalWallpapers();
    if (picked && picked.length > 0) {
      const added: Wallpaper[] = picked.map(p => ({
        id: p.id,
        title: p.title || 'Local Wallpaper',
        imageUrl: p.imageUrl,
        category: 'minimalist' as const,
        sourceCredit: 'Local Disk: ' + p.localPath,
        width: 3840,
        height: 2160,
        aspectRatio: '16:9',
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
    updateSettings({ glassTheme: theme });
  }, [updateSettings]);

  const setScalingMode = useCallback((mode: ScalingMode) => {
    setScalingModeState(mode);
    updateSettings({ scalingMode: mode });
  }, [updateSettings]);

  const minimizeAppToTray = useCallback(() => {
    electronBridge.minimizeToTray();
  }, []);

  const quitApplication = useCallback(() => {
    electronBridge.quitApp();
  }, []);

  // Timer countdown
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
        applyWallpaper,
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
        isTrayOpen,
        setIsTrayOpen,
        isNativeElectron: isElectron(),
        pickNativeLocalWallpapers,
        minimizeAppToTray,
        quitApplication,
        currentTimeString,
        // Backward compatibility stubs for UI components
        rules: [],
        calendarEvents: [],
        weatherCondition: 'clear',
        setWeatherCondition: () => {},
        simulatedHour: 14,
        setSimulatedHour: () => {},
        isLiveClock: true,
        setIsLiveClock: () => {},
        timeOfDay: 'day',
        activeRuleStatus: { reason: 'Active Rotation', description: 'Scheduled rotation active' },
        toggleRule: () => {},
        addRule: () => {},
        deleteRule: () => {},
        addCalendarEvent: () => {},
        deleteCalendarEvent: () => {},
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
