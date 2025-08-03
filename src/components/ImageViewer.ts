import css from "./ImageViewer.css?inline";

export class ImageViewer extends HTMLElement {
  static sheet = new CSSStyleSheet();

  private currentData: string = 'https://wallpapercave.com/wp/9gAmpUH.jpg'

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });

    // Load the CSS style
    if (!ImageViewer.sheet.cssRules.length) {
      ImageViewer.sheet.replaceSync(css);
    }
    shadow.adoptedStyleSheets = [ImageViewer.sheet];

    // Create the image viewer element
    const wrapper = document.createElement("div");
    wrapper.id = 'image-background'
    wrapper.setAttribute("class", "image-background");
    
    const image = document.createElement('div');
    image.id = 'image'
    image.setAttribute('class', 'image')
    image.style.background = `url("${this.currentData}")`
    image.style.backgroundSize = "cover"
    image.style.backgroundPosition = "center"
    image.style.backgroundRepeat = "no-repeat"
    wrapper.appendChild(image)

    // Listen for the next image event
    window.addEventListener("DOMContentLoaded", () => {
      window.api.onNewImage(({ dataUrl, settings, fileName }) => {
        this.currentData = dataUrl
        image.style.background = `url("${dataUrl}")`
        image.style.backgroundSize = "cover"
        image.style.backgroundPosition = "center"
        image.style.backgroundRepeat = "no-repeat"

        // Passepartout
        if (settings.passepartoutColor == null || settings.passepartoutColor === 'off') {
          wrapper.style.backgroundColor = 'green'
          image.style.border = 'none'
          image.style.marginLeft = '0'
          image.style.marginTop = '0'
          image.style.width = '100%'
          image.style.height = '100%'
        } else {
          wrapper.style.backgroundColor = settings.passepartoutColor
          image.style.outline = '10px solid hsla(0, 100%, 0%, 0.2)'
          
          const passepartoutWidth = settings.passepartoutWidth ?? 150
          if (passepartoutWidth) {
            image.style.marginLeft = passepartoutWidth + "px"
            image.style.marginTop = passepartoutWidth + "px"
            image.style.width = `calc(100% - ${passepartoutWidth}px - ${passepartoutWidth}px)`
            image.style.height = `calc(100% - ${passepartoutWidth}px - ${passepartoutWidth}px)`
          }
        }
      });
    });

    shadow.appendChild(wrapper);
  }
}

customElements.define("image-viewer", ImageViewer);
