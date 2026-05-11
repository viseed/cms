import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { sites } from './sites'
import { users } from './users'

export const sessions = pgTable(
  'hana_sessions',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .default('default')
      .references(() => sites.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    siteTokenUnique: uniqueIndex('hana_sessions_site_token_unique').on(table.siteId, table.token),
  }),
)

