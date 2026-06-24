import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { StorageAdapter } from '@viseed/types'
import type { StorageProviderRegistry } from './storage-provider-registry'

export type { StorageAdapter } from '@viseed/types'

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

  isLocal(): boolean {
    return true
  }
}

/** `local` is built into core; any other type is resolved from plugins. */
export type StorageType = 'local' | (string & {})

export type StorageConfig =
  | { type: 'local'; uploadDir?: string }
  | ({ type: string } & Record<string, unknown>)

/**
 * Builds a storage adapter from a resolved (decrypted) storage config.
 *
 * Only `local` is built in. Remote providers are looked up in the
 * plugin-contributed {@link StorageProviderRegistry}; when a provider is not
 * registered (e.g. its plugin is disabled) the local adapter is used as a safe
 * fallback so media routes keep working.
 */
export function createStorageAdapter(
  config: StorageConfig,
  registry?: StorageProviderRegistry,
): StorageAdapter {
  if (config.type === 'local') {
    return new LocalStorageAdapter(
      typeof config.uploadDir === 'string' ? config.uploadDir : undefined,
    )
  }

  const provider = registry?.get(config.type)
  if (!provider) {
    console.warn(
      `[media] No storage provider registered for type "${config.type}". ` +
        'Falling back to local storage. Is the provider plugin installed and enabled?',
    )
    return new LocalStorageAdapter()
  }

  return provider.createAdapter(config as Record<string, unknown>)
}
