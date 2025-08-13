// Image viewer web component that displays SMB-loaded images
// Renders a full-screen image and updates whenever a new one arrives.
class ImageViewer extends HTMLElement {
  private img: HTMLImageElement;
  private disposeNewImage?: () => void;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; width: 100vw; height: 100vh; background: #000; }
      img { width: 100%; height: 100%; object-fit: contain; image-rendering: auto; }
    `;
    this.img = document.createElement('img');
    this.img.alt = 'Image';
    root.append(style, this.img);
  }

  connectedCallback() {
    // Load cached image immediately if available
    try {
      // @ts-expect-error injected by preload
      window.api?.getCachedImage?.()?.then((cached: { dataUrl?: string }) => {
        if (cached?.dataUrl) this.setImage(cached.dataUrl);
      }).catch(() => {});
    } catch {}

    // Subscribe to new-image events
    try {
      // @ts-expect-error injected by preload
      this.disposeNewImage = window.api?.onNewImage?.((payload: { dataUrl: string }) => {
        if (payload?.dataUrl) this.setImage(payload.dataUrl);
      });
    } catch {}
  }

  disconnectedCallback() {
    try { this.disposeNewImage?.(); } catch {}
  }

  private setImage(dataUrl: string) {
    this.img.src = dataUrl;
  }
}

customElements.define('image-viewer', ImageViewer);

