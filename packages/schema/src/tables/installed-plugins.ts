import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sites } from './sites'

export const installedPlugins = sqliteTable(
  'hana_installed_plugins',
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
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    config: text('config', { mode: 'json' }),
    installedAt: integer('installed_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    siteNameUnique: uniqueIndex('hana_installed_plugins_site_name_unique').on(table.siteId, table.name),
  }),
)
