import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

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
    const siteDir = join(this.uploadDir, siteId)
    await mkdir(siteDir, { recursive: true })
    const filePath = join(siteDir, filename)
    await writeFile(filePath, Buffer.from(data))
    return filePath
  }

  async delete(path: string): Promise<void> {
    try {
      await unlink(path)
    } catch {
      // Ignore "file not found" errors
    }
  }

  getUrl(path: string, siteId: string): string {
    const normalized = path.replace(/\\/g, '/')
    const uploadsIndex = normalized.indexOf('uploads/')
    if (uploadsIndex !== -1) {
      return `/${normalized.slice(uploadsIndex)}`
    }
    return `/uploads/${siteId}/${dirname(path).split('/').pop() ?? ''}/${path.split('/').pop()}`
  }
}
