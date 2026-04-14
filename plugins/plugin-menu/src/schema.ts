import { integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const menus = pgTable(
  'menus',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id').notNull().default('default'),
    name: text('name').notNull(),
    zone: text('zone').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    siteZoneUnique: uniqueIndex('menus_site_zone_unique').on(table.siteId, table.zone),
  }),
)

export const menuItems = pgTable('menu_items', {
  id: text('id').primaryKey(),
  menuId: text('menu_id').notNull(),
  parentId: text('parent_id'),
  label: text('label').notNull(),
  url: text('url').notNull(),
  target: text('target').default('_self'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const menuSchema = { menus, menuItems }
