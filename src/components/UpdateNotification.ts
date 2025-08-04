export class UpdateNotification extends HTMLElement {
  private notification: HTMLDivElement;
  private progressBar: HTMLDivElement;
  private progressFill: HTMLDivElement;
  private statusText: HTMLParagraphElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Create notification element
    this.notification = document.createElement('div');
    this.notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 15px;
      border-radius: 8px;
      min-width: 300px;
      max-width: 400px;
      z-index: 1000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: opacity 0.3s ease;
      display: none;
    `;

    // Status text
    this.statusText = document.createElement('p');
    this.statusText.style.cssText = `margin: 0 0 10px 0; font-weight: 500;`;
    this.notification.appendChild(this.statusText);

    // Progress bar container
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      overflow: hidden;
      display: none;
    `;

    // Progress bar fill
    this.progressFill = document.createElement('div');
    this.progressFill.style.cssText = `
      height: 100%;
      background: #4CAF50;
      width: 0%;
      transition: width 0.3s ease;
    `;

    progressContainer.appendChild(this.progressFill);
    this.notification.appendChild(progressContainer);

    this.progressBar = progressContainer;
    this.shadowRoot!.appendChild(this.notification);

    this.setupUpdateListeners();
  }

  private setupUpdateListeners(): void {
    if (typeof window !== 'undefined' && window.api?.updater) {
      // Update checking
      window.api.updater.onUpdateChecking(() => {
        console.debug('Checking for updates...');
        // this.showNotification('Checking for updates...', false);
        // setTimeout(() => this.hideNotification(), 3000);
      });

      // Update available
      window.api.updater.onUpdateAvailable((info: any) => {
        this.showNotification(`Update available: v${info.version}`, false);
      });

      // Update not available
      window.api.updater.onUpdateNotAvailable(() => {
        console.debug('You have the latest version!');
        // this.showNotification('You have the latest version!', false);
        // setTimeout(() => this.hideNotification(), 3000);
      });

      // Download progress
      window.api.updater.onDownloadProgress((progress: any) => {
        const percent = Math.round(progress.percent);
        this.showNotification(`Downloading update: ${percent}%`, true);
        this.updateProgress(percent);
      });

      // Update downloaded
      window.api.updater.onUpdateDownloaded((info: any) => {
        this.showNotification(`Update v${info.version} installed! Restarting in 3 seconds...`, false);
      });

      // Update error
      window.api.updater.onUpdateError((error: string) => {
        this.showNotification(`Update error: ${error}`, false);
        setTimeout(() => this.hideNotification(), 5000);
      });
    }
  }

  private showNotification(message: string, showProgress: boolean): void {
    this.statusText.textContent = message;
    this.progressBar.style.display = showProgress ? 'block' : 'none';
    this.notification.style.display = 'block';
    this.notification.style.opacity = '1';
  }

  private updateProgress(percent: number): void {
    this.progressFill.style.width = `${percent}%`;
  }

  private hideNotification(): void {
    this.notification.style.opacity = '0';
    setTimeout(() => {
      this.notification.style.display = 'none';
    }, 300);
  }
}

customElements.define('update-notification', UpdateNotification);
