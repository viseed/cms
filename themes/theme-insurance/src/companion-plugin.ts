import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DatabaseInstance } from '@hana/core'
import { type CMSPlugin, HOOK_KEY, type ThemeRenderRequestContext } from '@hana/types'
import { asc, eq } from 'drizzle-orm'
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { Hono } from 'hono'
import { homeCarouselItems, insuranceCompanionSchema } from './schema.js'

export { homeCarouselItems, insuranceCompanionSchema }

const __dirname = dirname(fileURLToPath(import.meta.url))

// ---------------------------------------------------------------------------
// Local mirror of blog_posts columns we need (avoids importing plugin-blog)
// ---------------------------------------------------------------------------

const blogPostsRef = pgTable('blog_posts', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  excerpt: text('excerpt'),
  status: text('status'),
  publishedAt: timestamp('published_at'),
  categoryId: text('category_id'),
})

// ---------------------------------------------------------------------------
// Companion plugin factory
// ---------------------------------------------------------------------------

let db: DatabaseInstance | null = null

export function insuranceCompanionPlugin(): CMSPlugin {
  return {
    name: 'insurance-companion',
    version: '0.1.0',
    schema: insuranceCompanionSchema,
    admin: {
      menuItems: [
        {
          id: 'home-carousel',
          label: 'Home Carousel',
          icon: '⊞',
          path: '/home-carousel',
          siteScoped: true,
          requiredPermissions: ['site.content.read'],
          order: 90,
          componentExport: 'HomeCarouselView',
        },
      ],
      bundlePath: resolve(__dirname, '../dist/companion-admin/index.js'),
    },
    hooks: {
      [HOOK_KEY.CMS_INIT]: (cms) => {
        db = cms.getDatabase() as DatabaseInstance
      },
      [HOOK_KEY.THEME_BEFORE_RENDER]: async (
        layoutKey: string,
        data: Record<string, unknown>,
        _reqCtx: ThemeRenderRequestContext,
      ) => {
        if (!db || layoutKey !== 'home') return data

        try {
          const carouselRows = await db
            .select()
            .from(homeCarouselItems)
            .where(eq(homeCarouselItems.active, '1'))
            .orderBy(asc(homeCarouselItems.sortOrder))

          if (carouselRows.length === 0) return { ...data, carouselItems: [] }

          const posts = (await db
            .select()
            .from(blogPostsRef)
            .where(eq(blogPostsRef.status, 'published'))) as Array<{
            id: string
            title: string
            slug: string
            excerpt: string | null
            status: string | null
            publishedAt: Date | null
            categoryId: string | null
          }>

          const postMap = new Map(posts.map((p) => [p.id, p]))

          const carouselItems = carouselRows
            .map((row) => {
              const post = postMap.get(row.postId)
              if (!post) return null
              return {
                id: row.id,
                postId: row.postId,
                title: post.title,
                slug: post.slug,
                excerpt: post.excerpt ?? '',
                imageUrl: row.imageUrl ?? '/theme/static/images/insurance-default.jpg',
                sortOrder: row.sortOrder,
              }
            })
            .filter(Boolean)

          return { ...data, carouselItems }
        } catch {
          return { ...data, carouselItems: [] }
        }
      },
    },
    routes: (app) => {
      const router = new Hono()

      router.get('/carousel', async (c) => {
        if (!db) return c.json({ error: 'Database not ready' }, 503)

        const rows = await db
          .select()
          .from(homeCarouselItems)
          .orderBy(asc(homeCarouselItems.sortOrder))

        return c.json({ items: rows })
      })

      router.post('/carousel', async (c) => {
        if (!db) return c.json({ error: 'Database not ready' }, 503)

        const body = await c.req.json()
        const items: Array<{
          id?: string
          postId: string
          imageUrl?: string
          sortOrder: number
          active?: string
        }> = body.items ?? []

        const existing = await db.select().from(homeCarouselItems)
        const existingIds = new Set<string>(existing.map((r) => r.id))
        const incomingIds = new Set<string>(
          items.filter((i) => i.id).map((i) => i.id as string),
        )

        for (const id of Array.from(existingIds)) {
          if (!incomingIds.has(id)) {
            await db.delete(homeCarouselItems).where(eq(homeCarouselItems.id, id))
          }
        }

        for (const item of items) {
          if (item.id && existingIds.has(item.id)) {
            await db
              .update(homeCarouselItems)
              .set({
                postId: item.postId,
                imageUrl: item.imageUrl ?? null,
                sortOrder: item.sortOrder,
                active: item.active ?? '1',
              })
              .where(eq(homeCarouselItems.id, item.id))
          } else {
            const newId = crypto.randomUUID()
            await db.insert(homeCarouselItems).values({
              id: newId,
              postId: item.postId,
              imageUrl: item.imageUrl ?? null,
              sortOrder: item.sortOrder,
              active: item.active ?? '1',
              createdAt: new Date(),
            })
          }
        }

        const saved = await db
          .select()
          .from(homeCarouselItems)
          .orderBy(asc(homeCarouselItems.sortOrder))

        return c.json({ items: saved })
      })

      router.get('/carousel/posts', async (c) => {
        if (!db) return c.json({ error: 'Database not ready' }, 503)

        const posts = await db
          .select()
          .from(blogPostsRef)
          .where(eq(blogPostsRef.status, 'published'))

        return c.json({ posts })
      })

      app.route('/api/theme/insurance', router)
    },
  }
}
