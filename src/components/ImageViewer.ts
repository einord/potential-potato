import css from "./ImageViewer.css?inline";

export class ImageViewer extends HTMLElement {
  static sheet = new CSSStyleSheet();

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
    wrapper.id = 'current-image'
    wrapper.setAttribute("class", "image-viewer");

    // wrapper.textContent = this.getAttribute('text') || 'Image Viewer';
    wrapper.attributeStyleMap.set(
      "background",
      'url("https://wallpapercave.com/wp/9gAmpUH.jpg")'
    );
    wrapper.style.backgroundSize = "cover";
    wrapper.style.backgroundPosition = "center";
    wrapper.style.backgroundRepeat = "no-repeat";


    // Listen for the next image event
    window.addEventListener("DOMContentLoaded", () => {
      window.api.onNewImage(({ dataUrl, fileName }) => {
        // console.log('GOT NEW IMAGE!', dataUrl)
        // const element = document.getElementById('current-image')
        // console.log(wrapper)
        wrapper.style.background = `url("${dataUrl}")`;
        wrapper.style.backgroundSize = "cover";
        wrapper.style.backgroundPosition = "center";
        wrapper.style.backgroundRepeat = "no-repeat";
        // wrapper.attributeStyleMap.set("background", `green`);
        // wrapper.attributeStyleMap.set("background", `url("${dataUrl}")`);
        // element.attributeStyleMap.set("background", `url("${dataUrl}")`);
      });
    });

    shadow.appendChild(wrapper);
  }
}

customElements.define("image-viewer", ImageViewer);
