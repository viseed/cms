import type { DatabaseInstance } from '@hana/core'
import type { CMSRouteContextHelpers } from '@hana/types'
import { mediaQuerySchema } from '@hana/validator'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { mediaFiles } from './schema'
import { LocalStorageAdapter, type StorageAdapter } from './storage'

export interface MediaRouteOptions {
  storage?: StorageAdapter
}

function slugify(name: string): string {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'file'
  )
}

async function generateUniqueSlug(
  db: DatabaseInstance,
  siteId: string,
  baseSlug: string,
): Promise<string> {
  let slug = baseSlug
  let counter = 1
  while (true) {
    const [existing] = await db
      .select({ id: mediaFiles.id })
      .from(mediaFiles)
      .where(and(eq(mediaFiles.slug, slug), eq(mediaFiles.siteId, siteId)))
    if (!existing) return slug
    slug = `${baseSlug}-${counter++}`
  }
}

function buildFileUrl(
  file: { path: string; siteId: string; slug: string | null },
  adapter: StorageAdapter,
): string {
  if (file.slug) {
    return `/api/media/file/${encodeURIComponent(file.slug)}`
  }
  return adapter.getUrl(file.path, file.siteId)
}

export function setupMediaRoutes(
  app: Hono,
  helpers: CMSRouteContextHelpers,
  getDb: () => DatabaseInstance | null,
  options?: MediaRouteOptions,
): void {
  const media = new Hono()
  const adapter = options?.storage ?? new LocalStorageAdapter()

  // GET /api/media — list all files for site
  media.get('/', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const query = mediaQuerySchema.safeParse(c.req.query())
    if (!query.success) {
      return c.json({ error: 'Invalid query', details: query.error.flatten() }, 400)
    }

    const { site } = helpers.resolveRequestContext(c)
    const rows = await db
      .select()
      .from(mediaFiles)
      .where(eq(mediaFiles.siteId, site.id))
      .orderBy(mediaFiles.createdAt)

    const filesWithUrl = rows.map((f) => ({
      ...f,
      url: buildFileUrl(f, adapter),
    }))

    return c.json({ files: filesWithUrl })
  })

  // GET /api/media/file/:slug — zero-copy streaming trực tiếp từ disk
  media.get('/file/:slug', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const slug = c.req.param('slug')
    const { site } = helpers.resolveRequestContext(c)

    const [found] = await db
      .select()
      .from(mediaFiles)
      .where(and(eq(mediaFiles.slug, slug), eq(mediaFiles.siteId, site.id)))

    if (!found) return c.json({ error: 'Not found' }, 404)

    const bunFile = Bun.file(found.path)
    if (!(await bunFile.exists())) {
      return c.json({ error: 'File not found on disk' }, 404)
    }

    return new Response(bunFile, {
      headers: {
        'Content-Type': found.mimeType,
        'Cache-Control': 'public, max-age=86400',
        'Content-Disposition': `inline; filename="${found.originalName}"`,
      },
    })
  })

  // POST /api/media/upload — upload one or multiple files
  media.post('/upload', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const formData = await c.req.formData()

    // Accept both `files` (multi) and `file` (single, backward compat)
    const rawFiles = formData.getAll('files')
    const rawSingle = formData.get('file')
    const fileList: File[] = []

    for (const entry of rawFiles) {
      if (entry instanceof File) fileList.push(entry)
    }
    if (fileList.length === 0 && rawSingle instanceof File) {
      fileList.push(rawSingle)
    }

    if (fileList.length === 0) {
      return c.json({ error: 'No file provided' }, 400)
    }

    const { site, actor } = helpers.resolveRequestContext(c)
    const inserted: object[] = []

    for (const file of fileList) {
      const id = crypto.randomUUID()
      const uniqueName = `${Date.now()}-${file.name}`
      const buffer = await file.arrayBuffer()
      const path = await adapter.save(uniqueName, buffer, site.id)
      const autoSlug = await generateUniqueSlug(db, site.id, slugify(file.name))

      await db.insert(mediaFiles).values({
        id,
        siteId: site.id,
        filename: uniqueName,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        path,
        slug: autoSlug,
        uploadedBy: actor?.id ?? null,
      })

      const [row] = await db.select().from(mediaFiles).where(eq(mediaFiles.id, id))
      if (row) inserted.push({ ...row, url: buildFileUrl(row, adapter) })
    }

    // Single-file callers expect { file: ... } for backward compat
    if (inserted.length === 1 && !formData.getAll('files').some((e) => e instanceof File)) {
      return c.json({ message: 'File uploaded', file: inserted[0] }, 201)
    }

    return c.json({ message: 'Files uploaded', files: inserted }, 201)
  })

  // PATCH /api/media/:id — update slug, alt, and optionally replace file
  media.patch('/:id', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const fileId = c.req.param('id')
    const { site, actor } = helpers.resolveRequestContext(c)

    const [existing] = await db
      .select()
      .from(mediaFiles)
      .where(and(eq(mediaFiles.id, fileId), eq(mediaFiles.siteId, site.id)))

    if (!existing) return c.json({ error: 'File not found' }, 404)

    const formData = await c.req.formData()
    const slugRaw = formData.get('slug')
    const altRaw = formData.get('alt')
    const newFile = formData.get('file')

    const newSlug = slugRaw !== null ? (String(slugRaw).trim() || null) : undefined
    const newAlt = altRaw !== null ? (String(altRaw).trim() || null) : undefined

    // Validate slug uniqueness within site (excluding self)
    if (newSlug !== undefined && newSlug !== null) {
      const [conflict] = await db
        .select({ id: mediaFiles.id })
        .from(mediaFiles)
        .where(and(eq(mediaFiles.slug, newSlug), eq(mediaFiles.siteId, site.id)))

      if (conflict && conflict.id !== fileId) {
        return c.json({ error: 'Slug already in use by another file' }, 409)
      }
    }

    // Build update object
    const updates: Partial<typeof existing> = {}
    if (newSlug !== undefined) updates.slug = newSlug
    if (newAlt !== undefined) updates.alt = newAlt

    // Handle file replacement
    if (newFile instanceof File) {
      const uniqueName = `${Date.now()}-${newFile.name}`
      const buffer = await newFile.arrayBuffer()
      const newPath = await adapter.save(uniqueName, buffer, site.id)

      // Delete old physical file
      try {
        await adapter.delete(existing.path)
      } catch {
        // Non-fatal — old file may already be gone
      }

      updates.filename = uniqueName
      updates.originalName = newFile.name
      updates.mimeType = newFile.type
      updates.size = newFile.size
      updates.path = newPath
      if (actor?.id) updates.uploadedBy = actor.id
    }

    if (Object.keys(updates).length > 0) {
      await db.update(mediaFiles).set(updates).where(eq(mediaFiles.id, fileId))
    }

    const [updated] = await db.select().from(mediaFiles).where(eq(mediaFiles.id, fileId))
    if (!updated) return c.json({ error: 'File not found after update' }, 500)

    return c.json({ message: 'File updated', file: { ...updated, url: buildFileUrl(updated, adapter) } })
  })

  // DELETE /api/media/:id
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
