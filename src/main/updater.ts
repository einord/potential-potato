import { app, BrowserWindow, shell } from 'electron'
import log from 'electron-log'
import * as os from 'node:os'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { spawn } from 'node:child_process'
import { UPDATE_REPO as BUILT_IN_UPDATE_REPO } from './app-config'

interface GitHubRelease {
  tag_name: string
  name: string
  published_at: string
  assets?: Array<{ name: string; browser_download_url: string; size: number }>
}

export class Updater {
  private mainWindow: BrowserWindow
  private updateCheckInterval: NodeJS.Timeout | null = null
  private currentVersion: string
  private owner: string | null
  private repo: string | null

  // Linux AppImage management
  private readonly LINUX_APP_DIR = path.join(os.homedir(), 'Applications')
  private readonly LINUX_BIN_LINK = path.join(os.homedir(), '.local', 'bin', 'potential-potato')
  private readonly LINUX_AUTOSTART_DIR = path.join(os.homedir(), '.config', 'autostart')
  private readonly LINUX_DESKTOP_FILE = path.join(this.LINUX_AUTOSTART_DIR, 'potential-potato.desktop')
  private readonly PRODUCT_PREFIX = 'Potential-Potato-'

  constructor(mainWindow: BrowserWindow, currentVersion: string) {
    this.mainWindow = mainWindow
    this.currentVersion = currentVersion

    // Built-in config as default; can be overridden by env var if present
    const inlineRepo = BUILT_IN_UPDATE_REPO
    const repoEnv = process.env.UPDATE_REPO // expected format: "owner/repo"

    const repoSource = repoEnv && repoEnv.includes('/') ? repoEnv : inlineRepo

    if (repoSource && repoSource.includes('/')) {
      const [owner, repo] = repoSource.split('/')
      this.owner = owner
      this.repo = repo
      if (repoEnv && repoEnv !== inlineRepo) {
        log.info('UPDATE_REPO overridden by environment variable')
      }
    } else {
      this.owner = null
      this.repo = null
      log.warn(
        'Updater disabled: set UPDATE_REPO (built-in config or env) to "owner/repo" to enable hourly update checks.'
      )
    }

    this.setup()
  }

