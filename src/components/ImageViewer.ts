import { RemoteSettings } from "src/settings/loadimages";
import css from "./ImageViewer.css?inline";

export class ImageViewer extends HTMLElement {
  static sheet = new CSSStyleSheet();

  private currentData = 'https://wallpapercave.com/wp/9gAmpUH.jpg'
  private isTransitioning = false
  private activeImageIndex = 0 // 0 eller 1 för att växla mellan bildlager

  private shadow: ShadowRoot
  private wrapper: HTMLDivElement
  private imageLayer1: HTMLDivElement
  private imageLayer2: HTMLDivElement
  private versionLabel: HTMLDivElement

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

  /**
   * Initializes the basic elements in this shadow element
   */
  private initElements() {
    // Create the image viewer element
    this.wrapper = document.createElement("div");
    this.wrapper.id = 'image-background'
    this.wrapper.setAttribute("class", "image-background");
    this.wrapper.style.position = 'relative';
    
    // Skapa två bildlager som stackas över varandra
    this.imageLayer1 = this.createImageLayer('layer1');
    this.imageLayer2 = this.createImageLayer('layer2');
    
    // Visa initial bild på lager 1
    this.imageLayer1.style.backgroundImage = `url("${this.currentData}")`;
    this.imageLayer1.style.opacity = '1';
    this.imageLayer2.style.opacity = '0';
    
    this.wrapper.appendChild(this.imageLayer1);
    this.wrapper.appendChild(this.imageLayer2);

    this.shadow.appendChild(this.wrapper);

    // Version number label
    this.versionLabel = document.createElement('div');
    this.versionLabel.id = 'version-label';
    this.versionLabel.setAttribute("class", "version-label");
    this.versionLabel.textContent = 'Version: 1.0.0';
    this.wrapper.appendChild(this.versionLabel);
  }
  
  private createImageLayer(id: string): HTMLDivElement {
    const layer = document.createElement('div');
    layer.id = id;
    layer.setAttribute('class', 'image');
    layer.style.position = 'absolute';
    layer.style.top = '0';
    layer.style.left = '0';
    layer.style.width = '100%';
    layer.style.height = '100%';
    layer.style.backgroundSize = "cover";
    layer.style.backgroundPosition = "center";
    layer.style.backgroundRepeat = "no-repeat";
    return layer;
  }

  private async loadCachedImage(): Promise<void> {
    try {
      const cachedImage = await window.api.getCachedImage();
      if (cachedImage?.dataUrl != null) {
        this.currentData = cachedImage.dataUrl;
        this.showImage(cachedImage.settings);
      }
    } catch (error) {
      console.error('Failed to load cached image:', error);
    }
  }

  private showImage(settings: RemoteSettings) {
    const transitionDuration = settings.transitionDuration || 0;
    
    // Bestäm vilka lager som är aktiva/inaktiva
    const currentLayer = this.activeImageIndex === 0 ? this.imageLayer1 : this.imageLayer2;
    const nextLayer = this.activeImageIndex === 0 ? this.imageLayer2 : this.imageLayer1;
    
    if (transitionDuration > 0 && !this.isTransitioning) {
      this.isTransitioning = true;
      
      // Ladda ny bild i det dolda lagret
      nextLayer.style.backgroundImage = `url("${this.currentData}")`;
      
      // Sätt upp transitions
      currentLayer.style.transition = `opacity ${transitionDuration}ms ease-in-out`;
      nextLayer.style.transition = `opacity ${transitionDuration}ms ease-in-out`;
      
      // Crossfade: fade ut nuvarande, fade in nästa
      currentLayer.style.opacity = '0';
      nextLayer.style.opacity = '1';
      
      setTimeout(() => {
        // Växla aktivt lager
        this.activeImageIndex = this.activeImageIndex === 0 ? 1 : 0;
        this.isTransitioning = false;
        
        // Rensa transitions
        currentLayer.style.transition = 'none';
        nextLayer.style.transition = 'none';
      }, transitionDuration);
    } else {
      // Ingen övergång - visa direkt på aktivt lager
      currentLayer.style.transition = 'none';
      currentLayer.style.opacity = '1';
      currentLayer.style.background = `url("${this.currentData}")`;
      
      // Döl det andra lagret
      nextLayer.style.opacity = '0';
    }

    // Applicera passepartout-inställningar på båda lagren
    this.applyPassepartoutSettings(settings, this.imageLayer1);
    this.applyPassepartoutSettings(settings, this.imageLayer2);
  }
  
  private applyPassepartoutSettings(settings: RemoteSettings, imageElement: HTMLDivElement) {
    if (settings.passepartoutColor == null || settings.passepartoutColor === 'off') {
      this.wrapper.style.backgroundColor = 'green';
      imageElement.style.border = 'none';
      imageElement.style.marginLeft = '0';
      imageElement.style.marginTop = '0';
      imageElement.style.width = '100%';
      imageElement.style.height = '100%';
    } else {
      this.wrapper.style.backgroundColor = settings.passepartoutColor;
      imageElement.style.outline = '10px solid hsla(0, 100%, 0%, 0.2)';
      
      const passepartoutWidth = settings.passepartoutWidth ?? 150;
      if (passepartoutWidth) {
        imageElement.style.marginLeft = passepartoutWidth + "px";
        imageElement.style.marginTop = passepartoutWidth + "px";
        imageElement.style.width = `calc(100% - ${passepartoutWidth}px - ${passepartoutWidth}px)`;
        imageElement.style.height = `calc(100% - ${passepartoutWidth}px - ${passepartoutWidth}px)`;
      }
    }
  }
}

customElements.define("image-viewer", ImageViewer);
