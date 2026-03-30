import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sites } from './sites'

export const installedThemes = sqliteTable(
  'hana_installed_themes',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .default('default')
      .references(() => sites.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    version: text('version').notNull(),
    description: text('description'),
    author: text('author'),
    bundleUrl: text('bundle_url').notNull(),
    integrity: text('integrity').notNull(),
    requiredLayouts: text('required_layouts', { mode: 'json' }).$type<string[]>().notNull(),
    screenshots: text('screenshots', { mode: 'json' }).$type<string[]>(),
    homepage: text('homepage'),
    repository: text('repository'),
    tags: text('tags', { mode: 'json' }).$type<string[]>(),
    minCmsVersion: text('min_cms_version'),
    requiredPlugins: text('required_plugins', { mode: 'json' }).$type<string[]>(),
    compatiblePlugins: text('compatible_plugins', { mode: 'json' }).$type<string[]>(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    installedAt: integer('installed_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    siteNameUnique: uniqueIndex('hana_installed_themes_site_name_unique').on(table.siteId, table.name),
  }),
)
