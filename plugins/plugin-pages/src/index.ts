import type { CMSPlugin, ThemeRenderRequestContext } from '@hana/types'
import type { DatabaseInstance } from '@hana/core'
import { setupPagesRoutes } from './routes'
import { pagesSchema, pages } from './schema'
import { eq, and } from 'drizzle-orm'

let db: DatabaseInstance | null = null

export function pagesPlugin(): CMSPlugin {
  return {
    name: 'pages',
    version: '0.1.0',
    schema: pagesSchema,
    hooks: {
      'cms:init': (cms) => {
        db = cms.getDatabase() as DatabaseInstance
      },
      'theme:beforeRender': async (
        layoutKey: string,
        data: Record<string, unknown>,
        reqCtx: ThemeRenderRequestContext,
      ) => {
        if (!db) return data

        if (layoutKey === 'page') {
          const slug = reqCtx.params.slug
          if (slug) {
            const page = await db
              .select()
              .from(pages)
              .where(and(eq(pages.slug, slug), eq(pages.status, 'published')))
              .get()

            return { ...data, page: page ?? null }
          }
        }

        return data
      },
    },
    routes: (app, helpers) => setupPagesRoutes(app, helpers),
  }
}

export { pagesSchema, pages } from './schema'
