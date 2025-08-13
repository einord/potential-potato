import { RemoteSettings } from "./settings/loadimages";
import { DownloadProgressInfo, UpdateInfo } from "./types/updater";

export {};

declare global {
  interface Window {
    api: {
      onNewImage(callback: (payload: { dataUrl: string; settings: RemoteSettings }) => void): () => void;
      getCachedImage(): Promise<{ dataUrl: string; settings: RemoteSettings; fileName: string } | null>;
  getAppVersion(): Promise<string>;
      updater: {
        onUpdateAvailable(callback: (info: UpdateInfo) => void): () => void;
        onUpdateNotAvailable(callback: (info: UpdateInfo) => void): () => void;
        onUpdateDownloaded(callback: (info: UpdateInfo) => void): () => void;
        onUpdateError(callback: (error: string) => void): () => void;
        onDownloadProgress(callback: (progress: DownloadProgressInfo) => void): () => void;
        onUpdateChecking(callback: () => void): () => void;
      };
    };
  }
}
