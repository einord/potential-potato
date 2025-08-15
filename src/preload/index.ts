import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { RemoteSettings } from 'src/shared-types/remote-settings'

console.log('[preload] api ready v2');

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

// Interna register och eventnamn
const REMOTE_SETTINGS_EVENT = 'pp-remote-settings-updated'
const NEW_IMAGE_EVENT = 'pp-new-image'

const remoteSettingsDomListeners = new Map<(s: RemoteSettings) => void, EventListener>()
const newImageDomListeners = new Map<(d: string) => void, EventListener>()

// Updater DOM event names and handler registries
const UPDATE_CHECKING_EVENT = 'pp-update-checking'
const UPDATE_AVAILABLE_EVENT = 'pp-update-available'
const UPDATE_NOT_AVAILABLE_EVENT = 'pp-update-not-available'
const UPDATE_DOWNLOAD_PROGRESS_EVENT = 'pp-update-download-progress'
const UPDATE_DOWNLOADED_EVENT = 'pp-update-downloaded'
const UPDATE_ERROR_EVENT = 'pp-update-error'
const UPDATE_RESTARTING_EVENT = 'pp-update-restarting'

const updaterDomListeners = {
  checking: new Map<() => void, EventListener>(),
  available: new Map<(i: UpdateInfo) => void, EventListener>(),
  notAvailable: new Map<(i: UpdateInfo) => void, EventListener>(),
  progress: new Map<(p: DownloadProgress) => void, EventListener>(),
  downloaded: new Map<(i: UpdateInfo) => void, EventListener>(),
  error: new Map<(e: UpdateError) => void, EventListener>(),
  restarting: new Map<(i: RestartingInfo) => void, EventListener>(),
}

// Koppla en gång: översätt IPC -> DOM-event på window
ipcRenderer.on('remote-settings-updated', (_e: IpcRendererEvent, settings: RemoteSettings) => {
  try {
    const plain = JSON.parse(JSON.stringify(settings)) as RemoteSettings
    window.dispatchEvent(new CustomEvent(REMOTE_SETTINGS_EVENT, { detail: plain }))
  } catch (e) {
    console.error('Failed to dispatch remote-settings-updated:', e)
  }
})

ipcRenderer.on('new-image', (_e: IpcRendererEvent, dataUrl: string) => {
  try {
    window.dispatchEvent(new CustomEvent(NEW_IMAGE_EVENT, { detail: String(dataUrl) }))
  } catch (e) {
    console.error('Failed to dispatch new-image:', e)
  }
})

// Mirror updater IPC channels to DOM events
ipcRenderer.on('update-checking', () => {
  window.dispatchEvent(new CustomEvent(UPDATE_CHECKING_EVENT))
})
ipcRenderer.on('update-available', (_e: IpcRendererEvent, info: UpdateInfo) => {
  window.dispatchEvent(new CustomEvent(UPDATE_AVAILABLE_EVENT, { detail: info }))
})
ipcRenderer.on('update-not-available', (_e: IpcRendererEvent, info: UpdateInfo) => {
  window.dispatchEvent(new CustomEvent(UPDATE_NOT_AVAILABLE_EVENT, { detail: info }))
})
ipcRenderer.on('update-download-progress', (_e: IpcRendererEvent, p: DownloadProgress) => {
  window.dispatchEvent(new CustomEvent(UPDATE_DOWNLOAD_PROGRESS_EVENT, { detail: p }))
})
ipcRenderer.on('update-downloaded', (_e: IpcRendererEvent, info: UpdateInfo) => {
  window.dispatchEvent(new CustomEvent(UPDATE_DOWNLOADED_EVENT, { detail: info }))
})
ipcRenderer.on('update-error', (_e: IpcRendererEvent, err: UpdateError) => {
  // Ensure plain object
  const plain = JSON.parse(JSON.stringify(err)) as UpdateError
  window.dispatchEvent(new CustomEvent(UPDATE_ERROR_EVENT, { detail: plain }))
})
ipcRenderer.on('update-restarting', (_e: IpcRendererEvent, info: RestartingInfo) => {
  window.dispatchEvent(new CustomEvent(UPDATE_RESTARTING_EVENT, { detail: info }))
})

