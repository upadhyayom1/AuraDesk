/**
 * RotationScheduler
 * Single coordinated wallpaper rotation engine driven by a 1-minute node-cron tick.
 * Features re-entrancy lock (isRotating), no-repeat window auditing, and real-time push events.
 */

const cron = require('node-cron');

class RotationScheduler {
  /**
   * @param {Object} options
   * @param {import('../../database/repositories/rotationConfigRepo')} options.rotationConfigRepo
   * @param {import('../../database/repositories/rotationHistoryRepo')} options.rotationHistoryRepo
   * @param {import('../../database/repositories/collectionsRepo')} options.collectionsRepo
   * @param {import('../wallpaper/WallpaperManager')} options.wallpaperManager
   * @param {Object} [options.personalizationEngine]
   * @param {Function} [options.getMainWindow]
   */
  constructor({
    rotationConfigRepo,
    rotationHistoryRepo,
    collectionsRepo,
    wallpaperManager,
    personalizationEngine = null,
    getMainWindow = null
  }) {
    this.rotationConfigRepo = rotationConfigRepo;
    this.rotationHistoryRepo = rotationHistoryRepo;
    this.collectionsRepo = collectionsRepo;
    this.wallpaperManager = wallpaperManager;
    this.personalizationEngine = personalizationEngine;
    this.getMainWindow = getMainWindow;

    // Runtime configuration state
    this.enabled = true;
    this.intervalMinutes = 30;
    this.shuffle = false;
    this.collectionIds = [];
    this.lastRunAt = null;
    this.lastWallpaperId = null;

    // Re-entrancy guard
    this.isRotating = false;

    // Cron job handle
    this.cronJob = null;
  }

  /**
   * Initializes scheduler, restores state from database, and starts the 1-minute cron job.
   */
  async init() {
    this.restoreState();

    // Start 1-minute cron tick: '* * * * *'
    if (!this.cronJob) {
      this.cronJob = cron.schedule('* * * * *', () => {
        this.tick().catch((err) => {
          console.error('[RotationScheduler] Error during scheduled tick:', err.message);
        });
      });
    }

    console.log(`[RotationScheduler] Initialized (Interval: ${this.intervalMinutes}m, Enabled: ${this.enabled}, Collections: ${this.collectionIds.length}).`);
  }

  /**
   * Restores persisted schedule and history state from SQLite.
   */
  restoreState() {
    const config = this.rotationConfigRepo.getConfig();
    if (config) {
      this.enabled = config.enabled;
      this.intervalMinutes = Math.max(1, config.intervalMinutes || 30);
      this.shuffle = config.shuffle;
      this.collectionIds = config.collectionIds || [];
      this.lastRunAt = config.lastRunAt || null;
    }

    const lastEntry = this.rotationHistoryRepo.getLastEntry();
    if (lastEntry) {
      this.lastWallpaperId = lastEntry.wallpaperId;
      if (!this.lastRunAt) {
        this.lastRunAt = lastEntry.appliedAt;
      }
    }
  }

  /**
   * Calculates the projected ISO timestamp for the next rotation run.
   * @returns {string|null}
   */
  getNextRunAt() {
    if (!this.enabled) return null;
    const baseTime = this.lastRunAt ? new Date(this.lastRunAt).getTime() : Date.now();
    const nextTime = baseTime + (this.intervalMinutes * 60 * 1000);
    return new Date(nextTime).toISOString();
  }

  /**
   * Broadcasts rotation:state event to the renderer.
   * @private
   */
  _broadcastState() {
    const win = typeof this.getMainWindow === 'function' ? this.getMainWindow() : this.getMainWindow;
    if (win && win.webContents && !win.isDestroyed()) {
      win.webContents.send('rotation:state', {
        enabled: this.enabled,
        intervalMinutes: this.intervalMinutes,
        shuffle: this.shuffle,
        collectionIds: this.collectionIds,
        lastRunAt: this.lastRunAt,
        nextRunAt: this.getNextRunAt(),
        isRotating: this.isRotating
      });
    }
  }

  /**
   * Periodic 1-minute tick handler.
   */
  async tick() {
    if (!this.enabled || this.isRotating) {
      this._broadcastState();
      return;
    }

    // Refresh lastRunAt from database
    const config = this.rotationConfigRepo.getConfig();
    if (config) {
      this.lastRunAt = config.lastRunAt;
      this.intervalMinutes = config.intervalMinutes;
    }

    let isDue = false;
    if (!this.lastRunAt) {
      // If never run before, trigger on first eligible tick
      isDue = true;
    } else {
      const elapsedMinutes = (Date.now() - new Date(this.lastRunAt).getTime()) / 60000;
      if (elapsedMinutes >= this.intervalMinutes) {
        isDue = true;
      }
    }

    if (isDue) {
      await this.rotateNow('ROTATION');
    } else {
      this._broadcastState();
    }
  }

  /**
   * Collects all wallpapers from currently active collections.
   * @private
   * @returns {Array<{ wallpaper: Object, collectionId: string }>}
   */
  _getActiveWallpapers() {
    if (!Array.isArray(this.collectionIds) || this.collectionIds.length === 0) {
      return [];
    }

    const items = [];
    for (const colId of this.collectionIds) {
      const colData = this.collectionsRepo.getById(colId);
      if (colData && Array.isArray(colData.items)) {
        for (const wp of colData.items) {
          items.push({
            wallpaper: wp,
            collectionId: colId
          });
        }
      }
    }

    return items;
  }

