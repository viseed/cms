import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import type { ThemeSettingsValue } from '@hana/types'

export const themeState = sqliteTable('hana_theme_state', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  activeThemeName: text('active_theme_name').notNull(),
  /** Flat key→value map of resolved theme settings (sectionKey.fieldKey → value). */
  settings: text('settings', { mode: 'json' }).$type<ThemeSettingsValue>(),
  previewThemeName: text('preview_theme_name'),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})
