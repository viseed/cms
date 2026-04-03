import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { DatabaseConfig } from '@hana/types'

export type LibsqlDriverConfig = Omit<DatabaseConfig, 'driver'> & { driver: 'sqlite' | 'turso' }

/**
 * Maps legacy Bun SQLite URLs to libSQL `file:` URLs so dev uses the same stack as Turso.
 */
export function toLibsqlLocalUrl(url: string): string {
  const u = url.trim()
  /** Per-connection private memory (libSQL allows `cache=private` | `shared` on `file::memory:` only). */
  if (u === ':memory:') return 'file::memory:?cache=private'
  if (u.startsWith('file:')) return u
  const abs = resolve(u)
  return pathToFileURL(abs).href
}

function isRemoteLibsqlUrl(url: string): boolean {
  return (
    url.startsWith('libsql://') ||
    url.startsWith('https://') ||
    url.startsWith('wss://') ||
    url.startsWith('http://')
  )
}

/**
 * Resolves `DatabaseConfig` to libSQL client options. `sqlite` = local file or memory only.
 */
export function resolveLibsqlConnection(config: LibsqlDriverConfig): { url: string; authToken?: string } {
  const raw = config.url.trim()

  if (config.driver === 'sqlite') {
    if (isRemoteLibsqlUrl(raw)) {
      throw new Error(
        'Database driver "sqlite" is for local development only (file path or :memory:). For remote Turso/libSQL use driver: "turso" and set db.authToken.',
      )
    }
    return { url: toLibsqlLocalUrl(raw) }
  }

  if (isRemoteLibsqlUrl(raw) && !config.authToken?.trim()) {
    throw new Error(
      'Database driver "turso" requires db.authToken for remote libSQL URLs (e.g. set TURSO_AUTH_TOKEN or pass authToken in config).',
    )
  }
  return { url: raw, authToken: config.authToken }
}
