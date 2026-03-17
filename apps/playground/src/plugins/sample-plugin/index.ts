import type { CMSPlugin } from '@hana/types'
import { Hono } from 'hono'

/**
 * Sample plugin demonstrating the plugin API.
 * Used for development testing within the playground.
 */
export function samplePlugin(): CMSPlugin {
  return {
    name: 'sample',
    version: '0.1.0',

    hooks: {
      'cms:init': async () => {
        console.log('[sample-plugin] Initialized')
      },
      'cms:ready': async () => {
        console.log('[sample-plugin] CMS is ready')
      },
    },

    routes: (app: Hono) => {
      app.get('/api/sample/hello', (c) =>
        c.json({ message: 'Hello from sample plugin!' }),
      )

      app.get('/api/sample/health', (c) =>
        c.json({ status: 'ok', plugin: 'sample', timestamp: Date.now() }),
      )
    },
  }
}
