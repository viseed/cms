import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const dashboardWidgets = pgTable(
  'dashboard_widgets',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id').notNull().default('default'),
    type: text('type').notNull(),
    size: text('size').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('dashboard_widgets_site_id_idx').on(t.siteId)],
)
