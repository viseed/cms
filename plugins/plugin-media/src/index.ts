import type { DatabaseInstance } from '@hana/core'
import { type CMSPlugin, HOOK_KEY } from '@hana/types'
import { setupMediaRoutes } from './routes'
import { mediaSchema } from './schema'
import { LocalStorageAdapter } from './storage'

export interface MediaPluginOptions {
  uploadDir?: string
}

export function mediaPlugin(options?: MediaPluginOptions): CMSPlugin {
  const storage = options?.uploadDir ? new LocalStorageAdapter(options.uploadDir) : undefined
  let db: DatabaseInstance | null = null

  return {
    name: 'media',
    version: '0.1.0',
    schema: mediaSchema,
    hooks: {
      [HOOK_KEY.CMS_INIT]: (cms) => {
        db = cms.getDatabase() as DatabaseInstance
      },
    },
    routes: (app, helpers) => setupMediaRoutes(app, helpers, () => db, { storage }),
  }
}

export { mediaFiles, mediaSchema } from './schema'
export { LocalStorageAdapter, type StorageAdapter } from './storage'
