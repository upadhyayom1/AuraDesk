import { Wallpaper, WallpaperCollection, PersonalizationRule, CalendarEvent } from '../types/wallpaper';

/**
 * Empty static collections and library references.
 * In AuraDesk, all wallpapers, collections, history, rules, and settings are strictly
 * backend-driven by SQLite and live discovery providers (Unsplash & Pexels).
 */
export const CURATED_WALLPAPERS: Wallpaper[] = [];
export const DEFAULT_COLLECTIONS: WallpaperCollection[] = [];
export const DEFAULT_RULES: PersonalizationRule[] = [];
export const DEFAULT_CALENDAR_EVENTS: CalendarEvent[] = [];
