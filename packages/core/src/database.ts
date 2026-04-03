import { createClient } from '@libsql/client'
import { coreSchema, mergeSchemas } from '@hana/schema'
import type { DatabaseConfig } from '@hana/types'
import { drizzle } from 'drizzle-orm/libsql'
import { createLibsqlBootstrapCtx, runSqliteDialectBootstrap } from './database-bootstrap'
import { resolveLibsqlConnection, type LibsqlDriverConfig } from './libsql-connection'

/** Khớp đúng kiểu `drizzle()` trả về (schema động từ mergeSchemas → không ràng buộc generic bảng từng plugin). */
export type DatabaseInstance = ReturnType<typeof drizzle>

export async function createDatabase(
  config: DatabaseConfig,
  pluginSchemas: Array<Record<string, unknown>> = [],
): Promise<DatabaseInstance> {
  const finalSchema = mergeSchemas(coreSchema, ...pluginSchemas)

  switch (config.driver) {
    case 'sqlite':
    case 'turso': {
      const { url, authToken } = resolveLibsqlConnection(config as LibsqlDriverConfig)
      const client = createClient({ url, authToken })
      try {
        await client.execute('PRAGMA journal_mode = WAL')
      } catch {
        // Remote libSQL may ignore or reject PRAGMA — local file benefits when supported
      }
      const ctx = createLibsqlBootstrapCtx(client)
      await runSqliteDialectBootstrap(ctx)
      return drizzle(client, { schema: finalSchema })
    }
    case 'postgres':
    case 'mysql':
      throw new Error(
        `Database driver "${config.driver}" needs a Drizzle ${config.driver === 'postgres' ? 'pgTable' : 'mysqlTable'} schema layer; core/plugins currently use sqlite-core only. Config key is reserved for a future factory branch.`,
      )
    default: {
      const _exhaustive: never = config.driver
      throw new Error(`Database driver "${String(_exhaustive)}" is not supported.`)
    }
  }
}
