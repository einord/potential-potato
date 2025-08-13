import { BrowserWindow } from 'electron';
import log from 'electron-log';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';

interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

export class DebUpdater {
  private mainWindow: BrowserWindow;
  private updateCheckInterval: NodeJS.Timeout | null = null;
  private currentVersion: string;
  private owner: string;
  private repo: string;

  constructor(mainWindow: BrowserWindow, currentVersion: string, owner: string, repo: string) {
    this.mainWindow = mainWindow;
    this.currentVersion = currentVersion;
    this.owner = owner;
    this.repo = repo;
    this.setupUpdater();
  }

  private setupUpdater(): void {
    log.info('Setting up custom DEB updater');
    
    // Initial check
    this.checkForUpdates();
    
    // Set up periodic checks (every hour)
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates();
    }, 60 * 60 * 1000);
  }

  private async checkForUpdates(): Promise<void> {
    try {
      log.info('Checking for updates...');
      this.sendToRenderer('update-checking');

      const response = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/releases/latest`);
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const release: GitHubRelease = await response.json();
      const latestVersion = release.tag_name.replace(/^v/, '');

      log.info(`Current version: ${this.currentVersion}, Latest version: ${latestVersion}`);

      if (this.isNewerVersion(latestVersion, this.currentVersion)) {
        log.info(`Update available: ${latestVersion}`);
        this.sendToRenderer('update-available', { version: latestVersion });
        
        // Find appropriate DEB file for current architecture
        const arch = this.getSystemArchitecture();
        const debAsset = release.assets.find(asset => 
          asset.name.endsWith('.deb') && asset.name.includes(arch)
        );

        if (debAsset) {
          log.info(`Found DEB asset: ${debAsset.name}`);
          await this.downloadAndInstallUpdate(debAsset);
        } else {
          log.warn(`No DEB asset found for architecture: ${arch}`);
          this.sendToRenderer('update-error', `No update available for your architecture (${arch})`);
        }
      } else {
        log.info('No update available');
        this.sendToRenderer('update-not-available', { version: this.currentVersion });
      }
    } catch (error) {
      log.error('Error checking for updates:', error);
      this.sendToRenderer('update-error', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private isNewerVersion(latest: string, current: string): boolean {
    // Simple version comparison - you might want to use a library like semver
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const latestPart = latestParts[i] || 0;
      const currentPart = currentParts[i] || 0;

      if (latestPart > currentPart) return true;
      if (latestPart < currentPart) return false;
    }

    return false;
  }

  private getSystemArchitecture(): string {
    const arch = os.arch();
    switch (arch) {
      case 'x64': return 'amd64';
      case 'arm64': return 'arm64';
      case 'arm': return 'armhf';
      default: return arch;
    }
  }

  private async downloadAndInstallUpdate(asset: { name: string; browser_download_url: string; size: number }): Promise<void> {
    try {
      log.info(`Downloading update: ${asset.name}`);
      const tempDir = os.tmpdir();
      const filePath = path.join(tempDir, asset.name);

      // Download the file
      const response = await fetch(asset.browser_download_url);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(buffer));

      log.info(`Downloaded to: ${filePath}`);
      this.sendToRenderer('update-downloaded', { version: asset.name });

      // Install the DEB package
      await this.installDebPackage(filePath);

    } catch (error) {
      log.error('Error downloading/installing update:', error);
      this.sendToRenderer('update-error', error instanceof Error ? error.message : 'Download failed');
    }
  }

  private async installDebPackage(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      log.info(`Installing DEB package: ${filePath}`);
      
      // Use pkexec to get elevated privileges for dpkg
      const installProcess = spawn('pkexec', ['dpkg', '-i', filePath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      installProcess.stdout.on('data', (data) => {
        log.info(`dpkg stdout: ${data}`);
      });

      installProcess.stderr.on('data', (data) => {
        log.info(`dpkg stderr: ${data}`);
      });

      installProcess.on('close', (code) => {
        if (code === 0) {
          log.info('Update installed successfully');
          // Clean up downloaded file
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            log.warn('Could not delete temp file:', e);
          }
          
          // Restart application after a delay
          setTimeout(() => {
            log.info('Restarting application...');
            process.exit(0);
          }, 3000);
          
          resolve();
        } else {
          reject(new Error(`Installation failed with code: ${code}`));
        }
      });

      installProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  private sendToRenderer(channel: string, data?: unknown): void {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  public dispose(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }
}
