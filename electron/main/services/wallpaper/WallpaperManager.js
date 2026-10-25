/**
 * WallpaperManager
 * The single class allowed to interact with the OS desktop wallpaper.
 * Handles screen geometries, Sharp scale & crop, preview caching, and history recording.
 */

const { app, screen, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const sharp = require('sharp');

class WallpaperManager {
  /**
   * @param {import('better-sqlite3').Database} db
   * @param {import('../../database/repositories/wallpaperRepo')} wallpaperRepo
   */
  constructor(db, wallpaperRepo) {
    this.db = db;
    this.wallpaperRepo = wallpaperRepo;
    this.currentWallpaper = null;
    this.lastAppliedAt = null;
    this.lastTrigger = null;

    const baseTemp = app ? app.getPath('temp') : (process.env.TEMP || '/tmp');
    this.tempDir = path.join(baseTemp, 'auradesk');

    const userData = app ? app.getPath('userData') : (process.env.APPDATA || path.join(process.env.HOME || '/tmp', '.auradesk'));
    this.appliedDir = path.join(userData, 'applied_wallpapers');
  }

  /**
   * Initializes temp cache directory and performs startup sweep of stale files
   */
  async init() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    if (!fs.existsSync(this.appliedDir)) {
      fs.mkdirSync(this.appliedDir, { recursive: true });
    }

    // Temp Sweeper: Clean up leftover temporary files on startup
    try {
      const files = fs.readdirSync(this.tempDir);
      for (const file of files) {
        if (file.startsWith('crop_') || file.startsWith('prev_')) {
          try {
            fs.unlinkSync(path.join(this.tempDir, file));
          } catch (e) {
            // Ignore in-use files
          }
        }
      }
    } catch (err) {
      console.warn('Temp sweep warning:', err.message);
    }

    // Restore last applied wallpaper from history if available
    this.restoreLastWallpaper();
  }

  /**
   * Restores the most recently applied wallpaper state from SQLite
   */
  restoreLastWallpaper() {
    try {
      const row = this.db.prepare(`
        SELECT rh.applied_at, rh.trigger, w.*
        FROM rotation_history rh
        JOIN wallpapers w ON rh.wallpaper_id = w.id
        ORDER BY rh.applied_at DESC
        LIMIT 1
      `).get();

      if (row) {
        this.currentWallpaper = this.wallpaperRepo._mapRow(row);
        this.lastAppliedAt = row.applied_at;
        this.lastTrigger = row.trigger;
      }
    } catch (err) {
      console.warn('Could not restore last wallpaper:', err.message);
    }
  }

  /**
   * Returns detected monitor geometries and scale factors
   * @returns {Array<{ id: number, width: number, height: number, scaleFactor: number, isPrimary: boolean }>}
   */
  getDisplays() {
    if (!screen) {
      return [{ id: 1, width: 1920, height: 1080, scaleFactor: 1, isPrimary: true }];
    }

    const primaryId = screen.getPrimaryDisplay() ? screen.getPrimaryDisplay().id : null;
    const allDisplays = screen.getAllDisplays();

    return allDisplays.map((d) => ({
      id: d.id,
      width: d.size.width,
      height: d.size.height,
      scaleFactor: d.scaleFactor || 1,
      isPrimary: d.id === primaryId
    }));
  }

  /**
   * Scales and crops an image buffer or file path to exact primary screen physical pixels
   * Uses Sharp with 'fit: cover' and 'position: attention'
   * @param {Buffer|string} input
   * @returns {Promise<string>} Path to temporary cropped file
   */
  async scaleAndCrop(input) {
    let targetWidth = 1920;
    let targetHeight = 1080;

    if (screen) {
      const primary = screen.getPrimaryDisplay();
      if (primary) {
        const factor = primary.scaleFactor || 1;
        targetWidth = Math.round(primary.size.width * factor);
        targetHeight = Math.round(primary.size.height * factor);
      }
    }

    const tempFilePath = path.join(this.tempDir, `crop_${crypto.randomUUID()}.jpg`);

    await sharp(input)
      .resize(targetWidth, targetHeight, {
        fit: 'cover',
        position: 'attention'
      })
      .jpeg({
        quality: 92,
        chromaSubsampling: '4:4:4'
      })
      .toFile(tempFilePath);

    return tempFilePath;
  }

  /**
   * Downloads or loads raw image buffer
   * @param {Object} wp
   * @returns {Promise<Buffer>}
   */
  async getImageBuffer(wp) {
    if (wp.source === 'local') {
      const localPath = wp.localPath || wp.imageUrl.replace(/^file:\/\//, '');
      if (!fs.existsSync(localPath)) {
        throw new Error(`Local file not found on disk: ${localPath}`);
      }
      return fs.promises.readFile(localPath);
    }

    // Online image (Unsplash / Pexels)
    const url = wp.imageUrl || wp.thumbUrl;
    if (!url) {
      throw new Error(`Wallpaper ${wp.id} has no valid image URL`);
    }

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'AuraDesk/1.0'
      }
    });

    return Buffer.from(response.data);
  }

  /**
   * Generates a cached preview image for the UI preview modal without touching OS wallpaper
   * @param {Object|string} wallpaperOrId
   * @returns {Promise<{ previewPath: string }>}
   */
  async preview(wallpaperOrId) {
    let wp = typeof wallpaperOrId === 'string'
      ? this.wallpaperRepo.getById(wallpaperOrId)
      : wallpaperOrId;

    if (!wp) {
      throw new Error('Wallpaper not found for preview');
    }

    const buffer = await this.getImageBuffer(wp);
    const previewTempPath = path.join(this.tempDir, `prev_${crypto.randomUUID()}.jpg`);

    // Scale to standard preview resolution (e.g. 1280 max width)
    await sharp(buffer)
      .resize(1280, 720, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(previewTempPath);

    return { previewPath: previewTempPath };
  }

  /**
   * Applies a wallpaper to the OS desktop with scale and crop, and records to history on success
   * @param {Object|string} wallpaperOrId
   * @param {'MANUAL'|'ROTATION'|'RULE'|'CALENDAR'} [trigger='MANUAL']
   * @param {string} [collectionId]
   * @param {string} [ruleId]
   * @returns {Promise<{ ok: boolean, appliedAt: string }>}
   */
  async apply(wallpaperOrId, trigger = 'MANUAL', collectionId = null, ruleId = null) {
    let wp = typeof wallpaperOrId === 'string'
      ? this.wallpaperRepo.getById(wallpaperOrId)
      : wallpaperOrId;

    if (!wp) {
      throw new Error(`Wallpaper not found: ${wallpaperOrId}`);
    }

    // 1. Ensure metadata is stored in SQLite
    this.wallpaperRepo.upsert(wp);

    // 2. Fetch image buffer
    const inputBuffer = await this.getImageBuffer(wp);

    // 3. Scale and crop to physical display dimensions and write persistently
    const sanitizedId = String(wp.id || 'wp').replace(/[^a-zA-Z0-9_-]/g, '_');
    const persistentFilePath = path.join(this.appliedDir, `active_${sanitizedId}_${Date.now()}.jpg`);

    let targetWidth = 1920;
    let targetHeight = 1080;
    if (screen) {
      const primary = screen.getPrimaryDisplay();
      if (primary) {
        const factor = primary.scaleFactor || 1;
        targetWidth = Math.round(primary.size.width * factor);
        targetHeight = Math.round(primary.size.height * factor);
      }
    }

    await sharp(inputBuffer)
      .resize(targetWidth, targetHeight, {
        fit: 'cover',
        position: 'attention'
      })
      .jpeg({
        quality: 95,
        chromaSubsampling: '4:4:4'
      })
      .toFile(persistentFilePath);

    let setWallpaperFn = null;
    try {
      // 4. Dynamically load ESM wallpaper module
      const wallpaperModule = await import('wallpaper');
      setWallpaperFn = wallpaperModule.setWallpaper || wallpaperModule.default?.setWallpaper;
      if (!setWallpaperFn) {
        throw new Error('wallpaper module does not expose setWallpaper function');
      }

      // 5. Set real OS desktop wallpaper
      await setWallpaperFn(persistentFilePath, { screen: 'all', scale: 'auto' });
      console.log(`[WallpaperManager] Set system desktop wallpaper: ${persistentFilePath}`);
    } catch (err) {
      // Fallback on macOS using AppleScript / osascript if module has permission or path issues
      if (process.platform === 'darwin') {
        try {
          const { promisify } = require('util');
          const childProcess = require('child_process');
          const execFile = promisify(childProcess.execFile);
          const script = `tell application "System Events" to tell every desktop to set picture to "${persistentFilePath}"`;
          await execFile('osascript', ['-e', script]);
          console.log(`[WallpaperManager] Set desktop wallpaper via macOS osascript fallback: ${persistentFilePath}`);
        } catch (osaErr) {
          throw new Error(`Failed to apply OS wallpaper: ${err.message} (fallback: ${osaErr.message})`);
        }
      } else {
        throw new Error(`Failed to apply OS wallpaper: ${err.message}`);
      }
    }

    // 6. Clean up older applied files, retaining the newest 3 so OS always has valid file handles
    try {
      const allFiles = fs.readdirSync(this.appliedDir)
        .filter(f => f.startsWith('active_'))
        .map(f => ({ name: f, time: fs.statSync(path.join(this.appliedDir, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time);

      for (let i = 3; i < allFiles.length; i++) {
        try {
          fs.unlinkSync(path.join(this.appliedDir, allFiles[i].name));
        } catch (e) {}
      }
    } catch (cleanErr) {
      console.warn('[WallpaperManager] Prune warning:', cleanErr.message);
    }

    // 7. Record History ONLY upon success
    const appliedAt = new Date().toISOString();
    try {
      this.db.prepare(`
        INSERT INTO rotation_history (wallpaper_id, applied_at, trigger, collection_id, rule_id)
        VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?)
      `).run(wp.id, trigger, collectionId, ruleId);
    } catch (err) {
      console.warn('History recording error:', err.message);
    }

    // 8. Update active state
    this.currentWallpaper = wp;
    this.lastAppliedAt = appliedAt;
    this.lastTrigger = trigger;

    // 9. Compliance: Ping Unsplash download location if applicable
    if (wp.source === 'unsplash' && wp.downloadLocation) {
      axios.get(wp.downloadLocation, {
        headers: {
          Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
        }
      }).catch((e) => console.warn('Unsplash download track error:', e.message));
    }

    return {
      ok: true,
      appliedAt
    };
  }

  /**
   * Returns metadata of currently applied wallpaper
   */
  getCurrent() {
    return {
      wallpaper: this.currentWallpaper,
      appliedAt: this.lastAppliedAt,
      trigger: this.lastTrigger || 'MANUAL'
    };
  }

  /**
   * Native OS file dialog for picking local wallpaper files
   * @param {BrowserWindow} [parentWindow]
   * @returns {Promise<Array<Object>>} Registered wallpapers
   */
  async pickLocalFiles(parentWindow = null) {
    const result = await dialog.showOpenDialog(parentWindow, {
      title: 'Import Local Wallpapers into AuraDesk',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }
      ]
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return [];
    }

    const registered = [];

    for (const filePath of result.filePaths) {
      try {
        const metadata = await sharp(filePath).metadata();
        const baseName = path.basename(filePath, path.extname(filePath));
        const id = `local:${crypto.randomUUID()}`;

        const wpRecord = {
          id,
          source: 'local',
          title: baseName || 'Local Wallpaper',
          description: `Imported from ${filePath}`,
          imageUrl: `file://${filePath}`,
          thumbUrl: `file://${filePath}`,
          photographer: 'Local',
          creditUrl: '',
          width: metadata.width || 1920,
          height: metadata.height || 1080,
          localPath: filePath
        };

        const saved = this.wallpaperRepo.upsert(wpRecord);
        registered.push(saved);
      } catch (err) {
        console.error(`Failed to register local file ${filePath}:`, err.message);
      }
    }

    return registered;
  }
}

module.exports = WallpaperManager;
