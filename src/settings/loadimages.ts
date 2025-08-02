import SMB2 from "v9u-smb2";
import path from "path";
import { currentSmbSettings, SmbSettings } from ".";
import * as os from 'os'

export interface RemoteSettings {
    refreshRate: number
}

export let remoteSettings: RemoteSettings | undefined = undefined
const defaultRemoteSettings: RemoteSettings = {
    refreshRate: 60 * 1000, // Default to 60 seconds
};

let smbClient: SMB2;
const IMAGE_EXTS = /\.(jpe?g|png|gif|bmp|webp)$/i;

export async function loadSmbImage() {
  // Init SMB client with current settings
  await initSmb();

  const dir = currentSmbSettings.directory;
  
  // First load the latest settings
  await loadRemoteSettings(dir);
  
  const files = await listImagesInDir(dir);
  if (files.length === 0) {
    throw new Error(`Inga bilder hittades i ${dir}`);
  } else {
    console.log(`${files.length} files found`);
  }

  const chosen = pickRandom(files);
  console.log("Loading file: ", chosen);
  const data64 = await readImageAsBase64(dir, chosen);

  // Close the SMB client after use
  closeSmb();

  // returnerar både filnamn och data
  return {
    fileName: chosen,
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


async function listImagesInDir(dir: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    smbClient.readdir(dir, (err, files) => {
      if (err) return reject(err);
      resolve(files.filter((f: string) => IMAGE_EXTS.test(f)));
    });
  });
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
