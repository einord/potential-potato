export interface RemoteSettings {
    refreshRate: number,
    passepartoutColor?: string,
    passepartoutWidth?: number,
    transitionDuration?: number, // in milliseconds, 0 = no transition
    showAppVersion: boolean
}

export const defaultRemoteSettings: RemoteSettings = {
    refreshRate: 20000,
    transitionDuration: 0,
    passepartoutColor: '#222',
    passepartoutWidth: 150,
    showAppVersion: true
}