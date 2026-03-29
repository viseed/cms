import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import type { ThemeSettingsValue } from '@hana/types'

export const themeState = sqliteTable('hana_theme_state', {
  id: integer('id').primaryKey({ autoIncrement: true }),
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
})
