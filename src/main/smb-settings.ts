export interface SmbSettings {
    host?: string
    port?: number
    share?: string
    domain?: string
    username?: string
    password?: string
    directory?: string
}

export const defaultSmbSettings: SmbSettings = {
    host: '',
    port: 445,
    share: '',
    domain: '',
    username: '',
    password: '',
    directory: ''
}
