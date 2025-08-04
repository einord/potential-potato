import { RemoteSettings } from "./settings/loadimages";

export {};

declare global {
  interface Window {
    api: {
      onNewImage(callback: (payload: { dataUrl: string; settings: RemoteSettings }) => void): () => void;
      updater: {
        onUpdateAvailable(callback: (info: any) => void): () => void;
        onUpdateNotAvailable(callback: (info: any) => void): () => void;
        onUpdateDownloaded(callback: (info: any) => void): () => void;
        onUpdateError(callback: (error: string) => void): () => void;
        onDownloadProgress(callback: (progress: any) => void): () => void;
        onUpdateChecking(callback: () => void): () => void;
      };
    };
  }
}
