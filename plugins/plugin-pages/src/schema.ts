import type { MetaSeo, SchemaOrgItem } from '@viseed/validator'
import { boolean, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const pages = pgTable(
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
    metaSeo: jsonb('meta_seo').$type<MetaSeo>(),
    schemaOrg: jsonb('schema_org').$type<SchemaOrgItem[]>(),
    tocEnabled: boolean('toc_enabled').notNull().default(false),
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    siteSlugUnique: uniqueIndex('cms_pages_site_slug_unique').on(table.siteId, table.slug),
  }),
)

export const pagesSchema = { pages }
