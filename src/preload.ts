// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { RemoteSettings } from './settings/loadimages';
// import { RemoteSettings } from './settings/loadimages';

contextBridge.exposeInMainWorld('api', {
  // för push från main (setInterval)
  onNewImage: (callback: (payload: { dataUrl: string; settings: RemoteSettings }) => void) => {
    const wrapper = (_event: IpcRendererEvent, payload: { dataUrl: string; settings: RemoteSettings }) => callback(payload);
    ipcRenderer.on('new-image', wrapper);
    // returnera en funktion för att sluta lyssna om du vill:
    return () => ipcRenderer.removeListener('new-image', wrapper);
  },
});