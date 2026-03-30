import type { ThemeSettingsValue } from '@hana/types'
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sites } from './sites'

export const themeState = sqliteTable(
  'hana_theme_state',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    siteId: text('site_id')
      .notNull()
      .default('default')
      .references(() => sites.id, { onDelete: 'cascade' }),
    activeThemeName: text('active_theme_name').notNull(),
    /** Flat key→value map of resolved theme settings (sectionKey.fieldKey → value). */
    settings: text('settings', { mode: 'json' }).$type<ThemeSettingsValue>(),
    /**
     * Relative preview root under cwd, e.g. `themes/dark/preview`.
     * Applied only when request presents matching `previewToken` (cookie or query).
     */
    previewThemePath: text('preview_theme_path'),
    /** Opaque token; preview applies iff cookie `hana_preview` or `?hana_preview=` matches. */
    previewToken: text('preview_token'),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    siteUnique: uniqueIndex('hana_theme_state_site_unique').on(table.siteId),
    siteThemeUnique: uniqueIndex('hana_theme_state_site_theme_unique').on(table.siteId, table.activeThemeName),
  }),
)
