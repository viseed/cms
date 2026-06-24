import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Platform-wide media storage configuration.
 *
 * A single row (`id = 'default'`) holds the active storage provider and its
 * adapter-specific settings. Secrets (e.g. `secretAccessKey`) are stored
 * encrypted in the `config` payload — never in plaintext.
 */
export const mediaStorageConfig = pgTable('media_storage_config', {
  id: text('id').primaryKey().default('default'),
  type: text('type').notNull().default('local'),
  config: jsonb('config').notNull().default('{}'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
