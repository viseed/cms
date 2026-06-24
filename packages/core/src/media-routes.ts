import { mediaFiles } from '@viseed/schema'
import type { CMSRouteContextHelpers } from '@viseed/types'
import { and, count, desc, eq, ilike, or } from 'drizzle-orm'
import { Hono } from 'hono'
import type { DatabaseInstance } from './database'
import { LocalStorageAdapter, type StorageAdapter } from './media-storage'

export interface MediaRouteOptions {
  /**
   * Resolves the active storage adapter at request time. Using a getter (not a
   * fixed instance) lets the CMS hot-swap the adapter without re-registering
   * routes.
   */
  getAdapter?: () => StorageAdapter
  maxFileSizeMb?: number
}

function slugify(name: string): string {
  var from = 'àáãảạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệđùúủũụưừứửữựòóỏõọôồốổỗộơờớởỡợìíỉĩịäëïîöüûñçýỳỹỵỷ',
    to = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeduuuuuuuuuuuoooooooooooooooooiiiiiaeiiouuncyyyyy'
  for (let i = 0, l = from.length; i < l; i++) {
    name = name.replace(RegExp(from[i] ?? '', 'gi'), to[i] ?? '')
  }

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
  baseUrl?: string,
): string {
  if (file.slug) {
    const relativePath = `/api/media/file/${encodeURIComponent(file.slug)}`
    return baseUrl ? `${baseUrl}${relativePath}` : relativePath
  }
  return adapter.getUrl(file.path, file.siteId)
}

/**
 * Resolves the public base URL (scheme + host) from a Hono context.
 *
 * Behind a TLS-terminating reverse proxy the internal request arrives over
 * plain HTTP, so `c.req.url` has `http:` even when the public site is HTTPS.
 * Standard proxies (nginx, Caddy, Traefik…) forward the original scheme via
 * the `X-Forwarded-Proto` header and the original host via `X-Forwarded-Host`
 * (or the standard `Forwarded` header). We honour those when present.
 */
function resolveBaseUrl(c: {
  req: { url: string; header: (name: string) => string | undefined }
}): string {
  const requestUrl = new URL(c.req.url)
  const proto = c.req.header('x-forwarded-proto') ?? requestUrl.protocol.replace(/:$/, '')
  const host = c.req.header('x-forwarded-host') ?? c.req.header('host') ?? requestUrl.host
  return `${proto}://${host}`
}

