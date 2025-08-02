import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import started from 'electron-squirrel-startup'
import { currentSmbSettings, ensureSmbSettingsFile, loadSmbSettings, smbSettingsFile } from './settings' // Ensure settings are initialized
import chokidar from 'chokidar'
import { loadSmbImage, remoteSettings } from './settings/loadimages'

let refreshTimer: NodeJS.Timeout | string | number | undefined

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow : BrowserWindow | undefined = undefined
let timeout: number = 10

const createWindow = async () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
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
  })
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
function watchSmbSettingsFile(mainWindow: BrowserWindow) {
  const watcher = chokidar.watch(smbSettingsFile, { ignoreInitial: true });
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
    const imageData = await loadSmbImage();
    console.log('Random image loaded from SMB');
    if (imageData) {
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