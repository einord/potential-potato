import { app } from 'electron';
import { join } from 'path';
import { promises as fs } from 'fs';

const userDataPath = app.getPath('userData');
export const settingsFile = join(userDataPath, 'settings.json');
export let currentSettings: Settings | undefined = undefined;

interface Settings {
    refreshRate: number;
}

const defaultSettings: Settings = {
    refreshRate: 60 * 1000, // Default to 60 seconds
};

export async function ensureSettingsFile() {
    try {
        await fs.access(settingsFile);
    } catch {
        // If the file does not exist, create it with default settings
        await fs.mkdir(userDataPath, { recursive: true });
        await fs.writeFile(settingsFile, JSON.stringify(defaultSettings, null, 2), 'utf-8');
        console.log(`Settings file created with default settings at ${settingsFile}.`);
    }
}

export async function loadSettings() {
    try {
        const raw = await fs.readFile(settingsFile, 'utf-8');
        currentSettings = JSON.parse(raw) as Settings;
        console.log(`Settings loaded from ${settingsFile}:`, currentSettings);
    } catch {
        console.error(`Failed to load settings from ${settingsFile}.`);
        currentSettings = defaultSettings; // Fallback to default settings
    }

    return currentSettings
}


