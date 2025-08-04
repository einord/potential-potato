import SMB2 from "v9u-smb2";
import path from "path";
import { currentSmbSettings, SmbSettings } from ".";
import * as os from 'os'

export interface RemoteSettings {
    refreshRate: number,
    passepartoutColor?: string,
    passepartoutWidth?: number,
}

export let remoteSettings: RemoteSettings | undefined = undefined
const defaultRemoteSettings: RemoteSettings = {
    refreshRate: 60 * 1000, // Default to 60 seconds
};

let smbClient: SMB2;
const IMAGE_EXTS = /\.(jpe?g|png|gif|bmp|webp)$/i;

export async function loadSmbImage(currentFileName?: string) {
  // Init SMB client with current settings
  await initSmb();

  const rootDir = currentSmbSettings.directory;
  
  // First load the latest settings
  await loadRemoteSettings(rootDir);
  
  const {dir, files} = await listImagesInDir(rootDir);
  if (files.length === 0) {
    throw new Error(`Inga bilder hittades i ${dir}`);
  } else {
    console.log(`${files.length} files found`);
  }

  // Filter out current file to avoid showing the same image twice
  let availableFiles = files;
  if (currentFileName && files.length > 1) {
    availableFiles = files.filter(file => file !== currentFileName);
    console.log(`Filtered out current file '${currentFileName}', ${availableFiles.length} files available`);
  }
  
  // If all files were filtered out (shouldn't happen but safety check)
  if (availableFiles.length === 0) {
    availableFiles = files;
    console.warn('All files filtered out, using original list');
  }

  const chosen = pickRandom(availableFiles);
  console.log("Loading file: ", chosen);
  const data64 = await readImageAsBase64(dir, chosen);

  // Close the SMB client after use
  closeSmb();

  // returnerar både filnamn och data
  return {
    fileName: chosen,
    settings: remoteSettings,
    dataUrl: `data:image/${path.extname(chosen).slice(1)};base64,${data64}`,
  };
}

async function initSmb() {
  const smbSettings: SmbSettings = currentSmbSettings;

  if (!smbSettings.host || !smbSettings.share) {
    console.error("SMB settings are incomplete. Cannot initialize SMB client.");
    return;
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
  smbClient = new SMB2(config);

  // console.log("SMB client created with settings:", config);
  console.log("SMB client created");
}

function closeSmb() {
  if (smbClient) {
    smbClient.disconnect()
    console.log("SMB client closed.")
  } else {
    console.warn("No SMB client to close.")
  }
}

export async function loadRemoteSettings(dir: string) {
  const settingsFileName = 'settings.json'
  const settingsFile = await smbClient.readFile(`${dir}/${settingsFileName}`)
  
  // Read settingsfile as text and parse it as JSON
  try {
    remoteSettings = JSON.parse(settingsFile.toString()) as RemoteSettings
    console.log("Loaded settings:", remoteSettings);
  } catch {
    remoteSettings = remoteSettings ?? defaultRemoteSettings
    console.warn("Failed to parse settings file as JSON.")
  }
}

async function listImagesInDir(dir: string): Promise<{dir: string, files: string[]}> {
  const now = new Date()
  const currentMonthDir = `${dir}/${(now.getMonth() + 1).toString().padStart(2, '0')}`
  const currentDateDir = `${currentMonthDir}-${now.getDate().toString().padStart(2, '0')}`

  console.log('currentDateDir', currentDateDir)
  if (await smbClient.exists(currentDateDir)) {
    const allFiles = (await smbClient.readdir(currentDateDir)).filter(x => IMAGE_EXTS.test(x))
    console.log('current date files', allFiles)
    return {dir: currentDateDir, files: allFiles}
  } else if (await smbClient.exists(currentMonthDir)) {
    const allFiles = (await smbClient.readdir(currentMonthDir)).filter(x => IMAGE_EXTS.test(x))
    console.log('current month', allFiles)
    return {dir: currentMonthDir, files: allFiles}
  }

  const allFiles = (await smbClient.readdir(dir)).filter(x => IMAGE_EXTS.test(x))
  console.log('non specific files', allFiles)
  return {dir, files: allFiles}
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function readImageAsBase64(
  dir: string,
  fileName: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    smbClient.readFile(`${dir}/${fileName}`, (err, data) => {
      if (err) return reject(err);
      resolve((data as unknown as Buffer).toString("base64"));
    });
  });
}
