import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'

let win: BrowserWindow | null = null

async function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js')
    }
  })

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

app.whenReady().then(createWindow)