  private setup(): void {
    // Linux housekeeping: ensure autostart, update symlink, cleanup old versions
    if (process.platform === 'linux') {
      try {
        this.ensureAutostartDesktop()
      } catch (e) {
        log.warn('Failed to ensure autostart desktop file', e)
      }
      try {
        // Only repair symlink if missing or broken to avoid overriding a correct link
        const needRepair = !fs.existsSync(this.LINUX_BIN_LINK) || !this._symlinkTargetExists(this.LINUX_BIN_LINK)
        log.info(`Symlink check: exists=${fs.existsSync(this.LINUX_BIN_LINK)} targetExists=${this._symlinkTargetExists(this.LINUX_BIN_LINK)}`)
        if (needRepair) {
          this.updateSymlinkToLatest()
        }
      } catch (e) {
        log.warn('Failed to validate/update symlink to latest', e)
      }
      try {
        this.cleanupOldAppImages(2)
      } catch (e) {
        log.warn('Failed to cleanup old AppImages', e)
      }
    }

    // Initial check
    this.checkForUpdates()

    // Periodic checks (every hour)
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates()
    }, 60 * 60 * 1000)
  }

  public dispose(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval)
      this.updateCheckInterval = null
    }
  }

  // Public method to trigger an immediate update check
  public async checkNow(): Promise<void> {
    await this.checkForUpdates()
  }

  private async checkForUpdates(): Promise<void> {
    try {
      if (!this.owner || !this.repo) return

      log.info('Checking for updates...')
      this.sendToRenderer('update-checking')

      const response = await fetch(
        `https://api.github.com/repos/${this.owner}/${this.repo}/releases/latest`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
            // Per GitHub API guidance to avoid 403s
            'User-Agent': `${this.repo}-updater`
          }
        }
      )

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const release: GitHubRelease = (await response.json()) as GitHubRelease
      const latestVersion = release.tag_name.replace(/^v/, '')

      log.info(`Current version: ${this.currentVersion}, Latest version: ${latestVersion}`)

      if (this.isNewerVersion(latestVersion, this.currentVersion)) {
        log.info(`Update available: ${latestVersion}`)
        this.sendToRenderer('update-available', { version: latestVersion })
        // Start download for current platform (macOS prioritized here)
        const asset = this.findAssetForPlatform(release)
        if (asset) {
          // If Linux/AppImage, pre-clean old versions to free space (keep only current and the upcoming file)
          if (process.platform === 'linux' && asset.name.endsWith('.AppImage')) {
            const preTargetPath = path.join(this.LINUX_APP_DIR, asset.name)
            try {
              this.cleanupAppImagesKeep([process.execPath, preTargetPath])
              log.info('Pre-cleaned old AppImages before download')
            } catch (e) {
              log.warn('Pre-clean failed', e)
            }
          }

          await this.downloadAssetWithProgress(asset)

          // After download, ensure only the current and the newly downloaded file remain
          if (process.platform === 'linux' && asset.name.endsWith('.AppImage')) {
            const postTargetPath = path.join(this.LINUX_APP_DIR, asset.name)
            try {
              this.cleanupAppImagesKeep([process.execPath, postTargetPath])
              log.info('Post-cleaned old AppImages after download')
            } catch (e) {
              log.warn('Post-clean failed', e)
            }
          }

          // Notify downloaded, then schedule restart with countdown
          this.sendToRenderer('update-downloaded', { version: latestVersion })
          this.scheduleRestartCountdown(5)
        } else {
          log.warn('No suitable asset found for platform; skipping download')
        }
      } else {
        log.info('No update available')
        this.sendToRenderer('update-not-available', { version: this.currentVersion })
      }
    } catch (error) {
      log.error('Error checking for updates:', error)
      this.sendToRenderer('update-error', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  // Simple semver-like comparison: 1.2.3 vs 1.2.10
  private isNewerVersion(latest: string, current: string): boolean {
    const latestParts = latest.split('.').map(Number)
    const currentParts = current.split('.').map(Number)

    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const a = latestParts[i] || 0
      const b = currentParts[i] || 0
      if (a > b) return true
      if (a < b) return false
    }
    return false
  }

  private sendToRenderer(channel: string, data?: unknown): void {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }

  private findAssetForPlatform(release: GitHubRelease) {
    const assets = release.assets || []
    const plat = process.platform

    if (plat === 'darwin') {
      return (
        assets.find(a => a.name.toLowerCase().endsWith('.dmg')) ||
        assets.find(a => a.name.toLowerCase().endsWith('.zip')) ||
        null
      )
    }

    if (plat === 'linux') {
      const arch = this.getLinuxAppImageArch()
      // Prefer exact-arch AppImage with correct product name, then any matching product name AppImage as fallback
      return (
        assets.find(a => this.isProductAppImage(a.name) && a.name.includes(arch)) ||
        assets.find(a => this.isProductAppImage(a.name)) ||
        null
      )
    }

    return null
  }

  private getLinuxAppImageArch(): string {
    // Map Node.js arch to electron-builder artifact arch names
    // x64 -> x86_64, arm64 -> arm64 (aarch64 in some cases), arm -> armv7l
    const a = process.arch
    if (a === 'x64') return 'x86_64'
    if (a === 'arm64') return 'arm64'
    if (a === 'arm') return 'armv7l'
    return a
  }

  private async downloadAssetWithProgress(asset: { name: string; browser_download_url: string; size: number }): Promise<void> {
    const url = asset.browser_download_url
    const total = asset.size || 0

    // Choose target directory per platform
    const targetDir = process.platform === 'linux' && asset.name.endsWith('.AppImage')
      ? this.LINUX_APP_DIR
      : path.join(os.homedir(), 'Downloads')

    const filePath = path.join(targetDir, asset.name)

    await fs.promises.mkdir(path.dirname(filePath), { recursive: true })

    // Retry logic with resume support
    const maxRetries = 3
    let attempt = 0
    let downloaded = 0

    // If a partial file exists, try to resume
    try {
      const stat = await fs.promises.stat(filePath)
      if (stat.isFile() && stat.size > 0 && stat.size < total) {
        downloaded = stat.size
      }
    } catch {}

    while (attempt < maxRetries) {
      try {
        const headers: Record<string, string> = { 'User-Agent': `${this.repo}-updater` }
        if (downloaded > 0) {
          headers['Range'] = `bytes=${downloaded}-`
        }

        const res = await fetch(url, { headers })
        if (!res.ok || !res.body) throw new Error(`Failed to download update: ${res.status}`)

        // Determine expected total for progress if server supports partial content
        let expectedTotal = total
        const contentRange = res.headers.get('content-range') || res.headers.get('Content-Range')
        if (contentRange) {
          const m = /bytes \d+-\d+\/(\d+)/i.exec(contentRange)
          if (m && m[1]) expectedTotal = parseInt(m[1], 10)
        } else {
          const cl = res.headers.get('content-length') || res.headers.get('Content-Length')
          if (!expectedTotal && cl) expectedTotal = parseInt(cl, 10)
        }

        // Open file stream (append if resuming)
        const fileStream = fs.createWriteStream(filePath, { flags: downloaded > 0 ? 'a' : 'w' })

        const reader = (res.body as any).getReader?.()
        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (value) {
              const buf = Buffer.from(value)
              const canWrite = fileStream.write(buf)
              downloaded += buf.length
              if (expectedTotal > 0) {
                const percent = Math.max(0, Math.min(100, Math.round((downloaded / expectedTotal) * 100)))
                this.sendToRenderer('update-download-progress', { percent })
              }
              if (!canWrite) {
                await new Promise<void>((resolve) => fileStream.once('drain', resolve))
              }
            }
          }
          await new Promise<void>((resolve, reject) => {
            fileStream.end(() => resolve())
            fileStream.on('error', reject)
          })
        } else {
          // Fallback: stream without granular progress using WHATWG stream
          await new Promise<void>((resolve, reject) => {
            res.body?.pipeTo(new WritableStream({
              write: (chunk: any) => {
                const buf = Buffer.from(chunk)
                const ok = (fileStream as any).write(buf)
                downloaded += buf.length
                if (expectedTotal > 0) {
                  const percent = Math.max(0, Math.min(100, Math.round((downloaded / expectedTotal) * 100)))
                  this.sendToRenderer('update-download-progress', { percent })
                }
                if (!ok) {
                  return new Promise<void>((resolve2) => (fileStream as any).once('drain', resolve2))
                }
              },
              close: () => { (fileStream as any).end(); resolve() },
              abort: (reason) => { try { (fileStream as any).destroy() } catch {} ; reject(reason) }
            }))
          })
        }

        // Success, apply post-download handling
        if (process.platform === 'darwin') {
          try {
            const result = await shell.openPath(filePath)
            if (result) shell.showItemInFolder(filePath)
          } catch (e) {
            log.warn('Failed to open downloaded update', e)
            shell.showItemInFolder(filePath)
          }
        } else if (process.platform === 'linux' && filePath.endsWith('.AppImage')) {
          try {
            await fs.promises.chmod(filePath, 0o755)
          } catch (e) {
            log.warn('Failed to chmod AppImage', e)
          }
          // Remember the exact file we just downloaded
          this._pendingLinuxAppImagePath = filePath
          // Point the stable symlink directly to this file
          try {
            const linkDir = path.dirname(this.LINUX_BIN_LINK)
            try { fs.mkdirSync(linkDir, { recursive: true }) } catch {}
            try { fs.unlinkSync(this.LINUX_BIN_LINK) } catch {}
            fs.symlinkSync(filePath, this.LINUX_BIN_LINK)
            fs.chmodSync(this.LINUX_BIN_LINK, 0o755)
            log.info(`Symlink updated ${this.LINUX_BIN_LINK} -> ${filePath}`)
          } catch (e) {
            log.warn('Symlink update failed', e)
          }
          // Plan to launch via symlink (preferred); will fallback to direct path if missing
          this._pendingLinuxAppImageLink = this.LINUX_BIN_LINK
        }

        // Exit retry loop on success
        return
      } catch (err) {
        attempt += 1
        log.warn(`Download attempt ${attempt} failed`, err)
        if (attempt >= maxRetries) {
          throw err
        }
        // Small delay before retry
        await new Promise((r) => setTimeout(r, 1000 * attempt))
        // On retry, keep current downloaded size from existing file
        try {
          const stat = await fs.promises.stat(filePath)
          if (stat.isFile()) downloaded = stat.size
        } catch {
          downloaded = 0
        }
      }
    }
  }

  private _pendingLinuxAppImageLink: string | null = null
  private _pendingLinuxAppImagePath: string | null = null

  private scheduleRestartCountdown(seconds: number, onZero?: () => void) {
    let remaining = seconds
    const tick = setInterval(() => {
      remaining -= 1
      this.sendToRenderer('update-restarting', { secondsRemaining: remaining })
      if (remaining <= 0) {
        clearInterval(tick)
        try {
          if (onZero) {
            onZero()
          } else if (process.platform === 'linux') {
            // Prefer launching the symlink; ensure it points to the freshly downloaded AppImage
            const pending = this._pendingLinuxAppImagePath
            const link = this._pendingLinuxAppImageLink
            let launchPath: string | null = null

            if (link && fs.existsSync(link)) {
              const target = this._readlinkSafe(link)
              log.info(`Symlink at restart: ${link} -> ${target}`)
              if (pending && target && path.resolve(target) !== path.resolve(pending)) {
                // Try to repoint the link
                try {
                  try { fs.unlinkSync(link) } catch {}
                  fs.symlinkSync(pending, link)
                  fs.chmodSync(link, 0o755)
                  log.info(`Symlink repointed ${link} -> ${pending}`)
                } catch (e) {
                  log.warn('Failed to repoint symlink, will launch direct file', e)
                }
              }
              // Prefer using symlink after attempt to repoint
              launchPath = link
            }

            // Fallbacks
            if (!launchPath || !fs.existsSync(launchPath)) {
              if (pending && fs.existsSync(pending)) launchPath = pending
            }

            if (!launchPath) {
              log.error('No launch path available for AppImage (symlink/file missing). Aborting restart.')
              this.sendToRenderer('update-error', 'Kunde inte starta den nya versionen (fil saknas).')
              return
            }
            try {
              const child = spawn(launchPath, [], { detached: true, stdio: 'ignore' })
              child.unref()
              app.exit(0)
              return
            } catch (e) {
              log.error('Failed to launch AppImage', e)
              this.sendToRenderer('update-error', 'Kunde inte starta den nya versionen.')
              return
            }
          } else {
            // Default relaunch (macOS/others)
            app.relaunch()
            app.exit(0)
          }
        } catch (e) {
          log.error('Error during restart', e)
          app.exit(0)
        }
      }
    }, 1000)
    // Send initial state
    this.sendToRenderer('update-restarting', { secondsRemaining: remaining })
  }

  // ----- Linux helpers -----
  private getArchHint(): string {
    if (process.arch === 'arm') return 'armv7l'
    if (process.arch === 'arm64') return 'arm64'
    if (process.arch === 'x64') return 'x86_64'
    return process.arch
  }

  private listAppImages(): { file: string; version: string; mtime: number }[] {
    try { fs.mkdirSync(this.LINUX_APP_DIR, { recursive: true }) } catch {}
    const arch = this.getArchHint()
    return (fs.readdirSync(this.LINUX_APP_DIR)
      .filter(f => this.isProductAppImage(f))
      .filter(f => f.includes(arch))
      .map(f => {
        const abs = path.join(this.LINUX_APP_DIR, f)
        const st = fs.statSync(abs)
        const m = f.match(/-(\d+\.\d+\.\d+)[^-]*\.AppImage$/)
        return { file: abs, version: m?.[1] ?? '0.0.0', mtime: st.mtimeMs }
      }))
  }

  private semverCompareDesc(a: string, b: string): number {
    const ap = a.split('.').map(n => parseInt(n, 10))
    const bp = b.split('.').map(n => parseInt(n, 10))
    for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
      const ai = ap[i] ?? 0, bi = bp[i] ?? 0
      if (ai > bi) return -1
      if (ai < bi) return 1
    }
    return 0
  }

  private sortedByNewest(files: { file: string; version: string; mtime: number }[]) {
    return files.sort((x, y) => {
      const byVer = this.semverCompareDesc(x.version, y.version)
      if (byVer !== 0) return byVer
      return y.mtime - x.mtime
    })
  }

  private updateSymlinkToLatest(): void {
    if (process.platform !== 'linux') return
    const all = this.sortedByNewest(this.listAppImages())
    if (all.length === 0) return
    const latest = all[0].file
    const linkDir = path.dirname(this.LINUX_BIN_LINK)
    try { fs.mkdirSync(linkDir, { recursive: true }) } catch {}
    try { try { fs.unlinkSync(this.LINUX_BIN_LINK) } catch {}
      fs.symlinkSync(latest, this.LINUX_BIN_LINK)
      fs.chmodSync(this.LINUX_BIN_LINK, 0o755)
      log.info(`Symlink updated ${this.LINUX_BIN_LINK} -> ${latest}`)
    } catch (e) {
      log.warn('Failed to create/update symlink', e)
    }
  }

  private _readlinkSafe(linkPath: string): string | null {
    try {
      const target = fs.readlinkSync(linkPath)
      // If target is relative, resolve relative to link directory
      if (!path.isAbsolute(target)) {
        return path.resolve(path.dirname(linkPath), target)
      }
      return target
    } catch {
      return null
    }
  }

  private _symlinkTargetExists(linkPath: string): boolean {
    const target = this._readlinkSafe(linkPath)
    return !!(target && fs.existsSync(target))
  }

  private isProductAppImage(name: string): boolean {
    const n = name.toLowerCase()
    const startsOk = n.startsWith('potential potato') || n.startsWith('potential.potato') || n.startsWith('potential-potato')
    return startsOk && n.endsWith('.appimage')
  }

  private ensureAutostartDesktop(): void {
    if (process.platform !== 'linux') return
    try { fs.mkdirSync(this.LINUX_AUTOSTART_DIR, { recursive: true }) } catch {}
    const execPath = this.LINUX_BIN_LINK
    const desktop = [
      '[Desktop Entry]',
      'Type=Application',
      'Name=Potential Potato',
      'Comment=Start Potential Potato at login',
      `Exec=${execPath}`,
      'Icon=potential-potato',
      'X-GNOME-Autostart-enabled=true',
      'Terminal=false',
      'Categories=Utility;'
    ].join('\n') + '\n'

    try {
      fs.writeFileSync(this.LINUX_DESKTOP_FILE, desktop, { encoding: 'utf-8', mode: 0o644 })
      log.info(`Autostart desktop file ensured at ${this.LINUX_DESKTOP_FILE}`)
    } catch (e) {
      log.warn('Failed to write autostart desktop file', e)
    }
  }

  private cleanupOldAppImages(keep = 2): void {
    if (process.platform !== 'linux') return
    const currentExec = process.execPath
    const all = this.sortedByNewest(this.listAppImages())
    const toDelete = all.slice(keep)
    for (const f of toDelete) {
      if (path.resolve(f.file) === path.resolve(currentExec)) continue
      try {
        fs.unlinkSync(f.file)
        log.info('Deleted old AppImage:', f.file)
      } catch (e) {
        log.warn('Failed to delete old AppImage:', f.file, e)
      }
    }
  }

  // Clean up AppImage files keeping only the provided absolute paths (if they exist) and the running binary
  private cleanupAppImagesKeep(keepPaths: string[]): void {
    if (process.platform !== 'linux') return
    const keepResolved = new Set(
      keepPaths.filter(Boolean).map(p => path.resolve(p))
    )
    // Always keep the running binary
    keepResolved.add(path.resolve(process.execPath))

    const all = this.listAppImages()
    for (const f of all) {
      const abs = path.resolve(f.file)
      if (keepResolved.has(abs)) continue
      try {
        fs.unlinkSync(abs)
        log.info('Deleted old AppImage (keep-set):', abs)
      } catch (e) {
        log.warn('Failed to delete AppImage (keep-set):', abs, e)
      }
    }
  }
}
