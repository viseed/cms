import { sql } from 'drizzle-orm'
import { boolean, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const users = pgTable(
  'viseed_users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').notNull().default('site_content_writer'),
    isOwner: boolean('is_owner').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    singleOwner: uniqueIndex('viseed_users_single_owner_unique')
      .on(table.isOwner)
      .where(sql`${table.isOwner} = true`),
  }),
)
