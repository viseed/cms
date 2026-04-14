import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const homeCarouselItems = pgTable('insurance_home_carousel', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull(),
  imageUrl: text('image_url'),
  sortOrder: integer('sort_order').notNull().default(0),
  active: text('active').notNull().default('1'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const insuranceCompanionSchema = { homeCarouselItems }
