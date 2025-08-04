import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';
import log from 'electron-log';

// Update check interval in milliseconds (default: 1 hour)
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

export class AppUpdater {
  private mainWindow: BrowserWindow;
  private updateCheckInterval: NodeJS.Timeout | null = null;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.setupUpdater();
  }

  private setupUpdater(): void {
    // Configure updater for GitHub releases
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'einord',
      repo: 'potential-potato',
      private: false
    });

    // Configure update check interval (check every hour)
    autoUpdater.checkForUpdatesAndNotify();
    this.updateCheckInterval = setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, UPDATE_CHECK_INTERVAL_MS);

    // Event handlers
    autoUpdater.on('checking-for-update', () => {
      log.info('Checking for update...');
      this.sendToRenderer('update-checking');
    });

    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info);
      this.sendToRenderer('update-available', info);
      // Automatically start download without user interaction
      log.info('Starting automatic download of update:', info.version);
      autoUpdater.downloadUpdate();
    });

    autoUpdater.on('update-not-available', (info) => {
      log.info('Update not available:', info);
      this.sendToRenderer('update-not-available', info);
    });

    autoUpdater.on('error', (err) => {
      log.error('Error in auto-updater:', err);
      this.sendToRenderer('update-error', err.message);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      let logMessage = `Download speed: ${progressObj.bytesPerSecond}`;
      logMessage += ` - Downloaded ${progressObj.percent}%`;
      logMessage += ` (${progressObj.transferred}/${progressObj.total})`;
      log.info(logMessage);
      this.sendToRenderer('update-download-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info);
      this.sendToRenderer('update-downloaded', info);
      this.showRestartDialog();
    });
  }

  private sendToRenderer(channel: string, data?: any): void {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  // Automatically restart without showing dialog
  private async showRestartDialog(): Promise<void> {
    log.info('Update downloaded successfully. Restarting in 3 seconds...');
    // Give a short delay to let the UI show the completion message
    setTimeout(() => {
      log.info('Automatically restarting to apply update...');
      autoUpdater.quitAndInstall();
    }, 3000); // 3 second delay
  }

  public checkForUpdates(): void {
    autoUpdater.checkForUpdatesAndNotify();
  }

  public downloadUpdate(): void {
    autoUpdater.downloadUpdate();
  }

  public quitAndInstall(): void {
    autoUpdater.quitAndInstall();
  }

  public dispose(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }
}
