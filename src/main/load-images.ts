import SMB2 from 'v9u-smb2'
import path, { join } from 'path'
import * as os from 'os'
import { defaultSmbSettings, SmbSettings } from './smb-settings'
import { promises as fs } from 'fs'
import { watch } from 'chokidar'
import { app, BrowserWindow } from 'electron'
import { RemoteSettings } from 'src/shared-types/remote-settings'

export interface CachedImage {
    dataUrl: string;
    settings?: RemoteSettings;
    fileName: string;
}

const userDataPath = app.getPath('userData')
export const smbSettingsFile = join(userDataPath, 'pp-smb.json')
export let currentSmbSettings: SmbSettings = defaultSmbSettings
let cachedImageData: CachedImage | undefined = undefined
let refreshTimer: NodeJS.Timeout | string | number | undefined
let timeout = 10

export let remoteSettings: RemoteSettings | undefined = undefined
let lastRemoteSettingsJson: string | undefined = undefined
const defaultRemoteSettings: RemoteSettings = {
    refreshRate: 60 * 1000, // Default to 60 seconds
    showAppVersion: true,
}

let smbClient: SMB2
const IMAGE_EXTS = /\.(jpe?g|png|gif|bmp|webp)$/i

export async function ensureSmbSettingsFile() {
    try {
        await fs.access(smbSettingsFile);
    } catch {
        // If the file does not exist, create it with default settings
        await fs.mkdir(userDataPath, { recursive: true });
        await fs.writeFile(smbSettingsFile, JSON.stringify(defaultSmbSettings, null, 2), 'utf-8');
        console.log(`Settings file created with default settings at ${smbSettingsFile}.`);
    }
}

export async function loadSmbSettings() {
    try {
        const raw = await fs.readFile(smbSettingsFile, 'utf-8');
        currentSmbSettings = Object.assign({}, defaultSmbSettings, JSON.parse(raw) as SmbSettings);
        // console.log(`Settings loaded from ${smbSettingsFile}:`, currentSmbSettings);
        console.log(`Settings loaded from ${smbSettingsFile}`);
    } catch {
        console.error(`Failed to load settings from ${smbSettingsFile}.`);
        currentSmbSettings = defaultSmbSettings; // Fallback to default settings
    }

    return currentSmbSettings
}

export function watchSmbSettingsFile(mainWindow: BrowserWindow) {
    const watcher = watch(smbSettingsFile, { ignoreInitial: true });
    watcher.on('change', async () => {
        console.log(`SMB settings file changed: ${smbSettingsFile}. Reloading SMB settings...`);
        await loadSmbSettings();
        setRefreshTimer();
        mainWindow.webContents.send('smb-settings-updated', currentSmbSettings);
    });
}

function setRefreshTimer() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }

    timeout = getTimeoutFromRefreshRate(remoteSettings?.refreshRate)
    refreshTimer = setInterval(loadNextImage, timeout)
    console.log(`Refresh timer set to ${timeout} milliseconds`);
}

function getTimeoutFromRefreshRate(refreshRate: number | undefined): number {
    return (refreshRate || 10) * 1000
}

export async function loadNextImage(mainWindow: BrowserWindow) {
  if (!mainWindow || mainWindow.isDestroyed()) return

  console.log(`Refreshing image...`);
  try {
    // Pass current filename to avoid loading the same image twice
    const currentFileName = cachedImageData?.fileName;
    const imageData = await loadSmbImage(currentFileName);
    console.log('Random image loaded from SMB: ', imageData.fileName);
    if (imageData) {
      // Cache the image data
      cachedImageData = imageData;

      // Emit remote settings update if changed
      try {
        const settingsJson = JSON.stringify(imageData.settings ?? {});
        if (settingsJson !== lastRemoteSettingsJson) {
          lastRemoteSettingsJson = settingsJson;
          mainWindow.webContents.send('remote-settings-updated', imageData.settings);
        }
      } catch {
        // ignore JSON stringify errors
        console.error('Error stringifying remote settings');
      }
      
      // Send the image data to the renderer process
      mainWindow.webContents.send('new-image', imageData.dataUrl);
    }

    if(getTimeoutFromRefreshRate(remoteSettings?.refreshRate) != timeout) {
      console.log('Remote timer settings changed, resetting refresh timer.');
      setRefreshTimer()
    }
  } catch (error) {
    console.error('Error loading next image:', error);
    setRefreshTimer();
  }
}