contextBridge.exposeInMainWorld('api', {
  ping: () => 'pong',
  // Provide the application version to renderer
  getVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),

  /** Remote settings updated */
  onRemoteSettingsUpdated: (callback: (settings: RemoteSettings) => void): void => {
    const handler: EventListener = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as RemoteSettings
      callback(detail)
    }
    remoteSettingsDomListeners.set(callback, handler)
    window.addEventListener(REMOTE_SETTINGS_EVENT, handler)
  },
  offRemoteSettingsUpdated: (callback: (settings: RemoteSettings) => void): void => {
    const handler = remoteSettingsDomListeners.get(callback)
    if (handler) {
      window.removeEventListener(REMOTE_SETTINGS_EVENT, handler)
      remoteSettingsDomListeners.delete(callback)
    }
  },

  /** New image available */
  onNewImage: (callback: (dataUrl: string) => void): void => {
    const handler: EventListener = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as string
      callback(detail)
    }
    newImageDomListeners.set(callback, handler)
    window.addEventListener(NEW_IMAGE_EVENT, handler)
  },
  offNewImage: (callback: (dataUrl: string) => void): void => {
    const handler = newImageDomListeners.get(callback)
    if (handler) {
      window.removeEventListener(NEW_IMAGE_EVENT, handler)
      newImageDomListeners.delete(callback)
    }
  },

  /** Get cached image */
  getCachedImage: () => ipcRenderer.invoke('get-cached-image'),

  /** Handle updates */
  updater: {
    onUpdateChecking: (cb: () => void): void => {
      const h: EventListener = () => cb()
      updaterDomListeners.checking.set(cb, h)
      window.addEventListener(UPDATE_CHECKING_EVENT, h)
    },
    offUpdateChecking: (cb: () => void): void => {
      const h = updaterDomListeners.checking.get(cb)
      if (h) {
        window.removeEventListener(UPDATE_CHECKING_EVENT, h)
        updaterDomListeners.checking.delete(cb)
      }
    },

    onUpdateAvailable: (cb: (info: UpdateInfo) => void): void => {
      const h: EventListener = (e: Event) => cb((e as CustomEvent).detail as UpdateInfo)
      updaterDomListeners.available.set(cb, h)
      window.addEventListener(UPDATE_AVAILABLE_EVENT, h)
    },
    offUpdateAvailable: (cb: (info: UpdateInfo) => void): void => {
      const h = updaterDomListeners.available.get(cb)
      if (h) {
        window.removeEventListener(UPDATE_AVAILABLE_EVENT, h)
        updaterDomListeners.available.delete(cb)
      }
    },

    onUpdateNotAvailable: (cb: (info: UpdateInfo) => void): void => {
      const h: EventListener = (e: Event) => cb((e as CustomEvent).detail as UpdateInfo)
      updaterDomListeners.notAvailable.set(cb, h)
      window.addEventListener(UPDATE_NOT_AVAILABLE_EVENT, h)
    },
    offUpdateNotAvailable: (cb: (info: UpdateInfo) => void): void => {
      const h = updaterDomListeners.notAvailable.get(cb)
      if (h) {
        window.removeEventListener(UPDATE_NOT_AVAILABLE_EVENT, h)
        updaterDomListeners.notAvailable.delete(cb)
      }
    },

    onDownloadProgress: (cb: (p: DownloadProgress) => void): void => {
      const h: EventListener = (e: Event) => cb((e as CustomEvent).detail as DownloadProgress)
      updaterDomListeners.progress.set(cb, h)
      window.addEventListener(UPDATE_DOWNLOAD_PROGRESS_EVENT, h)
    },
    offDownloadProgress: (cb: (p: DownloadProgress) => void): void => {
      const h = updaterDomListeners.progress.get(cb)
      if (h) {
        window.removeEventListener(UPDATE_DOWNLOAD_PROGRESS_EVENT, h)
        updaterDomListeners.progress.delete(cb)
      }
    },

    onUpdateDownloaded: (cb: (info: UpdateInfo) => void): void => {
      const h: EventListener = (e: Event) => cb((e as CustomEvent).detail as UpdateInfo)
      updaterDomListeners.downloaded.set(cb, h)
      window.addEventListener(UPDATE_DOWNLOADED_EVENT, h)
    },
    offUpdateDownloaded: (cb: (info: UpdateInfo) => void): void => {
      const h = updaterDomListeners.downloaded.get(cb)
      if (h) {
        window.removeEventListener(UPDATE_DOWNLOADED_EVENT, h)
        updaterDomListeners.downloaded.delete(cb)
      }
    },

    onUpdateError: (cb: (err: UpdateError) => void): void => {
      const h: EventListener = (e: Event) => cb((e as CustomEvent).detail as UpdateError)
      updaterDomListeners.error.set(cb, h)
      window.addEventListener(UPDATE_ERROR_EVENT, h)
    },
    offUpdateError: (cb: (err: UpdateError) => void): void => {
      const h = updaterDomListeners.error.get(cb)
      if (h) {
        window.removeEventListener(UPDATE_ERROR_EVENT, h)
        updaterDomListeners.error.delete(cb)
      }
    },

    onUpdateRestarting: (cb: (info: RestartingInfo) => void): void => {
      const h: EventListener = (e: Event) => cb((e as CustomEvent).detail as RestartingInfo)
      updaterDomListeners.restarting.set(cb, h)
      window.addEventListener(UPDATE_RESTARTING_EVENT, h)
    },
    offUpdateRestarting: (cb: (info: RestartingInfo) => void): void => {
      const h = updaterDomListeners.restarting.get(cb)
      if (h) {
        window.removeEventListener(UPDATE_RESTARTING_EVENT, h)
        updaterDomListeners.restarting.delete(cb)
      }
    },
  },
})
