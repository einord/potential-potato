export {};

declare global {
  interface Window {
    api: {
      onNewImage(callback: (payload: { dataUrl: string; fileName: string }) => void): () => void;
    };
  }
}