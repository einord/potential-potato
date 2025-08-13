export interface UpdateInfo {
  version: string;
}

export interface DownloadProgressInfo {
  percent: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
}
