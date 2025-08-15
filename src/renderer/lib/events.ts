import type { RemoteSettings } from '../../shared-types/remote-settings'

export type Off = () => void

// Eventnamn från preload
export const REMOTE_SETTINGS_EVENT = 'pp-remote-settings-updated'
export const NEW_IMAGE_EVENT = 'pp-new-image'

export interface UpdateInfo { version: string }
export interface DownloadProgress { percent: number }
export interface UpdateError { message: string }
export interface RestartingInfo { secondsRemaining: number }

function addDomListener<T>(eventName: string, mapDetail: (ev: Event) => T, cb: (payload: T) => void): Off {
  const handler: EventListener = (ev: Event) => {
    try {
      cb(mapDetail(ev))
    } catch (e) {
      // no-op: swallow handler errors to avoid bubbling back
      console.error(`[events] handler error for ${eventName}:`, e)
    }
  }
  window.addEventListener(eventName, handler)
  return () => window.removeEventListener(eventName, handler)
}

export function listenRemoteSettings(cb: (settings: RemoteSettings) => void): Off {
  return addDomListener(REMOTE_SETTINGS_EVENT, ev => (ev as CustomEvent).detail as RemoteSettings, cb)
}

export function listenNewImage(cb: (dataUrl: string) => void): Off {
  return addDomListener(NEW_IMAGE_EVENT, ev => (ev as CustomEvent).detail as string, cb)
}

// Updater wrappers (speglar preload-API:t)
export const updaterEvents = {
  onChecking(cb: () => void): Off {
    return addDomListener('pp-update-checking', () => undefined as unknown as void, cb)
  },
  onAvailable(cb: (info: UpdateInfo) => void): Off {
    return addDomListener('pp-update-available', ev => (ev as CustomEvent).detail as UpdateInfo, cb)
  },
  onNotAvailable(cb: (info: UpdateInfo) => void): Off {
    return addDomListener('pp-update-not-available', ev => (ev as CustomEvent).detail as UpdateInfo, cb)
  },
  onProgress(cb: (p: DownloadProgress) => void): Off {
    return addDomListener('pp-update-download-progress', ev => (ev as CustomEvent).detail as DownloadProgress, cb)
  },
  onDownloaded(cb: (info: UpdateInfo) => void): Off {
    return addDomListener('pp-update-downloaded', ev => (ev as CustomEvent).detail as UpdateInfo, cb)
  },
  onError(cb: (err: UpdateError) => void): Off {
    return addDomListener('pp-update-error', ev => (ev as CustomEvent).detail as UpdateError, cb)
  },
  onRestarting(cb: (info: RestartingInfo) => void): Off {
    return addDomListener('pp-update-restarting', ev => (ev as CustomEvent).detail as RestartingInfo, cb)
  },
}
