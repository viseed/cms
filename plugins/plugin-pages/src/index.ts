import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type DatabaseInstance, renderBodyWithToc } from '@viseed/core'
import { type CMSPlugin, HOOK_KEY, type ThemeRenderRequestContext } from '@viseed/types'
import { and, eq } from 'drizzle-orm'
import { setupPagesRoutes } from './routes'
import { pages, pagesSchema } from './schema'

const __dirname = dirname(fileURLToPath(import.meta.url))

let db: DatabaseInstance | null = null

export function pagesPlugin(): CMSPlugin {
  return {
    name: 'pages',
    version: '0.1.0',
    schema: pagesSchema,
    admin: {
      menuItems: [
        {
          id: 'pages',
          label: 'Pages',
          icon: '☰',
          path: '/pages',
          siteScoped: true,
          requiredPermissions: ['site.content.read'],
          order: 15,
          componentExport: 'PagesView',
        },
      ],
      bundlePath: resolve(__dirname, '../dist/admin/index.js'),
    },
    hooks: {
      [HOOK_KEY.CMS_INIT]: (cms) => {
        db = cms.getDatabase() as DatabaseInstance
      },
      [HOOK_KEY.THEME_BEFORE_RENDER]: async (
        layoutKey: string,
        data: Record<string, unknown>,
        reqCtx: ThemeRenderRequestContext,
      ) => {
        if (!db) return data

        if (layoutKey === 'page') {
          const slug = reqCtx.params.slug
          if (slug) {
            const [page] = await db
              .select()
              .from(pages)
              .where(and(eq(pages.slug, slug), eq(pages.status, 'published')))

            if (page) {
              const { bodyHtml, tocHtml } = renderBodyWithToc(page.body, {
                withToc: page.tocEnabled,
              })
              return { ...data, page: { ...page, bodyHtml, tocHtml } }
            }
            return { ...data, page: null }
          }
        }

        return data
      },
    },
    routes: (app, helpers) => setupPagesRoutes(app, helpers, () => db),
  }
}

export { pages, pagesSchema } from './schema'
