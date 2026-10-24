/**
 * AuraDesk Electron IPC Bridge
 * Provides typed, resilient communication between the React frontend and Electron main process.
 * Gracefully degrades when running in a standalone web browser environment.
 */

import { Wallpaper, AppSettings } from '../types/wallpaper';

export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.api && typeof window.api.invoke === 'function');
};

export const electronBridge = {
  isAvailable: isElectron,

  /**
   * Applies a wallpaper to the macOS / OS desktop
   */
  async applyWallpaper(
    wallpaper: Wallpaper,
    trigger: 'MANUAL' | 'ROTATION' | 'RULE' | 'CALENDAR' = 'MANUAL'
  ): Promise<{ success: boolean; appliedAt?: string; error?: string }> {
    if (!isElectron()) {
      return { success: true, appliedAt: new Date().toISOString() };
    }

    try {
      const payload = {
        wallpaper: {
          id: wallpaper.id,
          source: wallpaper.isCustom ? 'local' : 'online',
          title: wallpaper.title,
          description: wallpaper.category || '',
          imageUrl: wallpaper.imageUrl,
          thumbUrl: wallpaper.imageUrl,
          photographer: wallpaper.photographer || 'Unsplash Curated',
          creditUrl: wallpaper.sourceCredit || '',
          width: wallpaper.resolution?.width || 3840,
          height: wallpaper.resolution?.height || 2160,
          localPath: wallpaper.imageUrl.startsWith('file://') ? wallpaper.imageUrl.replace('file://', '') : undefined,
        },
        trigger,
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
};
