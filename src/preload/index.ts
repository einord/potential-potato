import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

interface UpdateInfo { version: string }
interface UpdateError { message: string }
interface DownloadProgress { percent: number }
interface RestartingInfo { secondsRemaining: number }

contextBridge.exposeInMainWorld('api', {
  ping: () => 'pong',
  updater: {
    onUpdateChecking: (cb: () => void) => {
      const w = () => cb()
      ipcRenderer.on('update-checking', w)
      return () => ipcRenderer.removeListener('update-checking', w)
    },
    onUpdateAvailable: (cb: (info: UpdateInfo) => void) => {
      const w = (_e: IpcRendererEvent, info: UpdateInfo) => cb(info)
      ipcRenderer.on('update-available', w)
      return () => ipcRenderer.removeListener('update-available', w)
    },
    onUpdateNotAvailable: (cb: (info: UpdateInfo) => void) => {
      const w = (_e: IpcRendererEvent, info: UpdateInfo) => cb(info)
      ipcRenderer.on('update-not-available', w)
      return () => ipcRenderer.removeListener('update-not-available', w)
    },
    onDownloadProgress: (cb: (p: DownloadProgress) => void) => {
      const w = (_e: IpcRendererEvent, p: DownloadProgress) => cb(p)
      ipcRenderer.on('update-download-progress', w)
      return () => ipcRenderer.removeListener('update-download-progress', w)
    },
    onUpdateDownloaded: (cb: (info: UpdateInfo) => void) => {
      const w = (_e: IpcRendererEvent, info: UpdateInfo) => cb(info)
      ipcRenderer.on('update-downloaded', w)
      return () => ipcRenderer.removeListener('update-downloaded', w)
    },
    onUpdateError: (cb: (err: UpdateError) => void) => {
      const w = (_e: IpcRendererEvent, err: UpdateError) => cb(err)
      ipcRenderer.on('update-error', w)
      return () => ipcRenderer.removeListener('update-error', w)
    },
    onUpdateRestarting: (cb: (info: RestartingInfo) => void) => {
      const w = (_e: IpcRendererEvent, info: RestartingInfo) => cb(info)
      ipcRenderer.on('update-restarting', w)
      return () => ipcRenderer.removeListener('update-restarting', w)
    }
  }
})