export function setupMediaRoutes(
  app: Hono,
  helpers: CMSRouteContextHelpers,
  getDb: () => DatabaseInstance | null,
  options?: MediaRouteOptions,
): void {
  const media = new Hono()
  const fallbackAdapter = new LocalStorageAdapter()
  const getAdapter = options?.getAdapter ?? (() => fallbackAdapter)
  const maxBytes = (options?.maxFileSizeMb ?? 10) * 1024 * 1024

  // GET /api/media — list files for site with search + pagination
  media.get('/', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const raw = c.req.query()
    const page = Math.max(1, Number(raw.page ?? 1))
    const limit = Math.min(100, Math.max(1, Number(raw.limit ?? 24)))
    const search = raw.search?.trim() ?? ''
    const mimeType = raw.mimeType?.trim() ?? ''

    const { site } = helpers.resolveRequestContext(c)

    const adapter = getAdapter()
    const baseUrl = resolveBaseUrl(c)

    const baseCondition = eq(mediaFiles.siteId, site.id)

    const mimeCondition = mimeType ? eq(mediaFiles.mimeType, mimeType) : undefined

    const searchCondition = search
      ? or(
          ilike(mediaFiles.filename, `%${search}%`),
          ilike(mediaFiles.originalName, `%${search}%`),
          ilike(mediaFiles.slug, `%${search}%`),
          ilike(mediaFiles.alt, `%${search}%`),
        )
      : undefined

    const conditions = [baseCondition, mimeCondition, searchCondition].filter(Boolean)
    const where = conditions.length === 1 ? conditions[0] : and(...(conditions as [never, never]))

    const [{ total }] = await db.select({ total: count() }).from(mediaFiles).where(where)

    const rows = await db
      .select()
      .from(mediaFiles)
      .where(where)
      .orderBy(desc(mediaFiles.createdAt))
      .limit(limit)
      .offset((page - 1) * limit)

    const files = rows.map((f) => ({ ...f, url: buildFileUrl(f, adapter, baseUrl) }))

    return c.json({ files, total, page, limit, pages: Math.ceil(total / limit) })
  })

  // GET /api/media/file/:slug — zero-copy streaming from disk
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

    const adapter = getAdapter()

    // Remote adapters (S3/R2) serve files directly from their public/CDN URL.
    if (!adapter.isLocal()) {
      return c.redirect(adapter.getUrl(found.path, site.id), 302)
    }

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

    const oversized = fileList.find((f) => f.size > maxBytes)
    if (oversized) {
      return c.json(
        { error: `File "${oversized.name}" exceeds the ${options?.maxFileSizeMb ?? 10} MB limit` },
        413,
      )
    }

    const { site, actor } = helpers.resolveRequestContext(c)

    const adapter = getAdapter()
    const baseUrl = resolveBaseUrl(c)

    const inserted: object[] = []

    for (const file of fileList) {
      const id = crypto.randomUUID()
      const fileName = slugify(file.name)
      const uniqueName = `${Date.now()}-${fileName}`
      const buffer = await file.arrayBuffer()
      const path = await adapter.save(uniqueName, buffer, site.id, file.type)
      const autoSlug = await generateUniqueSlug(db, site.id, fileName)

      await db.insert(mediaFiles).values({
        id,
        siteId: site.id,
        filename: uniqueName,
        originalName: fileName,
        mimeType: file.type,
        size: file.size,
        path,
        slug: autoSlug,
        uploadedBy: actor?.id ?? null,
      })

      const [row] = await db.select().from(mediaFiles).where(eq(mediaFiles.id, id))
      if (row) inserted.push({ ...row, url: buildFileUrl(row, adapter, baseUrl) })
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
    const adapter = getAdapter()

    const [existing] = await db
      .select()
      .from(mediaFiles)
      .where(and(eq(mediaFiles.id, fileId), eq(mediaFiles.siteId, site.id)))

    if (!existing) return c.json({ error: 'File not found' }, 404)

    const formData = await c.req.formData()
    const slugRaw = formData.get('slug')
    const altRaw = formData.get('alt')
    const newFile = formData.get('file')

    const newSlug = slugRaw !== null ? String(slugRaw).trim() || null : undefined
    const newAlt = altRaw !== null ? String(altRaw).trim() || null : undefined

    if (newSlug !== undefined && newSlug !== null) {
      const [conflict] = await db
        .select({ id: mediaFiles.id })
        .from(mediaFiles)
        .where(and(eq(mediaFiles.slug, newSlug), eq(mediaFiles.siteId, site.id)))

      if (conflict && conflict.id !== fileId) {
        return c.json({ error: 'Slug already in use by another file' }, 409)
      }
    }

    const updates: Partial<typeof existing> = {}
    if (newSlug !== undefined) updates.slug = newSlug
    if (newAlt !== undefined) updates.alt = newAlt

    if (newFile instanceof File) {
      if (newFile.size > maxBytes) {
        return c.json({ error: `File exceeds the ${options?.maxFileSizeMb ?? 10} MB limit` }, 413)
      }
      const uniqueName = `${Date.now()}-${newFile.name}`
      const buffer = await newFile.arrayBuffer()
      const newPath = await adapter.save(uniqueName, buffer, site.id, newFile.type)

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

    const baseUrl = resolveBaseUrl(c)

    return c.json({
      message: 'File updated',
      file: { ...updated, url: buildFileUrl(updated, adapter, baseUrl) },
    })
  })

  // DELETE /api/media/:id
  media.delete('/:id', async (c) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const fileId = c.req.param('id')
    const { site } = helpers.resolveRequestContext(c)
    const adapter = getAdapter()

    const [existing] = await db.select().from(mediaFiles).where(eq(mediaFiles.id, fileId))

    if (!existing || existing.siteId !== site.id) {
      return c.json({ error: 'File not found' }, 404)
    }

    await adapter.delete(existing.path)
    await db.delete(mediaFiles).where(eq(mediaFiles.id, fileId))

    return c.json({ message: 'File deleted', id: fileId })
  })

  app.route('/api/media', media)
}
