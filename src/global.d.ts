export {}

declare global {
  interface Window {
    api?: {
      // Returns the application version (e.g., "1.2.3")
      getVersion?: () => Promise<string>
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
