import { Hono } from 'hono'
import { mediaQuerySchema } from '@hana/validator'
import { LocalStorageAdapter, type StorageAdapter } from './storage'

export function setupMediaRoutes(app: Hono, storage?: StorageAdapter): void {
  const media = new Hono()
  const adapter = storage ?? new LocalStorageAdapter()

  media.get('/', async (c) => {
    const query = mediaQuerySchema.safeParse(c.req.query())
    if (!query.success) {
      return c.json({ error: 'Invalid query', details: query.error.flatten() }, 400)
    }
    // TODO: implement DB query with pagination
    return c.json({ files: [], pagination: query.data })
  })

  media.post('/upload', async (c) => {
    const formData = await c.req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400)
    }

    const uniqueName = `${Date.now()}-${file.name}`
    const buffer = await file.arrayBuffer()
    const path = await adapter.save(uniqueName, buffer)

    // TODO: insert record into DB
    return c.json(
      {
        message: 'File uploaded',
        file: {
          filename: uniqueName,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          path,
          url: adapter.getUrl(path),
        },
      },
      201,
    )
  })

  media.delete('/:id', async (c) => {
    const id = c.req.param('id')
    // TODO: look up file in DB, delete from storage and DB
    return c.json({ message: 'File deleted', id })
  })

  app.route('/api/media', media)
}
