import { app, BrowserWindow, Menu, ipcMain } from 'electron'
import { join } from 'node:path'
import { Updater } from './updater'
import { cachedImageData, ensureSmbSettingsFile, loadNextImage, loadSmbSettings, watchSmbSettingsFile } from './load-images'

let mainWindow: BrowserWindow | null = null
let updater: Updater | null = null

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    fullscreen: app.isPackaged, // Only automatically fullscreen in packaged app
    webPreferences: {
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
    },
  })

  // Initialize updater once the window exists
  updater = new Updater(mainWindow, app.getVersion())

  // IPC: expose application version to renderer
  ipcMain.handle('get-version', () => app.getVersion())

  // Create application menu with a manual update check item
  const template = [
    {
      label: 'Potential Potato',
      submenu: [
        {
          label: 'Sök efter uppdatering nu',
          click: () => updater?.checkNow(),
        },
        { type: 'separator' },
        { role: 'quit', label: 'Avsluta' },
      ],
    },
  ] as Electron.MenuItemConstructorOptions[]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    await mainWindow.loadFile(join(__dirname, '../../dist/index.html'))
  }

  // Ensure and load settings
  await ensureSmbSettingsFile()
  await loadSmbSettings()
  watchSmbSettingsFile(mainWindow)
  
  await loadNextImage(mainWindow)
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  // Ensure timers are cleared
  updater?.dispose()
})

app.whenReady().then(async () => {
  // IPC for renderer to fetch current app version
  ipcMain.handle('get-app-version', () => app.getVersion())

  ipcMain.handle('get-cached-image', () => {
    console.log('Cached image requested, returning:', cachedImageData ? 'cached data' : 'no cache');
    return cachedImageData;
  });

  await createWindow()
})
