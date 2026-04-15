import type { DatabaseInstance } from '@hana/core'
import type { CMSRouteContextHelpers } from '@hana/types'
import { mediaQuerySchema } from '@hana/validator'
import { desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { mediaFiles } from './schema'
import { LocalStorageAdapter, type StorageAdapter } from './storage'

export interface MediaRouteOptions {
  storage?: StorageAdapter
}

export function setupMediaRoutes(
  app: Hono,
  helpers: CMSRouteContextHelpers,
  getDb: () => DatabaseInstance | null,
  options?: MediaRouteOptions,
): void {
  const media = new Hono()
  const adapter = options?.storage ?? new LocalStorageAdapter()

  media.get('/', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const query = mediaQuerySchema.safeParse(c.req.query())
    if (!query.success) {
      return c.json({ error: 'Invalid query', details: query.error.flatten() }, 400)
    }

    const { site } = helpers.resolveRequestContext(c)
    const files = await db
      .select()
      .from(mediaFiles)
      .where(eq(mediaFiles.siteId, site.id))
      .orderBy(desc(mediaFiles.createdAt))

    const filesWithUrl = files.map((f) => ({
      ...f,
      url: adapter.getUrl(f.path, f.siteId),
    }))

    return c.json({ files: filesWithUrl })
  })

  media.post('/upload', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const formData = await c.req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400)
    }

    const { site, actor } = helpers.resolveRequestContext(c)
    const id = crypto.randomUUID()
    const uniqueName = `${Date.now()}-${file.name}`
    const buffer = await file.arrayBuffer()
    const path = await adapter.save(uniqueName, buffer, site.id)

    await db.insert(mediaFiles).values({
      id,
      siteId: site.id,
      filename: uniqueName,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      path,
      uploadedBy: actor?.id ?? null,
    })

    const [inserted] = await db.select().from(mediaFiles).where(eq(mediaFiles.id, id))

    return c.json(
      {
        message: 'File uploaded',
        file: {
          ...inserted,
          url: adapter.getUrl(path, site.id),
        },
      },
      201,
    )
  })

  media.delete('/:id', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const fileId = c.req.param('id')
    const { site } = helpers.resolveRequestContext(c)

    const [existing] = await db
      .select()
      .from(mediaFiles)
      .where(eq(mediaFiles.id, fileId))

    if (!existing || existing.siteId !== site.id) {
      return c.json({ error: 'File not found' }, 404)
    }

    await adapter.delete(existing.path)
    await db.delete(mediaFiles).where(eq(mediaFiles.id, fileId))

    return c.json({ message: 'File deleted', id: fileId })
  })

  app.route('/api/media', media)
}
