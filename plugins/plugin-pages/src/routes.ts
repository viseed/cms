import type { CMSRouteContextHelpers } from '@hana/types'
import { Hono } from 'hono'

export function setupPagesRoutes(app: Hono, _helpers: CMSRouteContextHelpers): void {
  const pagesApi = new Hono()

  pagesApi.get('/', async (c) => {
    return c.json({ pages: [] })
  })

  pagesApi.get('/:slug', async (c) => {
    const slug = c.req.param('slug')
    return c.json({ page: null, slug })
  })

  pagesApi.post('/', async (c) => {
    const body = await c.req.json()
    return c.json({ message: 'Page created', data: body }, 201)
  })

  pagesApi.put('/:id', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json()
    return c.json({ message: 'Page updated', id, data: body })
  })

  pagesApi.delete('/:id', async (c) => {
    const id = c.req.param('id')
    return c.json({ message: 'Page deleted', id })
  })

  app.route('/api/pages', pagesApi)
}
