/**
 * AuraDesk Electron IPC Bridge
 * Provides typed, resilient communication between the React frontend and Electron main process.
 * Connects directly to SQLite repositories, rotation scheduler, wallpaper manager, and system tray.
 * Gracefully degrades when running in a standalone web browser environment.
 */

import { Wallpaper, AppSettings } from '../types/wallpaper';

export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.api && typeof window.api.invoke === 'function');
};

export interface BackendCollectionSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  coverUrl?: string;
}

export interface BackendCollectionDetail {
  collection: BackendCollectionSummary;
  items: Array<{
    id: string;
    source: string;
    title: string;
    description?: string;
    imageUrl: string;
    thumbUrl: string;
    photographer?: string;
    creditUrl?: string;
    width?: number;
    height?: number;
    localPath?: string;
    collectionItemId: number;
    position: number;
  }>;
}

export interface BackendRotationConfig {
  id: number;
  enabled: boolean;
  intervalMinutes: number;
  shuffle: boolean;
  collectionIds: string[];
  lastRunAt: string | null;
}

export interface BackendHistoryEntry {
  id: number | string;
  wallpaperId: string;
  appliedAt: string;
  trigger: 'MANUAL' | 'ROTATION' | 'RULE' | 'CALENDAR';
  collectionId?: string;
  ruleId?: string;
  wallpaper?: {
    id: string;
    title: string;
    imageUrl: string;
    thumbUrl?: string;
    photographer?: string;
    creditUrl?: string;
    width?: number;
    height?: number;
    localPath?: string;
  };
}

