import { boolean, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { sites } from './sites'

export const installedPlugins = pgTable(
  'viseed_installed_plugins',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .default('default')
      .references(() => sites.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    version: text('version').notNull(),
    type: text('type', { enum: ['official', 'community'] }).notNull(),
    bundleUrl: text('bundle_url'),
    integrity: text('integrity'),
    enabled: boolean('enabled').notNull().default(true),
    config: jsonb('config'),
    installedAt: timestamp('installed_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    siteNameUnique: uniqueIndex('viseed_installed_plugins_site_name_unique').on(
      table.siteId,
      table.name,
    ),
  }),
)

