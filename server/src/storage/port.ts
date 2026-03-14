export interface StorageFile {
  key: string       // storage-relative path, e.g. "attachments/abc123.png"
  mimeType: string
  size: number
}

export interface StoragePort {
  put(key: string, data: Buffer, mimeType: string): Promise<StorageFile>
  delete(key: string): Promise<void>
  deleteMany(keys: string[]): Promise<void>
  getUrl(key: string): string
  listKeys(prefix?: string): Promise<string[]>
}
