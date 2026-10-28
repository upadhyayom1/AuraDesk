// AuraDesk Core Domain Models

export type WallpaperSourceType = 'unsplash' | 'pexels' | 'local';

export interface Wallpaper {
  id: string; // 'unsplash:<id>' | 'pexels:<id>' | 'local:<uuid>'
  source: WallpaperSourceType;
  title: string;
  description?: string;
  imageUrl: string;
  thumbUrl: string;
  photographer: string;
  creditUrl: string;
  width: number;
  height: number;
  localPath?: string;
  cachedAt?: string;
}

export interface WallpaperCollection {
  id: string; // UUID
  name: string;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
  coverUrl?: string;
}

export interface CollectionItem {
  id: number;
  collectionId: string;
  wallpaperId: string;
  position: number;
  addedAt: string;
}

export type TriggerType = 'MANUAL' | 'ROTATION' | 'RULE' | 'CALENDAR';

export interface HistoryEntry {
  id?: number;
  wallpaperId: string;
  appliedAt: string;
  trigger: TriggerType;
  collectionId?: string;
  ruleId?: string;
  wallpaper?: Wallpaper;
}

export type RuleConditionType = 'TIME_RANGE' | 'WEATHER' | 'DAY_PART';

export interface PersonalizationRule {
  id: string;
  name: string;
  conditionType: RuleConditionType;
  conditionValue: string | Record<string, any>; // e.g. {"from":"18:00","to":"23:59"}
  collectionId: string;
  priority: number;
  enabled: boolean;
}

export interface RotationConfig {
  id?: number;
  enabled: boolean;
  intervalMinutes: number;
  shuffle: boolean;
  collectionIds: string[];
  lastRunAt?: string;
}

export interface CalendarBinding {
  id: string;
  matchType: 'KEYWORD' | 'EVENT_ID';
  matchValue: string;
  collectionId: string;
  priority: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  fetchedAt?: string;
}

export interface ContextSnapshot {
  now: string;
  weather?: {
    condition: string;
    tempC: number;
    isDay: boolean;
  };
  activeEvent?: CalendarEvent;
  isDay: boolean;
}

// Standard IPC Response Shape
export interface IPCResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: {
    code: 'VALIDATION' | 'NOT_FOUND' | 'RATE_LIMITED' | 'OFFLINE' | 'APPLY_FAILED' | 'AUTH_REQUIRED' | 'INTERNAL_ERROR';
    message: string;
  };
}

export interface AppSettingsData {
  rotationInterval: number;
  shuffleEnabled: boolean;
  autoAdaptEnabled: boolean;
  location: {
    lat?: number;
    lon?: number;
    city?: string;
  };
  launchOnStartup: boolean;
  sourcesEnabled: {
    unsplash: boolean;
    pexels: boolean;
  };
}
