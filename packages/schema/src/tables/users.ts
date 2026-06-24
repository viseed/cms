import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('viseed_users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'site_admin', 'site_content_writer'] })
    .notNull()
    .default('site_content_writer'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
