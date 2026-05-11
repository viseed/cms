import { jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const sites = pgTable(
  'hana_sites',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    status: text('status', { enum: ['active', 'archived', 'suspended'] })
      .notNull()
      .default('active'),
    config: jsonb('config'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('hana_sites_slug_unique').on(table.slug),
  }),
)

