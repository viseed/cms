import type { CMSRouteContextHelpers } from '@hana/types'
import type { DatabaseInstance } from '@hana/core'
import { contentQuerySchema, createContentSchema, updateContentSchema } from '@hana/validator'
import { Hono } from 'hono'
import { pages } from './schema'
import { eq, and, like, sql } from 'drizzle-orm'

export function setupPagesRoutes(
  app: Hono,
  helpers: CMSRouteContextHelpers,
  getDb: () => DatabaseInstance | null,
): void {
  const pagesApi = new Hono()

  pagesApi.get('/', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const query = contentQuerySchema.safeParse(c.req.query())
    if (!query.success) {
      return c.json({ error: 'Invalid query', details: query.error.flatten() }, 400)
    }

    const { site } = helpers.resolveRequestContext(c)
    const { page, limit, status, search, sortBy, sortOrder } = query.data
    const offset = (page - 1) * limit

    const conditions = [eq(pages.siteId, site.id)]
    if (status) conditions.push(eq(pages.status, status))
    if (search) conditions.push(like(pages.title, `%${search}%`))

    const where = conditions.length === 1 ? conditions[0] : and(...conditions)

    const sortColumn = sortBy === 'title' ? pages.title : sortBy === 'updatedAt' ? pages.updatedAt : pages.createdAt
    const orderFn = sortOrder === 'asc' ? sql`${sortColumn} asc` : sql`${sortColumn} desc`

    const rows = await db
      .select()
      .from(pages)
      .where(where)
      .orderBy(orderFn)
      .limit(limit)
      .offset(offset)
      .all()

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(pages)
      .where(where)
      .get()

    return c.json({
      pages: rows,
      pagination: { page, limit, total: countResult?.count ?? 0 },
    })
  })

  pagesApi.get('/:slug', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const slug = c.req.param('slug')
    const { site } = helpers.resolveRequestContext(c)

    const page = await db
      .select()
      .from(pages)
      .where(and(eq(pages.siteId, site.id), eq(pages.slug, slug)))
      .get()

    if (!page) return c.json({ error: 'Page not found' }, 404)
    return c.json({ page })
  })

  pagesApi.post('/', async (c) => {
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

    await db.insert(pages).values({
      id,
      siteId: site.id,
      title: result.data.title,
      slug: result.data.slug,
      body: result.data.body ?? null,
      excerpt: body.excerpt ?? null,
      status: result.data.status ?? 'draft',
      authorId: body.authorId ?? null,
      publishedAt: result.data.status === 'published' ? now : null,
      createdAt: now,
      updatedAt: now,
    })

    const created = await db.select().from(pages).where(eq(pages.id, id)).get()
    return c.json({ page: created }, 201)
  })

  pagesApi.put('/:id', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const id = c.req.param('id')
    const body = await c.req.json()
    const result = updateContentSchema.safeParse(body)
    if (!result.success) {
      return c.json({ error: 'Invalid input', details: result.error.flatten() }, 400)
    }

    const { site } = helpers.resolveRequestContext(c)
    const existing = await db
      .select()
      .from(pages)
      .where(and(eq(pages.id, id), eq(pages.siteId, site.id)))
      .get()

    if (!existing) return c.json({ error: 'Page not found' }, 404)

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
    if (body.authorId !== undefined) updates.authorId = body.authorId

    await db.update(pages).set(updates).where(eq(pages.id, id))

    const updated = await db.select().from(pages).where(eq(pages.id, id)).get()
    return c.json({ page: updated })
  })

  pagesApi.delete('/:id', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const id = c.req.param('id')
    const { site } = helpers.resolveRequestContext(c)

    const existing = await db
      .select()
      .from(pages)
      .where(and(eq(pages.id, id), eq(pages.siteId, site.id)))
      .get()

    if (!existing) return c.json({ error: 'Page not found' }, 404)

    await db.delete(pages).where(eq(pages.id, id))
    return c.json({ message: 'Page deleted', id })
  })

  app.route('/api/pages', pagesApi)
}
