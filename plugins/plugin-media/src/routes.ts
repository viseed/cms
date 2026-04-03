import type { CMSRouteContextHelpers } from '@hana/types'
import { mediaQuerySchema } from '@hana/validator'
import { Hono } from 'hono'
import { LocalStorageAdapter, type StorageAdapter } from './storage'

export interface MediaRouteOptions {
  storage?: StorageAdapter
}

export function setupMediaRoutes(
  app: Hono,
  helpers: CMSRouteContextHelpers,
  options?: MediaRouteOptions,
): void {
  const media = new Hono()
  const adapter = options?.storage ?? new LocalStorageAdapter()

  media.get('/', async (c) => {
    const query = mediaQuerySchema.safeParse(c.req.query())
    if (!query.success) {
      return c.json({ error: 'Invalid query', details: query.error.flatten() }, 400)
    }
    const { site } = helpers.resolveRequestContext(c)
    // TODO: implement DB query with .where(eq(mediaFiles.siteId, site.id))
    return c.json({ files: [], pagination: query.data, siteId: site.id })
  })

  media.post('/upload', async (c) => {
    const formData = await c.req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400)
    }

    const { site } = helpers.resolveRequestContext(c)
    const uniqueName = `${Date.now()}-${file.name}`
    const buffer = await file.arrayBuffer()
    const path = await adapter.save(uniqueName, buffer, site.id)

    // TODO: insert record into DB with siteId: site.id
    return c.json(
      {
        message: 'File uploaded',
        file: {
          filename: uniqueName,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          path,
          url: adapter.getUrl(path, site.id),
          siteId: site.id,
        },
      },
      201,
    )
  })

  media.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const { site } = helpers.resolveRequestContext(c)
    // TODO: look up file in DB with .where(and(eq(mediaFiles.siteId, site.id), eq(mediaFiles.id, id)))
    return c.json({ message: 'File deleted', id, siteId: site.id })
  })

  app.route('/api/media', media)
}
