import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const mediaFiles = pgTable('media_files', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().default('default'),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  path: text('path').notNull(),
  slug: text('slug'),
  alt: text('alt'),
  uploadedBy: text('uploaded_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