export const electronBridge = {
  isAvailable: isElectron,

  // ==========================================
  // WALLPAPER ENGINE & DESKTOP DISPLAY
  // ==========================================

  /**
   * Applies a wallpaper to the macOS / OS desktop
   */
  async applyWallpaper(
    wallpaper: Wallpaper,
    trigger: 'MANUAL' | 'ROTATION' | 'RULE' | 'CALENDAR' = 'MANUAL',
    collectionId?: string
  ): Promise<{ success: boolean; appliedAt?: string; error?: string }> {
    if (!isElectron()) {
      return { success: true, appliedAt: new Date().toISOString() };
    }

    try {
      const isLocal = Boolean(
        wallpaper.isCustom ||
        wallpaper.imageUrl.startsWith('file://') ||
        wallpaper.imageUrl.startsWith('/') ||
        (wallpaper as any).localPath
      );
      const resolvedLocalPath = (wallpaper as any).localPath || (
        wallpaper.imageUrl.startsWith('file://')
          ? decodeURIComponent(wallpaper.imageUrl.replace('file://', ''))
          : (wallpaper.imageUrl.startsWith('/') ? wallpaper.imageUrl : undefined)
      );

      const payload = {
        wallpaper: {
          id: wallpaper.id,
          source: isLocal ? 'local' : 'online',
          title: wallpaper.title,
          description: wallpaper.category || '',
          imageUrl: wallpaper.imageUrl,
          thumbUrl: wallpaper.imageUrl,
          photographer: (wallpaper as any).photographer || 'AuraDesk Engine',
          creditUrl: wallpaper.sourceCredit || '',
          width: wallpaper.width || 3840,
          height: wallpaper.height || 2160,
          localPath: resolvedLocalPath,
        },
        trigger,
        collectionId,
      };

      const res = await window.api!.invoke('wallpaper:apply', payload);
      if (res && res.error) {
        console.warn('[AuraDesk Bridge] Apply warning:', res.error);
        return { success: false, error: res.error.message };
      }
      return { success: true, appliedAt: res?.data?.appliedAt };
    } catch (err: any) {
      console.warn('[AuraDesk Bridge] Error applying wallpaper via Electron:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Fetches current wallpaper recorded in SQLite
   */
  async getCurrentWallpaper(): Promise<any | null> {
    if (!isElectron()) return null;
    try {
      const res = await window.api!.invoke('wallpaper:current');
      return res?.data || null;
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to get current wallpaper:', err);
      return null;
    }
  },

  /**
   * Native OS file dialog for picking local desktop wallpapers
   */
  async pickLocalWallpapers(): Promise<Array<{ id: string; localPath: string; title: string; imageUrl: string }> | null> {
    if (!isElectron()) return null;
    try {
      const res = await window.api!.invoke('wallpaper:pickLocal');
      if (res?.data?.wallpapers) {
        return res.data.wallpapers;
      }
      return null;
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to pick local files:', err);
      return null;
    }
  },

  /**
   * Queries connected display monitors and resolutions
   */
  async getDisplays(): Promise<any[]> {
    if (!isElectron()) return [];
    try {
      const res = await window.api!.invoke('wallpaper:displays');
      return res?.data || [];
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to get displays:', err);
      return [];
    }
  },

  // ==========================================
  // COLLECTIONS (SANCTUM OF MEMORIES)
  // ==========================================

  /**
   * Lists all collections stored in SQLite
   */
  async listCollections(): Promise<BackendCollectionSummary[]> {
    if (!isElectron()) return [];
    try {
      const res = await window.api!.invoke('collection:list');
      return res?.data || [];
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to list collections:', err);
      return [];
    }
  },

  /**
   * Gets a specific collection and its ordered wallpaper items
   */
  async getCollection(id: string): Promise<BackendCollectionDetail | null> {
    if (!isElectron()) return null;
    try {
      const res = await window.api!.invoke('collection:get', { id });
      return res?.data || null;
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to get collection:', err);
      return null;
    }
  },

  /**
   * Creates a new named collection in SQLite
   */
  async createCollection(name: string): Promise<BackendCollectionSummary | null> {
    if (!isElectron()) return null;
    try {
      const res = await window.api!.invoke('collection:create', { name });
      return res?.data || null;
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to create collection:', err);
      return null;
    }
  },

  /**
   * Renames an existing collection in SQLite
   */
  async renameCollection(id: string, name: string): Promise<any | null> {
    if (!isElectron()) return null;
    try {
      const res = await window.api!.invoke('collection:rename', { id, name });
      return res?.data || null;
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to rename collection:', err);
      return null;
    }
  },

  /**
   * Deletes a collection in SQLite
   */
  async deleteCollection(id: string): Promise<boolean> {
    if (!isElectron()) return true;
    try {
      const res = await window.api!.invoke('collection:delete', { id });
      return Boolean(res?.data?.ok);
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to delete collection:', err);
      return false;
    }
  },

  /**
   * Adds a wallpaper into a collection in SQLite
   */
  async addCollectionItem(collectionId: string, wallpaper: Wallpaper): Promise<any | null> {
    if (!isElectron()) return null;
    try {
      const res = await window.api!.invoke('collection:addItem', {
        collectionId,
        wallpaperId: {
          id: wallpaper.id,
          source: wallpaper.isCustom ? 'local' : 'online',
          title: wallpaper.title,
          description: wallpaper.category || '',
          imageUrl: wallpaper.imageUrl,
          thumbUrl: wallpaper.imageUrl,
          photographer: (wallpaper as any).photographer || 'AuraDesk',
          creditUrl: wallpaper.sourceCredit || '',
          width: wallpaper.width || 3840,
          height: wallpaper.height || 2160,
          localPath: wallpaper.imageUrl.startsWith('file://') ? wallpaper.imageUrl.replace('file://', '') : undefined,
        }
      });
      return res?.data || null;
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to add item to collection:', err);
      return null;
    }
  },

  /**
   * Removes an item from a collection in SQLite
   */
  async removeCollectionItem(collectionId: string, itemId: number | string): Promise<boolean> {
    if (!isElectron()) return true;
    try {
      const res = await window.api!.invoke('collection:removeItem', { collectionId, itemId });
      return Boolean(res?.data?.ok);
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to remove item from collection:', err);
      return false;
    }
  },

  /**
   * Reorders items within a collection
   */
  async reorderCollection(collectionId: string, itemIds: string[]): Promise<boolean> {
    if (!isElectron()) return true;
    try {
      const res = await window.api!.invoke('collection:reorder', { collectionId, itemIds });
      return Boolean(res?.data?.ok);
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to reorder collection:', err);
      return false;
    }
  },

  /**
   * Applies a collection by cycling or shuffling to the desktop
   */
  async applyCollection(id: string, mode: 'random' | 'next' = 'next'): Promise<any | null> {
    if (!isElectron()) return null;
    try {
      const res = await window.api!.invoke('collection:apply', { id, mode });
      return res?.data || null;
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to apply collection:', err);
      return null;
    }
  },

  /**
   * Exports a collection to a native JSON vault
   */
  async exportCollection(id: string): Promise<any | null> {
    if (!isElectron()) return null;
    try {
      const res = await window.api!.invoke('collection:export', { id });
      return res?.data || null;
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to export collection:', err);
      return null;
    }
  },

  // ==========================================
  // ROTATION SCHEDULER & HISTORY (TIME STONE)
  // ==========================================

  /**
   * Requests immediate background rotation step
   */
  async rotateNow(): Promise<any | null> {
    if (!isElectron()) return null;
    try {
      const res = await window.api!.invoke('rotation:now');
      return res?.data || null;
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to rotate now:', err);
      return null;
    }
  },

  /**
   * Fetches active rotation configuration from backend
   */
  async getRotationConfig(): Promise<BackendRotationConfig | null> {
    if (!isElectron()) return null;
    try {
      const res = await window.api!.invoke('rotation:getConfig');
      return res?.data || null;
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to get rotation config:', err);
      return null;
    }
  },

  /**
   * Updates rotation configuration in the backend scheduler
   */
  async setRotationConfig(config: Partial<BackendRotationConfig>): Promise<BackendRotationConfig | null> {
    if (!isElectron()) return null;
    try {
      const res = await window.api!.invoke('rotation:setConfig', config);
      return res?.data || null;
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to set rotation config:', err);
      return null;
    }
  },

  /**
   * Pauses the backend rotation scheduler
   */
  async pauseRotation(): Promise<boolean> {
    if (!isElectron()) return true;
    try {
      const res = await window.api!.invoke('rotation:pause');
      return Boolean(res?.data?.paused);
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to pause rotation:', err);
      return false;
    }
  },

  /**
   * Resumes the backend rotation scheduler
   */
  async resumeRotation(): Promise<boolean> {
    if (!isElectron()) return true;
    try {
      const res = await window.api!.invoke('rotation:resume');
      return Boolean(res?.data?.resumed);
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to resume rotation:', err);
      return false;
    }
  },

  /**
   * Fetches paginated rotation history from SQLite
   */
  async getRotationHistory(limit = 30, offset = 0): Promise<BackendHistoryEntry[]> {
    if (!isElectron()) return [];
    try {
      const res = await window.api!.invoke('rotation:history', { limit, offset });
      return res?.data || [];
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to fetch rotation history:', err);
      return [];
    }
  },

  /**
   * Clears rotation history in SQLite
   */
  async clearRotationHistory(): Promise<boolean> {
    if (!isElectron()) return true;
    try {
      const res = await window.api!.invoke('rotation:clearHistory');
      return Boolean(res?.data?.ok);
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to clear history:', err);
      return false;
    }
  },

  // ==========================================
  // SETTINGS & WINDOW LIFECYCLE
  // ==========================================

  /**
   * Loads settings from SQLite
   */
  async getSettings(): Promise<any | null> {
    if (!isElectron()) return null;
    try {
      const res = await window.api!.invoke('settings:get');
      return res?.data || null;
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to get settings from Electron:', err);
      return null;
    }
  },

  /**
   * Synchronizes settings with SQLite settings store
   */
  async saveSettings(settingsPatch: Partial<AppSettings>): Promise<boolean> {
    if (!isElectron()) return true;
    try {
      await window.api!.invoke('settings:set', settingsPatch);
      return true;
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to save settings to Electron:', err);
      return false;
    }
  },

  /**
   * Hides the application window to system tray
   */
  async minimizeToTray(): Promise<void> {
    if (!isElectron()) return;
    try {
      await window.api!.invoke('app:minimizeToTray');
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to minimize window:', err);
    }
  },

  /**
   * Quits the application gracefully
   */
  async quitApp(): Promise<void> {
    if (!isElectron()) return;
    try {
      await window.api!.invoke('app:quit');
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to quit app:', err);
    }
  },

  /**
   * Opens external URL safely via default OS browser
   */
  async openExternal(url: string): Promise<void> {
    if (isElectron()) {
      try {
        await window.api!.invoke('app:openExternal', { url });
        return;
      } catch (err) {
        console.warn('[AuraDesk Bridge] Error opening external link via Electron:', err);
      }
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  // ==========================================
  // PUSH EVENT SUBSCRIPTIONS
  // ==========================================

  /**
   * Subscribes to wallpaper changes triggered from tray, scheduler, or background rotation
   */
  onWallpaperChanged(callback: (eventData: any) => void): (() => void) | undefined {
    if (!isElectron()) return undefined;
    try {
      return window.api!.on('wallpaper:changed', callback);
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to listen to wallpaper:changed:', err);
      return undefined;
    }
  },

  /**
   * Subscribes to rotation scheduler state updates (nextRunAt, isRunning, interval)
   */
  onRotationState(callback: (state: any) => void): (() => void) | undefined {
    if (!isElectron()) return undefined;
    try {
      return window.api!.on('rotation:state', callback);
    } catch (err) {
      console.warn('[AuraDesk Bridge] Failed to listen to rotation:state:', err);
      return undefined;
    }
  },
};
