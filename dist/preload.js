// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('api', {
    // för push från main (setInterval)
    onNewImage: (callback) => {
        const wrapper = (_event, payload) => callback(payload);
        ipcRenderer.on('new-image', wrapper);
        // returnera en funktion för att sluta lyssna om du vill:
        return () => ipcRenderer.removeListener('new-image', wrapper);
    },
    // Cached image API
    getCachedImage: () => ipcRenderer.invoke('get-cached-image'),
    // Auto-updater API
    updater: {
        onUpdateAvailable: (callback) => {
            const wrapper = (_event, info) => callback(info);
            ipcRenderer.on('update-available', wrapper);
            return () => ipcRenderer.removeListener('update-available', wrapper);
        },
        onUpdateNotAvailable: (callback) => {
            const wrapper = (_event, info) => callback(info);
            ipcRenderer.on('update-not-available', wrapper);
            return () => ipcRenderer.removeListener('update-not-available', wrapper);
        },
        onUpdateDownloaded: (callback) => {
            const wrapper = (_event, info) => callback(info);
            ipcRenderer.on('update-downloaded', wrapper);
            return () => ipcRenderer.removeListener('update-downloaded', wrapper);
        },
        onUpdateError: (callback) => {
            const wrapper = (_event, error) => callback(error);
            ipcRenderer.on('update-error', wrapper);
            return () => ipcRenderer.removeListener('update-error', wrapper);
        },
        onDownloadProgress: (callback) => {
            const wrapper = (_event, progress) => callback(progress);
            ipcRenderer.on('update-download-progress', wrapper);
            return () => ipcRenderer.removeListener('update-download-progress', wrapper);
        },
        onUpdateChecking: (callback) => {
            const wrapper = () => callback();
            ipcRenderer.on('update-checking', wrapper);
            return () => ipcRenderer.removeListener('update-checking', wrapper);
        }
    }
});
//# sourceMappingURL=preload.js.map