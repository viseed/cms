import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import type { DatabaseConfig } from '@hanabi/types'
import { coreSchema, mergeSchemas } from '@hanabi/schema'

export type DatabaseInstance = ReturnType<typeof drizzle>

export function createDatabase(
  config: DatabaseConfig,
  pluginSchemas: Array<Record<string, unknown>> = [],
): DatabaseInstance {
  const finalSchema = mergeSchemas(coreSchema, ...pluginSchemas)

  if (config.driver === 'sqlite') {
    const sqlite = new Database(config.url)
    sqlite.exec('PRAGMA journal_mode = WAL;')
    return drizzle(sqlite, { schema: finalSchema })
  }

  throw new Error(`Database driver "${config.driver}" is not yet supported. Use "sqlite".`)
}
