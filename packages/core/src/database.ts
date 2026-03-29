import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import type { DatabaseConfig } from '@hana/types'
import { coreSchema, mergeSchemas } from '@hana/schema'

export type DatabaseInstance = ReturnType<typeof drizzle>

function ensureThemeStatePreviewColumns(sqlite: Database) {
  try {
    const rows = sqlite.prepare('PRAGMA table_info(hana_theme_state)').all() as { name: string }[]
    if (rows.length === 0) return
    const names = new Set(rows.map((r) => r.name))
    if (!names.has('preview_theme_path')) {
      sqlite.exec('ALTER TABLE hana_theme_state ADD COLUMN preview_theme_path text')
    }
    if (!names.has('preview_token')) {
      sqlite.exec('ALTER TABLE hana_theme_state ADD COLUMN preview_token text')
    }
  } catch {
    // Table missing until first migration / insert — ignore
  }
}

export function createDatabase(
  config: DatabaseConfig,
  pluginSchemas: Array<Record<string, unknown>> = [],
): DatabaseInstance {
  const finalSchema = mergeSchemas(coreSchema, ...pluginSchemas)

  if (config.driver === 'sqlite') {
    const sqlite = new Database(config.url)
    sqlite.exec('PRAGMA journal_mode = WAL;')
    ensureThemeStatePreviewColumns(sqlite)
    return drizzle(sqlite, { schema: finalSchema })
  }

  throw new Error(`Database driver "${config.driver}" is not yet supported. Use "sqlite".`)
}
