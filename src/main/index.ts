import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { Updater } from './updater'

let win: BrowserWindow | null = null
let updater: Updater | null = null

async function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js')
    }
  })

  // Initialize updater once the window exists
  updater = new Updater(win, app.getVersion())

  if (process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL)
    if (!app.isPackaged) {
      win.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    await win.loadFile(join(__dirname, '../../dist/index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  // Ensure timers are cleared
  updater?.dispose()
})

app.whenReady().then(createWindow)
