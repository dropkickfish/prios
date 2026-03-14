import fs from 'node:fs/promises'
import path from 'node:path'
import type { StoragePort, StorageFile } from './port.js'

export class LocalStorageAdapter implements StoragePort {
  constructor(
    private readonly uploadDir: string,
    private readonly publicUrl: string
  ) {}

  async put(key: string, data: Buffer, mimeType: string): Promise<StorageFile> {
    const filePath = path.join(this.uploadDir, key)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, data)
    return { key, mimeType, size: data.byteLength }
  }

  async delete(key: string): Promise<void> {
    await fs.unlink(path.join(this.uploadDir, key)).catch(() => {})
  }

  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map(k => this.delete(k)))
  }

  getUrl(key: string): string {
    return `${this.publicUrl}/${key}`
  }

  async listKeys(prefix = ''): Promise<string[]> {
    const dir = path.join(this.uploadDir, prefix)
    const keys: string[] = []
    async function walk(current: string, base: string) {
      const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => [])
      for (const e of entries) {
        const full = path.join(current, e.name)
        if (e.isDirectory()) await walk(full, base)
        else keys.push(path.relative(base, full))
      }
    }
    await walk(dir, this.uploadDir)
    return keys
  }
}
