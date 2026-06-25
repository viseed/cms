import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { roles } from './roles'

export const rolePermissions = pgTable(
  'viseed_role_permissions',
  {
    id: text('id').primaryKey(),
    roleSlug: text('role_slug')
      .notNull()
      .references(() => roles.slug, { onDelete: 'cascade' }),
    permission: text('permission').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    roleSlugPermissionUnique: uniqueIndex('viseed_role_permissions_role_slug_permission_unique').on(
      table.roleSlug,
      table.permission,
    ),
  }),
)
