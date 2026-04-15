---
name: Media Slug Serve Direct
overview: "Ba thay đổi nhỏ, targeted: (1) serve file trực tiếp qua slug thay vì redirect, (2) auto-generate slug khi upload, (3) hiển thị slug trong grid."
todos:
  - id: serve-direct
    content: "routes.ts: GET /api/media/file/:slug — serve file trực tiếp bằng Bun.file() thay vì redirect"
    status: completed
  - id: auto-slug
    content: "routes.ts: Thêm slugify() + generateUniqueSlug(), gọi khi upload để tự động set slug"
    status: completed
  - id: grid-slug
    content: "MediaView.vue: Hiển thị file.slug thay vì originalName trong card"
    status: completed
isProject: false
---

# Media Slug — Serve Direct, Auto-generate, Grid Display

## Thay đổi tổng quan

Chỉ 2 file cần sửa: [`plugins/plugin-media/src/routes.ts`](plugins/plugin-media/src/routes.ts) và [`apps/admin/src/views/MediaView.vue`](apps/admin/src/views/MediaView.vue).

---

## 1. `routes.ts` — Thay đổi 1: Serve file trực tiếp (zero-copy streaming)

Thay `c.redirect(...)` bằng `new Response(Bun.file(path))` — Bun stream file trực tiếp từ disk, **không load vào RAM**, tự xử lý Range requests và `If-None-Match`.

> Không dùng `arrayBuffer()` vì nó load toàn bộ file vào memory trước khi gửi — chậm và tốn RAM với file lớn.

```typescript
// GET /api/media/file/:slug — zero-copy streaming
media.get('/file/:slug', async (c) => {
  // ... lookup by slug + siteId ...
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
```

Bun tự set `Content-Length` và hỗ trợ HTTP Range requests (cần cho video). CDN-friendly: set `Cache-Control` rõ ràng, slug URL ổn định nên cache hit rate cao. Nếu user "Replace File" thì cần CDN purge slug đó — dùng TTL ngắn hơn nếu chưa có purge logic.

---

## 2. `routes.ts` — Thay đổi 2: Auto-generate slug khi upload

Thêm 2 helper functions trước `setupMediaRoutes`:

```typescript
function slugify(name: string): string {
  return (
    name
      .replace(/\.[^.]+$/, '')       // bỏ extension
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')   // ký tự đặc biệt → dấu gạch
      .replace(/^-+|-+$/g, '')       // trim gạch đầu/cuối
    || 'file'
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
```

Trong `POST /upload`, sau khi có `file.name`, gọi:
```typescript
const autoSlug = await generateUniqueSlug(db, site.id, slugify(file.name))
// rồi insert với slug: autoSlug
```

`PATCH /:id` đã có uniqueness check — giữ nguyên. Khi user edit slug trong modal, nếu trùng thì trả 409.

---

## 3. `MediaView.vue` — Hiển thị slug trong grid

Đổi display text trong card từ `file.originalName` sang `file.slug ?? file.originalName`. Giữ `originalName` ở `title` tooltip:

```html
<p class="media-name" :title="file.originalName">
  {{ file.slug ?? file.originalName }}
</p>
```

---

## Tổng kết file thay đổi

- [`plugins/plugin-media/src/routes.ts`](plugins/plugin-media/src/routes.ts) — serve trực tiếp, auto-generate slug
- [`apps/admin/src/views/MediaView.vue`](apps/admin/src/views/MediaView.vue) — grid hiện slug
