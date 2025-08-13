import { shell } from 'electron';
import log from 'electron-log';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
export class UniversalUpdater {
    mainWindow;
    updateCheckInterval = null;
    currentVersion;
    owner;
    repo;
    platform;
    constructor(mainWindow, currentVersion, owner, repo) {
        this.mainWindow = mainWindow;
        this.currentVersion = currentVersion;
        this.owner = owner;
        this.repo = repo;
        this.platform = process.platform;
        this.setupUpdater();
    }
    setupUpdater() {
        log.info(`Setting up universal updater for platform: ${this.platform}`);
        // Initial check
        this.checkForUpdates();
        // Set up periodic checks (every hour)
        this.updateCheckInterval = setInterval(() => {
            this.checkForUpdates();
        }, 60 * 60 * 1000);
    }
    async checkForUpdates() {
        try {
            log.info('Checking for updates...');
            this.sendToRenderer('update-checking');
            const response = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/releases/latest`, {
                headers: {
                    'Accept': 'application/vnd.github+json',
                    // Provide a UA per GitHub API guidance to avoid 403s
                    'User-Agent': `${this.repo}-updater`
                }
            });
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }
            const release = await response.json();
            const latestVersion = release.tag_name.replace(/^v/, '');
            log.info(`Current version: ${this.currentVersion}, Latest version: ${latestVersion}`);
            if (this.isNewerVersion(latestVersion, this.currentVersion)) {
                log.info(`Update available: ${latestVersion}`);
                this.sendToRenderer('update-available', { version: latestVersion });
                // Find appropriate asset for current platform
                const asset = this.findAssetForPlatform(release.assets);
                if (asset) {
                    log.info(`Found asset: ${asset.name}`);
                    await this.handleUpdate(asset);
                }
                else {
                    const arch = this.getSystemArchitecture();
                    log.warn(`No asset found for platform: ${this.platform}, architecture: ${arch}`);
                    this.sendToRenderer('update-error', `No update available for your platform (${this.platform}/${arch})`);
                }
            }
            else {
                log.info('No update available');
                this.sendToRenderer('update-not-available', { version: this.currentVersion });
            }
        }
        catch (error) {
            log.error('Error checking for updates:', error);
            this.sendToRenderer('update-error', error instanceof Error ? error.message : 'Unknown error');
        }
    }
    findAssetForPlatform(assets) {
        const arch = this.getSystemArchitecture();
        switch (this.platform) {
            case 'win32':
                return assets.find(asset => asset.name.endsWith('.exe') || asset.name.includes('Setup.exe'));
            case 'darwin':
                // Prefer DMG if available, otherwise fall back to ZIP; don't require 'darwin' in name to be robust to naming differences
                return (assets.find(asset => asset.name.toLowerCase().endsWith('.dmg')) ||
                    assets.find(asset => asset.name.toLowerCase().endsWith('.zip')));
            case 'linux':
                return assets.find(asset => asset.name.endsWith('.deb') && asset.name.includes(arch));
            default:
                return null;
        }
    }
    isNewerVersion(latest, current) {
        const latestParts = latest.split('.').map(Number);
        const currentParts = current.split('.').map(Number);
        for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
            const latestPart = latestParts[i] || 0;
            const currentPart = currentParts[i] || 0;
            if (latestPart > currentPart)
                return true;
            if (latestPart < currentPart)
                return false;
        }
        return false;
    }
    getSystemArchitecture() {
        const arch = os.arch();
        switch (arch) {
            case 'x64': return 'amd64';
            case 'arm64': return 'arm64';
            case 'arm': return 'armhf';
            default: return arch;
        }
    }
    async handleUpdate(asset) {
        switch (this.platform) {
            case 'linux':
                await this.downloadAndInstallDeb(asset);
                break;
            case 'win32':
                await this.downloadAndPromptWindows(asset);
                break;
            case 'darwin':
                await this.downloadAndPromptMacOS(asset);
                break;
            default:
                log.warn(`Update handling not implemented for platform: ${this.platform}`);
                this.sendToRenderer('update-error', `Updates not supported on ${this.platform}`);
        }
    }
    async downloadAndInstallDeb(asset) {
        try {
            log.info(`Downloading DEB update: ${asset.name}`);
            const tempDir = os.tmpdir();
            const filePath = path.join(tempDir, asset.name);
            // Download the file
            const response = await fetch(asset.browser_download_url, {
                headers: { 'User-Agent': `${this.repo}-updater` }
            });
            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }
            const buffer = await response.arrayBuffer();
            fs.writeFileSync(filePath, Buffer.from(buffer));
            log.info(`Downloaded to: ${filePath}`);
            this.sendToRenderer('update-downloaded', { version: asset.name });
            // Install the DEB package
            await this.installDebPackage(filePath);
        }
        catch (error) {
            log.error('Error downloading/installing DEB update:', error);
            this.sendToRenderer('update-error', error instanceof Error ? error.message : 'Download failed');
        }
    }
    async downloadAndPromptWindows(asset) {
        try {
            log.info(`Downloading Windows update: ${asset.name}`);
            const downloadsDir = path.join(os.homedir(), 'Downloads');
            const filePath = path.join(downloadsDir, asset.name);
            // Download the file
            const response = await fetch(asset.browser_download_url, {
                headers: { 'User-Agent': `${this.repo}-updater` }
            });
            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }
            const buffer = await response.arrayBuffer();
            fs.writeFileSync(filePath, Buffer.from(buffer));
            log.info(`Downloaded to: ${filePath}`);
            this.sendToRenderer('update-downloaded', { version: asset.name });
            // Open the installer
            log.info('Opening Windows installer...');
            shell.openPath(filePath);
            // Exit current application
            setTimeout(() => {
                log.info('Exiting application for update...');
                process.exit(0);
            }, 2000);
        }
        catch (error) {
            log.error('Error downloading Windows update:', error);
            this.sendToRenderer('update-error', error instanceof Error ? error.message : 'Download failed');
        }
    }
    async downloadAndPromptMacOS(asset) {
        try {
            log.info(`Downloading macOS update: ${asset.name}`);
            const downloadsDir = path.join(os.homedir(), 'Downloads');
            const filePath = path.join(downloadsDir, asset.name);
            // Download the file
            const response = await fetch(asset.browser_download_url, {
                headers: { 'User-Agent': `${this.repo}-updater` }
            });
            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }
            const buffer = await response.arrayBuffer();
            fs.writeFileSync(filePath, Buffer.from(buffer));
            log.info(`Downloaded to: ${filePath}`);
            this.sendToRenderer('update-downloaded', { version: asset.name });
            // Open the downloaded file (DMG/ZIP) to prompt user to install
            log.info('Opening macOS update file...');
            const openResult = await shell.openPath(filePath);
            if (openResult) {
                // openPath returns a non-empty string on error
                log.warn(`Failed to open downloaded update: ${openResult}`);
                // Fall back to showing it in Finder
                shell.showItemInFolder(filePath);
            }
        }
        catch (error) {
            log.error('Error downloading macOS update:', error);
            this.sendToRenderer('update-error', error instanceof Error ? error.message : 'Download failed');
        }
    }
    async installDebPackage(filePath) {
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
                    }
                    catch (e) {
                        log.warn('Could not delete temp file:', e);
                    }
                    // Restart application after a delay
                    setTimeout(() => {
                        log.info('Restarting application...');
                        process.exit(0);
                    }, 3000);
                    resolve();
                }
                else {
                    reject(new Error(`Installation failed with code: ${code}`));
                }
            });
            installProcess.on('error', (error) => {
                reject(error);
            });
        });
    }
    sendToRenderer(channel, data) {
        if (!this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(channel, data);
        }
    }
    dispose() {
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
            this.updateCheckInterval = null;
        }
    }
}
//# sourceMappingURL=universal-updater.js.map