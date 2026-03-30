import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sites } from './sites'
import { users } from './users'

export const userSiteRoles = sqliteTable(
  'hana_user_site_roles',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['admin', 'site_admin', 'site_content_writer'] }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    userSiteUnique: uniqueIndex('hana_user_site_roles_user_site_unique').on(table.userId, table.siteId),
  }),
)
