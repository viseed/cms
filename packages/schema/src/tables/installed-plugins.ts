import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const installedPlugins = sqliteTable('hana_installed_plugins', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
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
})
