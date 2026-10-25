export type ScalingMode = 'fill' | 'fit-blur' | 'center' | 'stretch';

export type TimeOfDay = 'dawn' | 'day' | 'goldenHour' | 'night';

export type WeatherCondition = 'clear' | 'clouds' | 'rain' | 'thunderstorm' | 'snow' | 'mist';

export type WallpaperCategory = 
  | 'all'
  | 'nature'
  | 'minimalist'
  | 'cyberpunk'
  | 'architecture'
  | 'space'
  | 'abstract'
  | 'moody';

export interface Wallpaper {
  id: string;
  title: string;
  imageUrl: string;
  thumbUrl?: string;
  sourceCredit: string;
  sourceUrl?: string;
  category: WallpaperCategory;
  width: number;
  height: number;
  aspectRatio: string;
  tags: string[];
  recommendedTime?: TimeOfDay[];
  recommendedWeather?: WeatherCondition[];
  isCustom?: boolean;
  photographer?: string;
  creditUrl?: string;
  source?: 'unsplash' | 'pexels' | 'local';
  description?: string;
}

export interface WallpaperCollection {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  wallpaperIds: string[];
  icon?: string;
  isSystem?: boolean;
}

export interface HistoryEntry {
  id: string;
  wallpaperId: string;
  wallpaperTitle: string;
  imageUrl: string;
  sourceCredit: string;
  appliedAt: string;
  reason: 'manual' | 'scheduler' | 'weather' | 'time' | 'calendar';
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // "09:00"
  endTime: string;   // "11:00"
  targetCollectionId: string;
  category: 'work' | 'meeting' | 'relaxation' | 'creative';
  active?: boolean;
}

export interface PersonalizationRule {
  id: string;
  name: string;
  conditionType: 'time' | 'weather' | 'calendar';
  conditionValue: string; // e.g. "rain", "night", "work"
  targetCollectionId: string;
  priority: number; // 1 (highest) to 10
  enabled: boolean;
}

export type GlassTheme = 'whitish' | 'blackish';

export interface AppSettings {
  rotationIntervalMinutes: number;
  shuffleEnabled: boolean;
  autoAdaptEnabled: boolean;
  scalingMode: ScalingMode;
  avoidRecentWallpapers: boolean;
  recentHistoryLimit: number;
  glassTheme: GlassTheme;
  darkMode: boolean;
  systemTrayMinimized: boolean;
}
