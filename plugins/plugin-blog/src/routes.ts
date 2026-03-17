import { Hono } from 'hono'
import { createContentSchema, updateContentSchema, contentQuerySchema } from '@hana/validator'

export function setupBlogRoutes(app: Hono): void {
  const blog = new Hono()

  blog.get('/posts', async (c) => {
    const query = contentQuerySchema.safeParse(c.req.query())
    if (!query.success) {
      return c.json({ error: 'Invalid query', details: query.error.flatten() }, 400)
    }
    // TODO: implement DB query with pagination
    return c.json({ posts: [], pagination: query.data })
  })

  blog.get('/posts/:slug', async (c) => {
    const slug = c.req.param('slug')
    // TODO: implement DB lookup by slug
    return c.json({ post: null, slug })
  })

  blog.post('/posts', async (c) => {
    const body = await c.req.json()
    const result = createContentSchema.safeParse(body)
    if (!result.success) {
      return c.json({ error: 'Invalid input', details: result.error.flatten() }, 400)
    }
    // TODO: implement DB insert
    return c.json({ message: 'Post created', data: result.data }, 201)
  })

  blog.put('/posts/:id', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json()
    const result = updateContentSchema.safeParse(body)
    if (!result.success) {
      return c.json({ error: 'Invalid input', details: result.error.flatten() }, 400)
    }
    // TODO: implement DB update
    return c.json({ message: 'Post updated', id, data: result.data })
  })

  blog.delete('/posts/:id', async (c) => {
    const id = c.req.param('id')
    // TODO: implement DB delete
    return c.json({ message: 'Post deleted', id })
  })

  blog.get('/categories', async (c) => {
    // TODO: implement DB query
    return c.json({ categories: [] })
  })

  blog.post('/categories', async (c) => {
    const body = await c.req.json()
    // TODO: implement DB insert
    return c.json({ message: 'Category created', data: body }, 201)
  })

  app.route('/api/blog', blog)
}
