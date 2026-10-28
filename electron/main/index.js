const { app, BrowserWindow } = require('electron');
const dotenv = require('dotenv');

// Load environment variables for main process
dotenv.config();

const WallpaperApplication = require('./services/app/WallpaperApplication');

const auraDeskApp = new WallpaperApplication();

app.whenReady().then(async () => {
  try {
    await auraDeskApp.start();
  } catch (err) {
    console.error('[AuraDesk] Critical startup failure:', err);
  }

  app.on('activate', () => {
    if (auraDeskApp.mainWindow) {
      auraDeskApp.mainWindow.show();
      auraDeskApp.mainWindow.focus();
    } else if (BrowserWindow.getAllWindows().length === 0) {
      auraDeskApp.createMainWindow();
    }
  });
});

// Prevent app termination when all windows are closed so system tray and background automation remain active
app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('before-quit', async (e) => {
  if (!auraDeskApp.isQuitting) {
    e.preventDefault();
    await auraDeskApp.shutdown();
  }
});

