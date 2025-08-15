import { RemoteSettings } from "./shared-types/remote-settings"

export {}

declare global {
  interface Window {
    api?: {
      // Returns the application version (e.g., "1.2.3")
      getVersion?: () => Promise<string>

      // Remote settings
      onRemoteSettingsUpdated: (callback: (settings: RemoteSettings) => void) => void
      offRemoteSettingsUpdated: (callback: (settings: RemoteSettings) => void) => void

      // Images
      onNewImage: (callback: (dataUrl: string) => void) => void
      offNewImage: (callback: (dataUrl: string) => void) => void

      // Cache
      getCachedImage(): Promise<{ dataUrl: string; settings?: RemoteSettings; fileName: string } | null>;

      // Updater events
      updater?: {
        onUpdateChecking?: (cb: () => void) => void
        offUpdateChecking?: (cb: () => void) => void

        onUpdateAvailable?: (cb: (info: { version: string }) => void) => void
        offUpdateAvailable?: (cb: (info: { version: string }) => void) => void

        onUpdateNotAvailable?: (cb: (info: { version: string }) => void) => void
        offUpdateNotAvailable?: (cb: (info: { version: string }) => void) => void

        onDownloadProgress?: (cb: (p: { percent: number }) => void) => void
        offDownloadProgress?: (cb: (p: { percent: number }) => void) => void

        onUpdateDownloaded?: (cb: (info: { version: string }) => void) => void
        offUpdateDownloaded?: (cb: (info: { version: string }) => void) => void

        onUpdateError?: (cb: (err: { message: string }) => void) => void
        offUpdateError?: (cb: (err: { message: string }) => void) => void

        onUpdateRestarting?: (cb: (info: { secondsRemaining: number }) => void) => void
        offUpdateRestarting?: (cb: (info: { secondsRemaining: number }) => void) => void
      }
    }
  }
}
