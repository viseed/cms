import type { CMSPlugin } from '@hana/types'
import { setupMediaRoutes } from './routes'
import { mediaSchema } from './schema'
import { LocalStorageAdapter } from './storage'

export interface MediaPluginOptions {
  uploadDir?: string
}

export function mediaPlugin(options?: MediaPluginOptions): CMSPlugin {
  const storage = options?.uploadDir ? new LocalStorageAdapter(options.uploadDir) : undefined
  return {
    name: 'media',
    version: '0.1.0',
    schema: mediaSchema,
    routes: (app, helpers) => setupMediaRoutes(app, helpers, { storage }),
  }
}

export { mediaFiles, mediaSchema } from './schema'
export { LocalStorageAdapter, type StorageAdapter } from './storage'
