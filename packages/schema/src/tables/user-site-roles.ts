import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { sites } from './sites'
import { users } from './users'

export const userSiteRoles = pgTable(
  'viseed_user_site_roles',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['admin', 'site_admin', 'site_content_writer'] }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userSiteUnique: uniqueIndex('viseed_user_site_roles_user_site_unique').on(
      table.userId,
      table.siteId,
    ),
  }),
)
