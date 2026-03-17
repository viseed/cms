import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const mediaFiles = sqliteTable('media_files', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  path: text('path').notNull(),
  alt: text('alt'),
  uploadedBy: text('uploaded_by'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const mediaSchema = { mediaFiles }