export async function loadSmbImage(currentFileName?: string): Promise<CachedImage> {
  // Init SMB client with current settings
  await initSmb(currentSmbSettings)

  const rootDir = currentSmbSettings.directory

  // First load the latest settings
  await loadRemoteSettings(rootDir)

  const { dir, files } = await listImagesInDir(rootDir)
  if (files.length === 0) {
    throw new Error(`Inga bilder hittades i ${dir}`)
  } else {
    console.log(`${files.length} files found`)
  }

  // Filter out current file to avoid showing the same image twice
  let availableFiles = files
  if (currentFileName && files.length > 1) {
    availableFiles = files.filter((file) => file !== currentFileName)
    console.log(
      `Filtered out current file '${currentFileName}', ${availableFiles.length} files available`
    )
  }

  // If all files were filtered out (shouldn't happen but safety check)
  if (availableFiles.length === 0) {
    availableFiles = files
    console.warn('All files filtered out, using original list')
  }

  const chosen = pickRandom(availableFiles)
  console.log('Loading file: ', chosen)
  const data64 = await readImageAsBase64(dir, chosen)

  // Close the SMB client after use
  closeSmb()

  // returnerar både filnamn och data
  return {
    fileName: chosen,
    settings: remoteSettings,
    dataUrl: `data:image/${path.extname(chosen).slice(1)};base64,${data64}`,
  }
}

async function initSmb(currentSmbSettings: SmbSettings) {
  const smbSettings: SmbSettings = currentSmbSettings

  if (!smbSettings.host || !smbSettings.share) {
    console.error('SMB settings are incomplete. Cannot initialize SMB client.')
    return
  }

  const config = {
    share: `\\\\${smbSettings.host}\\${smbSettings.share}`,
    domain: smbSettings.domain ?? '',
    username: smbSettings.username ?? '',
    password: smbSettings.password ?? '',
    port: 445,
    workstation: os.hostname(),
    autoCloseTimeout: 0, // håller klienten öppen
  }
  smbClient = new SMB2(config)

  // console.log("SMB client created with settings:", config);
  console.log('SMB client created')
}

function closeSmb() {
  if (smbClient) {
    smbClient.disconnect()
    console.log('SMB client closed.')
  } else {
    console.warn('No SMB client to close.')
  }
}

/// <summary>
/// Normalizes directory path for SMB operations, handling root directory cases
/// </summary>
function normalizeSmbPath(dir: string, fileName: string): string {
  // Handle empty, root, or current directory cases
  const normalizedDir = !dir || dir === '/' || dir === './' || dir === '.' ? '' : dir

  if (!normalizedDir) {
    return fileName
  }

  // Remove leading slash if present to avoid double slashes
  const cleanDir = normalizedDir.startsWith('/') ? normalizedDir.slice(1) : normalizedDir
  return `${cleanDir}/${fileName}`
}

export async function loadRemoteSettings(dir?: string) {
  const settingsFileName = 'settings.json'
  const settingsPath = normalizeSmbPath(dir ?? '', settingsFileName)
  console.log(`Loading settings from SMB path: ${settingsPath}`)
  const settingsFile = await smbClient.readFile(settingsPath)

  // Read settingsfile as text and parse it as JSON
  try {
    remoteSettings = JSON.parse(settingsFile.toString()) as RemoteSettings
    console.log('Loaded settings:', remoteSettings)
  } catch {
    remoteSettings = remoteSettings ?? defaultRemoteSettings
    console.warn('Failed to parse settings file as JSON.')
  }
}

async function listImagesInDir(dir?: string): Promise<{ dir: string; files: string[] }> {
  const now = new Date()
  const monthStr = (now.getMonth() + 1).toString().padStart(2, '0')
  const dateStr = now.getDate().toString().padStart(2, '0')

  const currentMonthDir = normalizeSmbPath(dir ?? '', monthStr)
  const currentDateDir = `${currentMonthDir}-${dateStr}`

  console.log('currentDateDir', currentDateDir)
  if (await smbClient.exists(currentDateDir)) {
    const allFiles = (await smbClient.readdir(currentDateDir)).filter((x) => IMAGE_EXTS.test(x))
    console.log('current date files', allFiles)
    return { dir: currentDateDir, files: allFiles }
  } else if (await smbClient.exists(currentMonthDir)) {
    const allFiles = (await smbClient.readdir(currentMonthDir)).filter((x) => IMAGE_EXTS.test(x))
    console.log('current month', allFiles)
    return { dir: currentMonthDir, files: allFiles }
  }

  // For root directory, use empty string or the normalized directory
  const rootDir = !dir || dir === '/' || dir === './' || dir === '.' ? '' : dir
  const allFiles = (await smbClient.readdir(rootDir)).filter((x) => IMAGE_EXTS.test(x))
  console.log('non specific files', allFiles)
  return { dir: rootDir, files: allFiles }
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function readImageAsBase64(dir: string, fileName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const filePath = normalizeSmbPath(dir, fileName)
    console.log(`Reading image from SMB path: ${filePath}`)
    smbClient.readFile(filePath, (err, data) => {
      if (err) return reject(err)
      resolve((data as unknown as Buffer).toString('base64'))
    })
  })
}
