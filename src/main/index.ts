import { app, BrowserWindow, Menu, ipcMain } from 'electron'
import { join } from 'node:path'
import { Updater } from './updater'
import { cachedImageData, ensureSmbSettingsFile, loadNextImage, loadSmbSettings, watchSmbSettingsFile, setEventWindow, markRendererReady, drainPendingErrors } from './load-images'

let mainWindow: BrowserWindow | null = null
let updater: Updater | null = null
let initialized = false

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

  // Set window for generic app events as early as possible
  setEventWindow(mainWindow)

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

  // IPC for renderer to tell main it is fully mounted and ready
  ipcMain.handle('renderer-ready', async () => {
    try {
      console.log('[main] renderer-ready received')
      // Mark renderer ready
      markRendererReady()
      // Flush any pending early app errors now that renderer can receive them
      const pending = drainPendingErrors()
      for (const err of pending) {
        mainWindow?.webContents.send('app-error', JSON.parse(JSON.stringify(err)))
      }
      // Ensure initialization has run (second trigger)
      await startInit()
    } catch (e) {
      console.error('Initialization after renderer-ready failed:', e)
    }
  })

  await createWindow()
})

async function startInit() {
  if (initialized) return
  initialized = true
  try {
    console.log('[main] startInit: running initialization')
    if (mainWindow) {
      await ensureSmbSettingsFile()
      await loadSmbSettings()
      watchSmbSettingsFile(mainWindow)
      await loadNextImage(mainWindow)
    }
  } catch (e) {
    console.error('Initialization failed:', e)
    if (mainWindow) {
      mainWindow.webContents.send('app-error', `Initialization failed: ${e}`)
    }
  }
}