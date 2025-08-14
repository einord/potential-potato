import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { RemoteSettings } from 'src/shared-types/remote-settings'

interface UpdateInfo {
  version: string
}
interface UpdateError {
  message: string
}
interface DownloadProgress {
  percent: number
}
interface RestartingInfo {
  secondsRemaining: number
}

contextBridge.exposeInMainWorld('api', {
  ping: () => 'pong',
  // Provide the application version to renderer
  getVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),

  /** Remote settings updated */
  onRemoteSettingsUpdated: (callback: (settings: RemoteSettings) => void) => {
    const wrapper = (_event: IpcRendererEvent, settings: RemoteSettings) => callback(settings);
    ipcRenderer.on('remote-settings-updated', wrapper);
    return () => ipcRenderer.removeListener('remote-settings-updated', wrapper);
  },

  /** New image available */
  onNewImage: (callback: (dataUrl: string) => void) => {
    const wrapper = (_event: IpcRendererEvent, dataUrl: string) => callback(dataUrl);
    ipcRenderer.on('new-image', wrapper);
    // returnera en funktion för att sluta lyssna om du vill:
    return () => ipcRenderer.removeListener('new-image', wrapper);
  },

  /** Get cached image */
  getCachedImage: () => ipcRenderer.invoke('get-cached-image'),

  /** Handle updates */
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
    },
  },
})
