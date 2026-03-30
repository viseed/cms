import type { CMSPlugin } from '@hana/types'
import { setupMediaRoutes } from './routes'
import { mediaSchema } from './schema'

export interface MediaPluginOptions {
  uploadDir?: string
}

export function mediaPlugin(options?: MediaPluginOptions): CMSPlugin {
  return {
    name: 'media',
    version: '0.1.0',
    schema: mediaSchema,
    routes: (app) => setupMediaRoutes(app),
  }
}

export { mediaFiles, mediaSchema } from './schema'
export { LocalStorageAdapter, type StorageAdapter } from './storage'