  /**
   * Selects the next wallpaper adhering to the no-repeat rule:
   * N = min(10, collection size - 1)
   * @private
   * @param {Array<{ wallpaper: Object, collectionId: string }>} pool
   * @returns {{ wallpaper: Object, collectionId: string }|null}
   */
  _pickNextWallpaper(pool) {
    if (!pool || pool.length === 0) return null;
    if (pool.length === 1) return pool[0];

    // Compute no-repeat window N = min(10, total - 1)
    const n = Math.min(10, pool.length - 1);
    const recentIds = this.rotationHistoryRepo.getRecentIds(n);

    // Exclude recent IDs from candidates
    let candidates = pool.filter((item) => !recentIds.includes(item.wallpaper.id));

    // If all candidates excluded (edge case), fall back to full pool
    if (candidates.length === 0) {
      candidates = pool;
    }

    if (this.shuffle) {
      const randomIndex = Math.floor(Math.random() * candidates.length);
      return candidates[randomIndex];
    }

    // Sequential mode: Pick next candidate circularly following last applied wallpaper
    if (this.lastWallpaperId) {
      const lastIndex = pool.findIndex((item) => item.wallpaper.id === this.lastWallpaperId);
      if (lastIndex !== -1) {
        for (let i = 1; i <= pool.length; i++) {
          const nextIndex = (lastIndex + i) % pool.length;
          const candidateMatch = candidates.find((c) => c.wallpaper.id === pool[nextIndex].wallpaper.id);
          if (candidateMatch) {
            return candidateMatch;
          }
        }
      }
    }

    return candidates[0];
  }

  /**
   * Triggers an immediate wallpaper rotation step.
   * Protected with the isRotating re-entrancy lock.
   * @param {'MANUAL'|'ROTATION'|'RULE'|'CALENDAR'} [trigger='ROTATION']
   * @returns {Promise<Object|null>} Applied wallpaper record
   */
  async rotateNow(trigger = 'ROTATION') {
    // 1. Re-entrancy guard: prevent simultaneous apply collisions
    if (this.isRotating) {
      console.warn('[RotationScheduler] rotateNow called while rotation is already in progress; skipped.');
      return null;
    }

    this.isRotating = true;
    this._broadcastState();

    try {
      let targetWallpaper = null;
      let sourceCollectionId = null;

      // 2. Priority check: Personalization Engine (if active and returns a selection)
      if (this.personalizationEngine && typeof this.personalizationEngine.chooseWallpaper === 'function') {
        try {
          const contextDecision = await this.personalizationEngine.chooseWallpaper();
          if (contextDecision && contextDecision.wallpaper) {
            targetWallpaper = contextDecision.wallpaper;
            sourceCollectionId = contextDecision.collectionId || null;
          }
        } catch (e) {
          console.warn('[RotationScheduler] PersonalizationEngine evaluation skipped:', e.message);
        }
      }

      // 3. Collection rotation fallback
      if (!targetWallpaper) {
        const pool = this._getActiveWallpapers();
        if (pool.length === 0) {
          console.warn('[RotationScheduler] No active collections or collections are empty.');
          return null;
        }

        const picked = this._pickNextWallpaper(pool);
        if (!picked) {
          console.warn('[RotationScheduler] Could not pick candidate wallpaper from pool.');
          return null;
        }

        targetWallpaper = picked.wallpaper;
        sourceCollectionId = picked.collectionId;
      }

      // 4. Apply wallpaper via WallpaperManager
      const applyResult = await this.wallpaperManager.apply(
        targetWallpaper,
        trigger,
        sourceCollectionId
      );

      // 5. Update state upon successful application
      const appliedAt = applyResult.appliedAt || new Date().toISOString();
      this.lastRunAt = appliedAt;
      this.lastWallpaperId = targetWallpaper.id;

      this.rotationConfigRepo.touchLastRun(appliedAt);

      // 6. Broadcast push events to UI
      const win = typeof this.getMainWindow === 'function' ? this.getMainWindow() : this.getMainWindow;
      if (win && win.webContents && !win.isDestroyed()) {
        win.webContents.send('wallpaper:changed', {
          wallpaper: targetWallpaper,
          trigger,
          appliedAt
        });
      }

      this._broadcastState();
      return targetWallpaper;
    } catch (err) {
      console.error('[RotationScheduler] Failed to rotate wallpaper:', err.message);
      throw err;
    } finally {
      // 7. Release lock unconditionally
      this.isRotating = false;
      this._broadcastState();
    }
  }

  /**
   * Pauses the automatic rotation scheduler.
   * @returns {{ enabled: false }}
   */
  pause() {
    this.enabled = false;
    this.rotationConfigRepo.saveConfig({ enabled: false });
    this._broadcastState();
    return { enabled: false };
  }

  /**
   * Resumes the automatic rotation scheduler.
   * @returns {{ enabled: true }}
   */
  resume() {
    this.enabled = true;
    this.rotationConfigRepo.saveConfig({ enabled: true });
    this._broadcastState();
    return { enabled: true };
  }

  /**
   * Updates schedule parameters and persists to database.
   * @param {Object} patch
   */
  updateConfig(patch) {
    const saved = this.rotationConfigRepo.saveConfig(patch);
    this.enabled = saved.enabled;
    this.intervalMinutes = saved.intervalMinutes;
    this.shuffle = saved.shuffle;
    this.collectionIds = saved.collectionIds;
    this._broadcastState();
    return saved;
  }

  /**
   * Stops the node-cron scheduler during clean shutdown.
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
  }
}

module.exports = RotationScheduler;
