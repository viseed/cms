import type { ThemeSettingsValue } from '@viseed/types'
import { jsonb, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { sites } from './sites'

export const themeState = pgTable(
  'viseed_theme_state',
  {
    id: serial('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .default('default')
      .references(() => sites.id, { onDelete: 'cascade' }),
    activeThemeName: text('active_theme_name').notNull(),
    /** Flat key→value map of resolved theme settings (sectionKey.fieldKey → value). */
    settings: jsonb('settings').$type<ThemeSettingsValue>(),
    /** Registry theme name for preview (preferred over previewThemePath). */
    previewThemeName: text('preview_theme_name'),
    /**
     * Relative preview root under cwd, e.g. `themes/dark/preview`.
     * Fallback when theme is not in registry. Applied only when request presents matching `previewToken`.
     */
    previewThemePath: text('preview_theme_path'),
    /** Opaque token; preview applies iff cookie `viseed_preview` or `?viseed_preview=` matches. */
    previewToken: text('preview_token'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    siteUnique: uniqueIndex('viseed_theme_state_site_unique').on(table.siteId),
    siteThemeUnique: uniqueIndex('viseed_theme_state_site_theme_unique').on(
      table.siteId,
      table.activeThemeName,
    ),
  }),
)


