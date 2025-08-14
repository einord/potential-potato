import { RemoteSettings } from "./shared-types/remote-settings"

export {}

declare global {
  interface Window {
    api?: {
      // Returns the application version (e.g., "1.2.3")
      getVersion?: () => Promise<string>
      onRemoteSettingsUpdated: (callback: (settings: RemoteSettings) => void) => () => void
      onNewImage: (callback: (dataUrl: string) => void) => () => void
      getCachedImage(): Promise<{ dataUrl: string; settings: RemoteSettings; fileName: string } | null>;
      updater?: {
        onUpdateChecking?: (cb: () => void) => () => void
        onUpdateAvailable?: (cb: (info: { version: string }) => void) => () => void
        onUpdateNotAvailable?: (cb: (info: { version: string }) => void) => () => void
        onDownloadProgress?: (cb: (p: { percent: number }) => void) => () => void
        onUpdateDownloaded?: (cb: (info: { version: string }) => void) => () => void
        onUpdateError?: (cb: (err: { message: string }) => void) => () => void
        onUpdateRestarting?: (cb: (info: { secondsRemaining: number }) => void) => () => void
      }
    }
  }
}
