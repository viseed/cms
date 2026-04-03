import type { CMSRouteContextHelpers } from '@hana/types'
import { contentQuerySchema, createContentSchema, updateContentSchema } from '@hana/validator'
import { Hono } from 'hono'

export function setupBlogRoutes(app: Hono, helpers: CMSRouteContextHelpers): void {
  const blog = new Hono()

  blog.get('/posts', async (c) => {
    const query = contentQuerySchema.safeParse(c.req.query())
    if (!query.success) {
      return c.json({ error: 'Invalid query', details: query.error.flatten() }, 400)
    }
    const { site } = helpers.resolveRequestContext(c)
    // TODO: implement DB query with .where(eq(posts.siteId, site.id))
    return c.json({ posts: [], pagination: query.data, siteId: site.id })
  })

  blog.get('/posts/:slug', async (c) => {
    const slug = c.req.param('slug')
    const { site } = helpers.resolveRequestContext(c)
    // TODO: implement DB lookup with .where(and(eq(posts.siteId, site.id), eq(posts.slug, slug)))
    return c.json({ post: null, slug, siteId: site.id })
  })

  blog.post('/posts', async (c) => {
    const body = await c.req.json()
    const result = createContentSchema.safeParse(body)
    if (!result.success) {
      return c.json({ error: 'Invalid input', details: result.error.flatten() }, 400)
    }
    const { site } = helpers.resolveRequestContext(c)
    // TODO: implement DB insert with siteId: site.id
    return c.json({ message: 'Post created', data: { ...result.data, siteId: site.id } }, 201)
  })

  blog.put('/posts/:id', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json()
    const result = updateContentSchema.safeParse(body)
    if (!result.success) {
      return c.json({ error: 'Invalid input', details: result.error.flatten() }, 400)
    }
    const { site } = helpers.resolveRequestContext(c)
    // TODO: implement DB update with .where(and(eq(posts.siteId, site.id), eq(posts.id, id)))
    return c.json({ message: 'Post updated', id, data: result.data, siteId: site.id })
  })

  blog.delete('/posts/:id', async (c) => {
    const id = c.req.param('id')
    const { site } = helpers.resolveRequestContext(c)
    // TODO: implement DB delete with .where(and(eq(posts.siteId, site.id), eq(posts.id, id)))
    return c.json({ message: 'Post deleted', id, siteId: site.id })
  })

  blog.get('/categories', async (c) => {
    const { site } = helpers.resolveRequestContext(c)
    // TODO: implement DB query with .where(eq(categories.siteId, site.id))
    return c.json({ categories: [], siteId: site.id })
  })

  blog.post('/categories', async (c) => {
    const body = await c.req.json()
    const { site } = helpers.resolveRequestContext(c)
    // TODO: implement DB insert with siteId: site.id
    return c.json({ message: 'Category created', data: { ...body, siteId: site.id } }, 201)
  })

  app.route('/api/blog', blog)
}
