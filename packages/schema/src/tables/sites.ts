import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const sites = sqliteTable(
  'hana_sites',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    status: text('status', { enum: ['active', 'archived', 'suspended'] })
      .notNull()
      .default('active'),
    config: text('config', { mode: 'json' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    slugUnique: uniqueIndex('hana_sites_slug_unique').on(table.slug),
  }),
)
