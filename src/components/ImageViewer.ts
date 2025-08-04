import { RemoteSettings } from "src/settings/loadimages";
import css from "./ImageViewer.css?inline";

export class ImageViewer extends HTMLElement {
  static sheet = new CSSStyleSheet();

  private currentData = 'https://wallpapercave.com/wp/9gAmpUH.jpg'

  private shadow: ShadowRoot
  private wrapper: HTMLDivElement
  private image: HTMLDivElement

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });

    // Load the CSS style
    if (!ImageViewer.sheet.cssRules.length) {
      ImageViewer.sheet.replaceSync(css);
    }
    this.shadow.adoptedStyleSheets = [ImageViewer.sheet];

    // Init the elements
    this.initElements()

    // Try to load cached image first
    this.loadCachedImage();

    // Listen for the next image event
    window.addEventListener("DOMContentLoaded", () => {
      window.api.onNewImage(({ dataUrl, settings }) => {
        this.currentData = dataUrl
        this.showImage(settings)
      });
    });
  }

  private initElements() {
    // Create the image viewer element
    this.wrapper = document.createElement("div");
    this.wrapper.id = 'image-background'
    this.wrapper.setAttribute("class", "image-background");
    
    this.image = document.createElement('div');
    this.image.id = 'image'
    this.image.setAttribute('class', 'image')
    this.image.style.background = `url("${this.currentData}")`
    this.image.style.backgroundSize = "cover"
    this.image.style.backgroundPosition = "center"
    this.image.style.backgroundRepeat = "no-repeat"
    this.wrapper.appendChild(this.image)

    this.shadow.appendChild(this.wrapper);
  }

  private async loadCachedImage(): Promise<void> {
    try {
      const cachedImage = await window.api.getCachedImage();
      if (cachedImage) {
        this.currentData = cachedImage.dataUrl;
        this.showImage(cachedImage.settings);
      }
    } catch (error) {
      console.error('Failed to load cached image:', error);
    }
  }

  private showImage(settings: RemoteSettings) {
    this.image.style.background = `url("${this.currentData}")`
    this.image.style.backgroundSize = "cover"
    this.image.style.backgroundPosition = "center"
    this.image.style.backgroundRepeat = "no-repeat"

    // Passepartout
    if (settings.passepartoutColor == null || settings.passepartoutColor === 'off') {
      this.wrapper.style.backgroundColor = 'green'
      this.image.style.border = 'none'
      this.image.style.marginLeft = '0'
      this.image.style.marginTop = '0'
      this.image.style.width = '100%'
      this.image.style.height = '100%'
    } else {
      this.wrapper.style.backgroundColor = settings.passepartoutColor
      this.image.style.outline = '10px solid hsla(0, 100%, 0%, 0.2)'
      
      const passepartoutWidth = settings.passepartoutWidth ?? 150
      if (passepartoutWidth) {
        this.image.style.marginLeft = passepartoutWidth + "px"
        this.image.style.marginTop = passepartoutWidth + "px"
        this.image.style.width = `calc(100% - ${passepartoutWidth}px - ${passepartoutWidth}px)`
        this.image.style.height = `calc(100% - ${passepartoutWidth}px - ${passepartoutWidth}px)`
      }
    }
  }
}

customElements.define("image-viewer", ImageViewer);
