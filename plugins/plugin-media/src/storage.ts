import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export interface StorageAdapter {
  save(filename: string, data: ArrayBuffer, siteId: string): Promise<string>
  delete(path: string): Promise<void>
  getUrl(path: string, siteId: string): string
}

export class LocalStorageAdapter implements StorageAdapter {
  private uploadDir: string

  constructor(uploadDir = './uploads') {
    this.uploadDir = uploadDir
  }

  async save(filename: string, data: ArrayBuffer, siteId: string): Promise<string> {
    const dir = join(this.uploadDir, siteId)
    await mkdir(dir, { recursive: true })
    const filePath = join(dir, filename)
    await Bun.write(filePath, data)
    return filePath
  }

  async delete(path: string): Promise<void> {
    const { unlink } = await import('node:fs/promises')
    await unlink(path)
  }

  getUrl(path: string, siteId: string): string {
    const basename = path.split(/[\\/]/).pop()
    return `/uploads/${siteId}/${basename}`
  }
}
