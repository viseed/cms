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
    // Slug referencing `viseed_roles.slug`. No DB-level FK: system roles are
    // seeded at boot (after migrations), so a hard FK would break upgrades on
    // databases that already contain role assignments. Validated at the app layer.
    role: text('role').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userSiteUnique: uniqueIndex('viseed_user_site_roles_user_site_unique').on(
      table.userId,
      table.siteId,
    ),
  }),
)
