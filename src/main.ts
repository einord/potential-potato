import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'
import path from 'node:path'
import started from 'electron-squirrel-startup'
import { currentSmbSettings, ensureSmbSettingsFile, loadSmbSettings, smbSettingsFile } from './settings' // Ensure settings are initialized
import { watch } from 'chokidar'
import { loadSmbImage, remoteSettings } from './settings/loadimages'
import { UniversalUpdater } from './updater/universal-updater'

let refreshTimer: NodeJS.Timeout | string | number | undefined

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow : BrowserWindow | undefined = undefined
let timeout = 10
let appUpdater: UniversalUpdater | undefined = undefined
let updaterInterval: NodeJS.Timeout | undefined
type CachedImage = { dataUrl: string; settings: unknown; fileName: string }
let cachedImageData: CachedImage | undefined = undefined
let lastRemoteSettingsJson: string | undefined

const createWindow = async () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
  // In production the preload is emitted at .vite/build/preload.js alongside main.js
  // Because __dirname resolves to .vite/build at runtime, reference the file in the same directory
  preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    // Load from .vite/build/renderer in production where index.html is emitted
    mainWindow.loadFile(path.join(__dirname, `../renderer/index.html`));
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // Ensure and load settings
  await ensureSmbSettingsFile()
  await loadSmbSettings()
  watchSmbSettingsFile(mainWindow)
  
  await loadNextImage()
  setRefreshTimer();

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('smb-settings-updated', currentSmbSettings)
    
  // Initialize auto-updater (only in production)
  if (!MAIN_WINDOW_VITE_DEV_SERVER_URL && mainWindow) {
      const currentVersion = app.getVersion();
      // Prefer electron-updater only for Linux AppImage builds
      if (process.platform === 'linux' && process.env.APPIMAGE) {
        setupElectronUpdater();
      } else {
        // Fallback to existing universal updater for other targets (including .deb installs)
        appUpdater = new UniversalUpdater(mainWindow, currentVersion, 'einord', 'potential-potato');
      }
    }
  })
};

// IPC handlers
ipcMain.handle('get-cached-image', () => {
  console.log('Cached image requested, returning:', cachedImageData ? 'cached data' : 'no cache');
  return cachedImageData;
});

ipcMain.handle('get-app-version', () => {
  try {
    return app.getVersion();
  } catch {
    return 'unknown';
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // Cleanup updater
  if (appUpdater) {
    appUpdater.dispose();
    appUpdater = undefined;
  }
  if (updaterInterval) {
    clearInterval(updaterInterval)
    updaterInterval = undefined
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Watch for changes in the settings file
function watchSmbSettingsFile(mainWindow: BrowserWindow) {
  const watcher = watch(smbSettingsFile, { ignoreInitial: true });
  watcher.on('change', async () => {
      console.log(`SMB settings file changed: ${smbSettingsFile}. Reloading SMB settings...`);
      await loadSmbSettings();
      setRefreshTimer();
      mainWindow.webContents.send('smb-settings-updated', currentSmbSettings);
  });
}

function getTimeoutFromRefreshRate(refreshRate: number | undefined): number {
  return (refreshRate || 10) * 1000
}

function setRefreshTimer() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  timeout = getTimeoutFromRefreshRate(remoteSettings?.refreshRate)
  refreshTimer = setInterval(loadNextImage, timeout)
}

async function loadNextImage() {
  if (!mainWindow || mainWindow.isDestroyed()) return

  console.log(`Refreshing image...`);
  try {
    // Pass current filename to avoid loading the same image twice
    const currentFileName = cachedImageData?.fileName;
    const imageData = await loadSmbImage(currentFileName);
    console.log('Random image loaded from SMB');
    if (imageData) {
      // Cache the image data
      cachedImageData = imageData;

      // Emit remote settings update if changed
      try {
        const settingsJson = JSON.stringify(imageData.settings ?? {});
        if (settingsJson !== lastRemoteSettingsJson) {
          lastRemoteSettingsJson = settingsJson;
          mainWindow.webContents.send('remote-settings-updated', imageData.settings);
        }
      } catch {
        // ignore JSON stringify errors
      }
      
      // Send the image data to the renderer process
      mainWindow.webContents.send('new-image', imageData);
    }

    if(getTimeoutFromRefreshRate(remoteSettings?.refreshRate) != timeout) {
      console.log('Remote timer settings changed, resetting refresh timer.')
      setRefreshTimer()
    }
  } catch (error) {
    console.error('Error loading next image:', error);
  }
}

// Electron-updater setup for Linux AppImage
function setupElectronUpdater() {
  // Configure logger to use electron-log if desired
  autoUpdater.logger = log;
  try { log.transports.file.level = 'info'; } catch { /* ignore logger setup errors */ }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => mainWindow?.webContents.send('update-checking'));
  autoUpdater.on('update-available', (info: { version: string }) => mainWindow?.webContents.send('update-available', { version: info.version }));
  autoUpdater.on('update-not-available', (info: { version: string }) => mainWindow?.webContents.send('update-not-available', { version: info.version }));
  autoUpdater.on('download-progress', (progress: unknown) => mainWindow?.webContents.send('update-download-progress', progress));
  autoUpdater.on('update-downloaded', () => {
    // Install shortly after download completes; app relaunch handled by updater
    setTimeout(() => {
      autoUpdater.quitAndInstall(false, true);
    }, 2000);
  });
  autoUpdater.on('error', (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    mainWindow?.webContents.send('update-error', msg);
  });

  // Initial check and periodic checks hourly (app runs 24/7)
  autoUpdater.checkForUpdatesAndNotify().catch((err: unknown) => {
    console.debug('autoUpdater initial check failed', err);
  });
  updaterInterval = setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err: unknown) => {
      console.debug('autoUpdater periodic check failed', err);
    });
  }, 60 * 60 * 1000);
}
