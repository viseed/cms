import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export interface StorageAdapter {
  save(filename: string, data: ArrayBuffer): Promise<string>
  delete(path: string): Promise<void>
  getUrl(path: string): string
}

export class LocalStorageAdapter implements StorageAdapter {
  private uploadDir: string

  constructor(uploadDir = './uploads') {
    this.uploadDir = uploadDir
  }

  async save(filename: string, data: ArrayBuffer): Promise<string> {
    await mkdir(this.uploadDir, { recursive: true })
    const filePath = join(this.uploadDir, filename)
    await Bun.write(filePath, data)
    return filePath
  }

  async delete(path: string): Promise<void> {
    const { unlink } = await import('node:fs/promises')
    await unlink(path)
  }

  getUrl(path: string): string {
    return `/uploads/${path.split(/[\\/]/).pop()}`
  }
}
