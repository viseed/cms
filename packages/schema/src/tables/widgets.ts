import { index, jsonb, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'

export const widgets = pgTable(
  'widgets',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id').notNull().default('default'),
    name: text('name').notNull(),
    type: text('type').notNull(),
    config: jsonb('config').notNull().default('{}'),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    unique('widgets_site_name_unique').on(t.siteId, t.name),
    index('widgets_site_id_idx').on(t.siteId),
    index('widgets_site_type_idx').on(t.siteId, t.type),
  ],
)
