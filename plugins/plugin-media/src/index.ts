import type { CMSPlugin } from '@hana/types'
import { mediaSchema } from './schema'
import { setupMediaRoutes } from './routes'

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

export { mediaSchema, mediaFiles } from './schema'
export { LocalStorageAdapter, type StorageAdapter } from './storage'
