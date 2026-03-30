import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sites } from './sites'

export const siteDomains = sqliteTable(
  'hana_site_domains',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    domain: text('domain').notNull(),
    isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
    verifiedAt: integer('verified_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    domainUnique: uniqueIndex('hana_site_domains_domain_unique').on(table.domain),
    siteDomainUnique: uniqueIndex('hana_site_domains_site_domain_unique').on(table.siteId, table.domain),
  }),
)
