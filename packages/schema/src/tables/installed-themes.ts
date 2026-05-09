import { boolean, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { sites } from './sites'

export const installedThemes = pgTable(
  'hanano_installed_themes',
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
    requiredLayouts: jsonb('required_layouts').$type<string[]>().notNull(),
    screenshots: jsonb('screenshots').$type<string[]>(),
    homepage: text('homepage'),
    repository: text('repository'),
    tags: jsonb('tags').$type<string[]>(),
    minCmsVersion: text('min_cms_version'),
    requiredPlugins: jsonb('required_plugins').$type<string[]>(),
    compatiblePlugins: jsonb('compatible_plugins').$type<string[]>(),
    enabled: boolean('enabled').notNull().default(true),
    installedAt: timestamp('installed_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    siteNameUnique: uniqueIndex('hanano_installed_themes_site_name_unique').on(
      table.siteId,
      table.name,
    ),
  }),
)

