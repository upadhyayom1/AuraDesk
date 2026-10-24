/**
 * SystemTrayController
 * Manages the native system tray icon and context menu.
 * Keeps AuraDesk background automation alive when the main window is closed.
 */

const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const fs = require('fs');

class SystemTrayController {
  /**
   * @param {Object} options
   * @param {Function} options.getMainWindow - Callback returning BrowserWindow instance
   * @param {Object} [options.scheduler] - RotationScheduler instance
   * @param {Object} [options.appSettings] - AppSettings instance
   * @param {Function} options.onQuit - Clean shutdown handler
   */
  constructor({ getMainWindow, scheduler = null, appSettings = null, onQuit }) {
    this.getMainWindow = getMainWindow;
    this.scheduler = scheduler;
    this.appSettings = appSettings;
    this.onQuit = onQuit;
    this.tray = null;
    this.isAutoAdaptEnabled = true;
  }

  /**
   * Resolves a valid NativeImage for the system tray icon
   * @returns {import('electron').NativeImage}
   */
  _getTrayIcon() {
    const iconPath = path.join(__dirname, '../../../build/icons/tray.png');
    if (fs.existsSync(iconPath)) {
      return nativeImage.createFromPath(iconPath);
    }

    // Fallback: 16x16 embedded base64 icon
    const fallbackBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA0SURBVDhPY/wPBAwUACYGKsBAM/z/j4YZGBgY4BpAGoYNDDYwGBhgmqEG/EfDDNTXgJ9hAB9nEgn73tKAAAAAAElFTkSuQmCC';
    return nativeImage.createFromBuffer(Buffer.from(fallbackBase64, 'base64'));
  }

  /**
   * Initializes the tray icon, context menu, and click handlers.
   */
  init() {
    if (this.tray) return;

    const icon = this._getTrayIcon();
    this.tray = new Tray(icon);
    this.tray.setToolTip('AuraDesk — The Reality Weaver');

    this.updateMenu();

    // Click on tray icon restores and focuses the main window
    this.tray.on('click', () => {
      this.restoreWindow();
    });

    this.tray.on('double-click', () => {
      this.restoreWindow();
    });
  }

  /**
   * Updates the tray context menu based on current runtime state.
   */
  updateMenu() {
    if (!this.tray) return;

    const isSchedulerRunning = this.scheduler ? this.scheduler.enabled : true;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'AuraDesk',
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Next Wallpaper',
        click: async () => {
          if (this.scheduler && typeof this.scheduler.rotateNow === 'function') {
            try {
              await this.scheduler.rotateNow('MANUAL');
            } catch (err) {
              console.warn('[SystemTray] Next wallpaper error:', err.message);
            }
          }
        }
      },
      {
        label: isSchedulerRunning ? 'Pause Rotation' : 'Resume Rotation',
        click: async () => {
          if (this.scheduler) {
            if (this.scheduler.enabled) {
              this.scheduler.pause();
            } else {
              this.scheduler.resume();
            }
            this.updateMenu();
          }
        }
      },
      {
        label: this.isAutoAdaptEnabled ? 'Auto-Adaptation: ON' : 'Auto-Adaptation: OFF',
        type: 'checkbox',
        checked: this.isAutoAdaptEnabled,
        click: async (item) => {
          this.isAutoAdaptEnabled = item.checked;
          if (this.appSettings) {
            await this.appSettings.save({ autoAdaptEnabled: item.checked });
          }
          this.updateMenu();
        }
      },
      { type: 'separator' },
      {
        label: 'Open AuraDesk',
        click: () => {
          this.restoreWindow();
        }
      },
      {
        label: 'Quit AuraDesk',
        click: async () => {
          if (typeof this.onQuit === 'function') {
            await this.onQuit();
          } else {
            app.quit();
          }
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Restores and focuses the main window.
   */
  restoreWindow() {
    const win = typeof this.getMainWindow === 'function' ? this.getMainWindow() : this.getMainWindow;
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  }

  /**
   * Attaches scheduler reference once scheduler is initialized
   * @param {Object} scheduler
   */
  setScheduler(scheduler) {
    this.scheduler = scheduler;
    this.updateMenu();
  }

  /**
   * Destroys the tray icon during clean shutdown.
   */
  destroy() {
    if (this.tray && !this.tray.isDestroyed()) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

module.exports = SystemTrayController;
