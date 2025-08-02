import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { currentSettings, ensureSettingsFile, loadSettings, settingsFile } from './settings'; // Ensure settings are initialized
import chokidar from 'chokidar';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Ensure and load settings
  ensureSettingsFile().then(() => {
    loadSettings()
    watchSettingsFile(mainWindow)
  })

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('settings-updated', currentSettings)
  })

  // // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
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
export function watchSettingsFile(mainWindow: BrowserWindow) {
  const watcher = chokidar.watch(settingsFile, { ignoreInitial: true });
  watcher.on('change', async () => {
      console.log(`Settings file changed: ${settingsFile}. Reloading settings...`);
      await loadSettings();
      mainWindow.webContents.send('settings-updated', currentSettings);
  });
}