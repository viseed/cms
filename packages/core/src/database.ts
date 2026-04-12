import { coreSchema, mergeSchemas } from '@hana/schema'
import type { DatabaseConfig } from '@hana/types'
import { drizzle } from 'drizzle-orm/bun-sql'

export type DatabaseInstance = ReturnType<typeof drizzle>

export async function createDatabase(
  config: DatabaseConfig,
  pluginSchemas: Array<Record<string, unknown>> = [],
): Promise<DatabaseInstance> {
  const finalSchema = mergeSchemas(coreSchema, ...pluginSchemas)
  return drizzle(config.url, { schema: finalSchema })
}
