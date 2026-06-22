import { boolean, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { sites } from './sites'

export const siteDomains = pgTable(
  'viseed_site_domains',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    domain: text('domain').notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    verifiedAt: timestamp('verified_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    domainUnique: uniqueIndex('viseed_site_domains_domain_unique').on(table.domain),
    siteDomainUnique: uniqueIndex('viseed_site_domains_site_domain_unique').on(
      table.siteId,
      table.domain,
    ),
  }),
)

