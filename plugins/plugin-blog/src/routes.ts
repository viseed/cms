import type { DatabaseInstance } from '@viseed/core'
import type { CMSRouteContextHelpers } from '@viseed/types'
import {
  contentQuerySchema,
  createCategorySchema,
  createContentSchema,
  updateCategorySchema,
  updateContentSchema,
} from '@viseed/validator'
import { and, eq, like, sql } from 'drizzle-orm'
import type { Hono } from 'hono'
import { categories, posts } from './schema'

export function setupBlogRoutes(
  _app: Hono,
  helpers: CMSRouteContextHelpers,
  getDb: () => DatabaseInstance | null,
): void {
  const blog = helpers.createSubApp('/api/blog')

  blog.get('/posts', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const query = contentQuerySchema.safeParse(c.req.query())
    if (!query.success) {
      return c.json({ error: 'Invalid query', details: query.error.flatten() }, 400)
    }

    const { site } = helpers.resolveRequestContext(c)
    const { page, limit, status, search, sortBy, sortOrder } = query.data
    const offset = (page - 1) * limit

    const conditions = [eq(posts.siteId, site.id)]
    if (status) conditions.push(eq(posts.status, status))
    if (search) conditions.push(like(posts.title, `%${search}%`))

    const where = conditions.length === 1 ? conditions[0] : and(...conditions)

    const sortColumn =
      sortBy === 'title' ? posts.title : sortBy === 'updatedAt' ? posts.updatedAt : posts.createdAt
    const orderFn = sortOrder === 'asc' ? sql`${sortColumn} asc` : sql`${sortColumn} desc`

    const rows = await db
      .select()
      .from(posts)
      .where(where)
      .orderBy(orderFn)
      .limit(limit)
      .offset(offset)

    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(posts).where(where)

    return c.json({
      posts: rows,
      pagination: { page, limit, total: countResult?.count ?? 0 },
    })
  })

  blog.get('/posts/:slug', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const slug = c.req.param('slug')
    console.log('slug', slug)
    const { site } = helpers.resolveRequestContext(c)

    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.siteId, site.id), eq(posts.slug, slug)))

    if (!post) return c.json({ error: 'Post not found' }, 404)
    return c.json({ post })
  })

  blog.post('/posts', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const body = await c.req.json()
    const result = createContentSchema.safeParse(body)
    if (!result.success) {
      return c.json({ error: 'Invalid input', details: result.error.flatten() }, 400)
    }

    const { site } = helpers.resolveRequestContext(c)
    const id = crypto.randomUUID()
    const now = new Date()

    await db.insert(posts).values({
      id,
      siteId: site.id,
      title: result.data.title,
      slug: result.data.slug,
      body: result.data.body ?? null,
      excerpt: body.excerpt ?? null,
      status: result.data.status ?? 'draft',
      authorId: body.authorId ?? null,
      categoryId: body.categoryId ?? null,
      metaSeo: result.data.metaSeo ?? null,
      schemaOrg: result.data.schemaOrg ?? null,
      tocEnabled: result.data.tocEnabled ?? false,
      publishedAt: result.data.status === 'published' ? now : null,
      createdAt: now,
      updatedAt: now,
    })

    const [created] = await db.select().from(posts).where(eq(posts.id, id))
    return c.json({ post: created }, 201)
  })

  blog.put('/posts/:id', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const id = c.req.param('id')
    const body = await c.req.json()
    const result = updateContentSchema.safeParse(body)
    if (!result.success) {
      return c.json({ error: 'Invalid input', details: result.error.flatten() }, 400)
    }

    const { site } = helpers.resolveRequestContext(c)
    const [existing] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, id), eq(posts.siteId, site.id)))

    if (!existing) return c.json({ error: 'Post not found' }, 404)

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (result.data.title !== undefined) updates.title = result.data.title
    if (result.data.slug !== undefined) updates.slug = result.data.slug
    if (result.data.body !== undefined) updates.body = result.data.body
    if (result.data.status !== undefined) {
      updates.status = result.data.status
      if (result.data.status === 'published' && !existing.publishedAt) {
        updates.publishedAt = new Date()
      }
    }
    if (body.excerpt !== undefined) updates.excerpt = body.excerpt
    if (body.categoryId !== undefined) updates.categoryId = body.categoryId
    if (body.authorId !== undefined) updates.authorId = body.authorId
    if (result.data.metaSeo !== undefined) updates.metaSeo = result.data.metaSeo
    if (result.data.schemaOrg !== undefined) updates.schemaOrg = result.data.schemaOrg
    if (result.data.tocEnabled !== undefined) updates.tocEnabled = result.data.tocEnabled

    await db.update(posts).set(updates).where(eq(posts.id, id))

    const [updated] = await db.select().from(posts).where(eq(posts.id, id))
    return c.json({ post: updated })
  })

  blog.delete('/posts/:id', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const id = c.req.param('id')
    const { site } = helpers.resolveRequestContext(c)

    const [existing] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, id), eq(posts.siteId, site.id)))

    if (!existing) return c.json({ error: 'Post not found' }, 404)

    await db.delete(posts).where(eq(posts.id, id))
    return c.json({ message: 'Post deleted', id })
  })

  blog.get('/categories', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const { site } = helpers.resolveRequestContext(c)
    const rows = await db.select().from(categories).where(eq(categories.siteId, site.id))

    return c.json({ categories: rows })
  })

  blog.post('/categories', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const body = await c.req.json()
    const result = createCategorySchema.safeParse(body)
    if (!result.success) {
      return c.json({ error: 'Invalid input', details: result.error.flatten() }, 400)
    }

    const { site } = helpers.resolveRequestContext(c)
    const id = crypto.randomUUID()

    await db.insert(categories).values({
      id,
      siteId: site.id,
      name: result.data.name,
      slug: result.data.slug,
      description: result.data.description ?? null,
      createdAt: new Date(),
    })

    const [created] = await db.select().from(categories).where(eq(categories.id, id))
    return c.json({ category: created }, 201)
  })

  blog.put('/categories/:id', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const id = c.req.param('id')
    const body = await c.req.json()
    const result = updateCategorySchema.safeParse(body)
    if (!result.success) {
      return c.json({ error: 'Invalid input', details: result.error.flatten() }, 400)
    }

    const { site } = helpers.resolveRequestContext(c)
    const [existing] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.siteId, site.id)))

    if (!existing) return c.json({ error: 'Category not found' }, 404)

    const updates: Record<string, unknown> = {}
    if (result.data.name !== undefined) updates.name = result.data.name
    if (result.data.slug !== undefined) updates.slug = result.data.slug
    if (result.data.description !== undefined) updates.description = result.data.description

    if (Object.keys(updates).length > 0) {
      await db.update(categories).set(updates).where(eq(categories.id, id))
    }

    const [updated] = await db.select().from(categories).where(eq(categories.id, id))
    return c.json({ category: updated })
  })

  blog.delete('/categories/:id', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const id = c.req.param('id')
    const { site } = helpers.resolveRequestContext(c)

    const [existing] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.siteId, site.id)))

    if (!existing) return c.json({ error: 'Category not found' }, 404)

    // Detach posts from this category before deleting
    await db.update(posts).set({ categoryId: null }).where(eq(posts.categoryId, id))
    await db.delete(categories).where(eq(categories.id, id))

    return c.json({ message: 'Category deleted', id })
  })
}
