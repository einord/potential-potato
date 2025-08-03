import { RemoteSettings } from "./settings/loadimages";

export {};

declare global {
  interface Window {
    api: {
      onNewImage(callback: (payload: { dataUrl: string; settings: RemoteSettings; fileName: string }) => void): () => void;
    };
  }
}