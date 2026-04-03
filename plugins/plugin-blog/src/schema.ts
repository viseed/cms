import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const posts = sqliteTable(
  'blog_posts',
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
    categoryId: text('category_id'),
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    siteSlugUnique: uniqueIndex('blog_posts_site_slug_unique').on(table.siteId, table.slug),
  }),
)

export const categories = sqliteTable(
  'blog_categories',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id').notNull().default('default'),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    siteSlugUnique: uniqueIndex('blog_categories_site_slug_unique').on(table.siteId, table.slug),
  }),
)

export const blogSchema = { posts, categories }
