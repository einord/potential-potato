// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { RemoteSettings } from './settings/loadimages';

// Define interfaces for update information
interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseName?: string;
  releaseDate?: string;
  // Add other relevant fields as needed
}

interface UpdateError {
  message: string;
  code?: string;
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

contextBridge.exposeInMainWorld('api', {
  // för push från main (setInterval)
  onNewImage: (callback: (payload: { dataUrl: string; settings: RemoteSettings }) => void) => {
    const wrapper = (_event: IpcRendererEvent, payload: { dataUrl: string; settings: RemoteSettings }) => callback(payload);
    ipcRenderer.on('new-image', wrapper);
    // returnera en funktion för att sluta lyssna om du vill:
    return () => ipcRenderer.removeListener('new-image', wrapper);
  },
  
  // Cached image API
  getCachedImage: () => ipcRenderer.invoke('get-cached-image'),
  
  // Auto-updater API
  updater: {
    onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
      const wrapper = (_event: IpcRendererEvent, info: UpdateInfo) => callback(info);
      ipcRenderer.on('update-available', wrapper);
      return () => ipcRenderer.removeListener('update-available', wrapper);
    },
    onUpdateNotAvailable: (callback: (info: UpdateInfo) => void) => {
      const wrapper = (_event: IpcRendererEvent, info: UpdateInfo) => callback(info);
      ipcRenderer.on('update-not-available', wrapper);
      return () => ipcRenderer.removeListener('update-not-available', wrapper);
    },
    onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => {
      const wrapper = (_event: IpcRendererEvent, info: UpdateInfo) => callback(info);
      ipcRenderer.on('update-downloaded', wrapper);
      return () => ipcRenderer.removeListener('update-downloaded', wrapper);
    },
    onUpdateError: (callback: (error: UpdateError) => void) => {
      const wrapper = (_event: IpcRendererEvent, error: UpdateError) => callback(error);
      ipcRenderer.on('update-error', wrapper);
      return () => ipcRenderer.removeListener('update-error', wrapper);
    },
    onDownloadProgress: (callback: (progress: DownloadProgress) => void) => {
      const wrapper = (_event: IpcRendererEvent, progress: DownloadProgress) => callback(progress);
      ipcRenderer.on('update-download-progress', wrapper);
      return () => ipcRenderer.removeListener('update-download-progress', wrapper);
    },
    onUpdateChecking: (callback: () => void) => {
      const wrapper = () => callback();
      ipcRenderer.on('update-checking', wrapper);
      return () => ipcRenderer.removeListener('update-checking', wrapper);
    }
  }
});
