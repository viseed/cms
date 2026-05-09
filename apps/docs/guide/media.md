# Media

Hana CMS includes a built-in media library for uploading and serving files. No additional plugin is required — media support is part of `@hanano/core`.

---

## Configuration

Configure media storage in `createCMS()`:

```typescript
const cms = createCMS({
  db: { driver: 'postgres', url: process.env.DATABASE_URL! },
  media: {
    uploadDir: './uploads',     // Directory to store uploaded files. Default: './uploads'
    maxFileSizeMb: 10,          // Maximum upload size in MB. Default: 10
  },
})
```

Uploaded files are stored on the local filesystem under `uploadDir`, organized by site ID.

---

## Media API

All media endpoints are mounted at `/api/media`.

### Upload a file

```
POST /api/media/upload
Content-Type: multipart/form-data
```

Upload a single file using the `file` field:

```bash
curl -X POST http://localhost:3000/api/media/upload \
  -F "file=@photo.jpg"
```

**Response:**

```json
{
  "message": "File uploaded",
  "file": {
    "id": "uuid",
    "slug": "photo",
    "url": "/api/media/file/photo",
    "mimeType": "image/jpeg",
    "size": 204800,
    "originalName": "photo",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

#### Upload multiple files

Use the `files` field to upload several files in one request:

```bash
curl -X POST http://localhost:3000/api/media/upload \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg"
```

**Response:**

```json
{
  "message": "Files uploaded",
  "files": [ ... ]
}
```

---

### List files

```
GET /api/media
```

Returns paginated file list with optional search and MIME type filter.

| Query param | Type     | Default | Description                                     |
|-------------|----------|---------|-------------------------------------------------|
| `page`      | number   | `1`     | Page number                                     |
| `limit`     | number   | `24`    | Items per page (max 100)                        |
| `search`    | string   | —       | Search by filename, original name, slug, or alt |
| `mimeType`  | string   | —       | Filter by exact MIME type (e.g. `image/jpeg`)   |

**Example:**

```
GET /api/media?page=1&limit=24&search=banner&mimeType=image/png
```

**Response:**

```json
{
  "files": [ ... ],
  "total": 42,
  "page": 1,
  "limit": 24,
  "pages": 2
}
```

---

### Serve a file

```
GET /api/media/file/:slug
```

Streams the file directly from disk with caching headers (`Cache-Control: public, max-age=86400`).

**Example:**

```
GET /api/media/file/my-photo
```

The slug is auto-generated from the original filename when uploading. You can update it via the PATCH endpoint or from the admin panel.

---

### Update a file

```
PATCH /api/media/:id
Content-Type: multipart/form-data
```

Update the slug, alt text, or replace the file content.

| Field  | Type   | Description                             |
|--------|--------|-----------------------------------------|
| `slug` | string | New URL slug (must be unique per site)  |
| `alt`  | string | Alt text for accessibility              |
| `file` | File   | Replacement file                        |

---

### Delete a file

```
DELETE /api/media/:id
```

Removes the record from the database and deletes the file from disk.

---

## Admin Panel

The media library is accessible in the admin panel under **Media**. It provides a visual grid interface for browsing, uploading, editing, and deleting files.

---

## Persistent Storage

In production, ensure the `uploads/` directory is persisted across deployments. When using Docker, mount it as a volume:

```yaml
volumes:
  - ./uploads:/app/uploads:rw
```

See the [Deployment](/guide/deployment) guide for the full Docker setup.
