import { app } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'

const userDataPath = app.getPath('userData')
export const smbSettingsFile = join(userDataPath, 'pp-smb.json')
export let currentSmbSettings: SmbSettings | undefined = undefined

export interface SmbSettings {
    host?: string
    port?: number
    share?: string
    domain?: string
    username?: string
    password?: string
    directory?: string
}

const defaultSmbSettings: SmbSettings = {
    host: '',
    port: 445,
    share: '',
    domain: '',
    username: '',
    password: '',
    directory: ''
}

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
        currentSmbSettings = JSON.parse(raw) as SmbSettings;
        // console.log(`Settings loaded from ${smbSettingsFile}:`, currentSmbSettings);
        console.log(`Settings loaded from ${smbSettingsFile}`);
    } catch {
        console.error(`Failed to load settings from ${smbSettingsFile}.`);
        currentSmbSettings = defaultSmbSettings; // Fallback to default settings
    }

    return currentSmbSettings
}


