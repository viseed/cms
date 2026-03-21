import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const themeState = sqliteTable('hana_theme_state', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  activeThemeName: text('active_theme_name').notNull(),
  settings: text('settings', { mode: 'json' }).$type<Record<string, unknown>>(),
  previewThemeName: text('preview_theme_name'),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})
