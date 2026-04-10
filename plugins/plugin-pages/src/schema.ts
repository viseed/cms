import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const pages = sqliteTable(
  'cms_pages',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id').notNull().default('default'),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    body: text('body'),
    excerpt: text('excerpt'),
    status: text('status', { enum: ['draft', 'published', 'archived'] })
      .notNull()
      .default('draft'),
    authorId: text('author_id'),
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    siteSlugUnique: uniqueIndex('cms_pages_site_slug_unique').on(table.siteId, table.slug),
  }),
)

export const pagesSchema = { pages }
