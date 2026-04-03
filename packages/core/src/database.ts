import { Database } from 'bun:sqlite'
import { coreSchema, mergeSchemas } from '@hana/schema'
import type { DatabaseConfig } from '@hana/types'
import { drizzle } from 'drizzle-orm/bun-sqlite'

export type DatabaseInstance = ReturnType<typeof drizzle>

const DEFAULT_SITE_ID = 'default'
const DEFAULT_SITE_SLUG = 'default'
const DEFAULT_SITE_NAME = 'Default Site'

function ensureMultisiteFoundation(sqlite: Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS hana_users (
      id text PRIMARY KEY NOT NULL,
      email text NOT NULL UNIQUE,
      name text NOT NULL,
      password_hash text NOT NULL,
      role text NOT NULL DEFAULT 'site_content_writer',
      created_at integer NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at integer NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `)

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS hana_sites (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      slug text NOT NULL,
      status text NOT NULL DEFAULT 'active',
      config text,
      created_at integer NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at integer NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `)

  sqlite.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS hana_sites_slug_unique
      ON hana_sites(slug);
  `)

  sqlite.exec(`
    INSERT INTO hana_sites (id, name, slug, status)
    VALUES ('${DEFAULT_SITE_ID}', '${DEFAULT_SITE_NAME}', '${DEFAULT_SITE_SLUG}', 'active')
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      slug = excluded.slug;
  `)

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS hana_site_domains (
      id text PRIMARY KEY NOT NULL,
      site_id text NOT NULL REFERENCES hana_sites(id) ON DELETE CASCADE,
      domain text NOT NULL,
      is_primary integer NOT NULL DEFAULT 0,
      verified_at integer,
      created_at integer NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `)

  sqlite.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS hana_site_domains_domain_unique
      ON hana_site_domains(domain);
  `)

  sqlite.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS hana_site_domains_site_domain_unique
      ON hana_site_domains(site_id, domain);
  `)

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS hana_user_site_roles (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL REFERENCES hana_users(id) ON DELETE CASCADE,
      site_id text NOT NULL REFERENCES hana_sites(id) ON DELETE CASCADE,
      role text NOT NULL,
      created_at integer NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `)

  sqlite.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS hana_user_site_roles_user_site_unique
      ON hana_user_site_roles(user_id, site_id);
  `)

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS hana_sessions (
      id text PRIMARY KEY NOT NULL,
      site_id text NOT NULL DEFAULT 'default' REFERENCES hana_sites(id) ON DELETE CASCADE,
      user_id text NOT NULL REFERENCES hana_users(id) ON DELETE CASCADE,
      token text NOT NULL,
      expires_at integer NOT NULL,
      created_at integer NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `)

  sqlite.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS hana_sessions_site_token_unique
      ON hana_sessions(site_id, token    );
  `)
}

/** Map removed legacy `hana_users.role` values to current RBAC vocabulary. */
function migrateHanaUsersRoleLabels(sqlite: Database) {
  if (!tableExists(sqlite, 'hana_users')) return
  try {
    sqlite.exec(`UPDATE hana_users SET role = 'site_admin' WHERE role = 'editor'`)
    sqlite.exec(`UPDATE hana_users SET role = 'site_content_writer' WHERE role = 'viewer'`)
  } catch {
    // Best-effort for corrupted or locked DBs
  }
}

function ensureSiteIdColumn(sqlite: Database, tableName: string) {
  try {
    const rows = sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>
    if (rows.length === 0) return
    const names = new Set(rows.map((r) => r.name))

    if (!names.has('site_id')) {
      // SQLite cannot add FK constraints via ALTER TABLE.
      sqlite.exec(
        `ALTER TABLE ${tableName} ADD COLUMN site_id text NOT NULL DEFAULT '${DEFAULT_SITE_ID}'`,
      )
    }

    sqlite.exec(
      `UPDATE ${tableName} SET site_id = '${DEFAULT_SITE_ID}' WHERE site_id IS NULL OR site_id = ''`,
    )
  } catch {
    // Table may not exist yet (fresh DB without migrations) — ignore.
  }
}

function tableExists(sqlite: Database, tableName: string): boolean {
  const row = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name = ? LIMIT 1")
    .get(tableName) as { name?: string } | null
  return Boolean(row?.name)
}

function ensureMultisiteSiteScope(sqlite: Database) {
  if (tableExists(sqlite, 'hana_sessions')) {
    ensureSiteIdColumn(sqlite, 'hana_sessions')
    sqlite.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS hana_sessions_site_token_unique
        ON hana_sessions(site_id, token);
    `)
  }

  if (tableExists(sqlite, 'hana_installed_plugins')) {
    ensureSiteIdColumn(sqlite, 'hana_installed_plugins')
    sqlite.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS hana_installed_plugins_site_name_unique
        ON hana_installed_plugins(site_id, name);
    `)
  }

  if (tableExists(sqlite, 'hana_installed_themes')) {
    ensureSiteIdColumn(sqlite, 'hana_installed_themes')
    sqlite.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS hana_installed_themes_site_name_unique
        ON hana_installed_themes(site_id, name);
    `)
  }

  if (tableExists(sqlite, 'hana_theme_state')) {
    ensureSiteIdColumn(sqlite, 'hana_theme_state')
    sqlite.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS hana_theme_state_site_unique
        ON hana_theme_state(site_id);
    `)
    sqlite.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS hana_theme_state_site_theme_unique
        ON hana_theme_state(site_id, active_theme_name);
    `)
  }

  if (tableExists(sqlite, 'blog_posts')) {
    ensureSiteIdColumn(sqlite, 'blog_posts')
    sqlite.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_site_slug_unique
        ON blog_posts(site_id, slug);
    `)
  }

  if (tableExists(sqlite, 'blog_categories')) {
    ensureSiteIdColumn(sqlite, 'blog_categories')
    sqlite.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS blog_categories_site_slug_unique
        ON blog_categories(site_id, slug);
    `)
  }

  if (tableExists(sqlite, 'media_files')) {
    ensureSiteIdColumn(sqlite, 'media_files')
  }
}

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
    ensureMultisiteFoundation(sqlite)
    migrateHanaUsersRoleLabels(sqlite)
    ensureMultisiteSiteScope(sqlite)
    ensureThemeStatePreviewColumns(sqlite)
    return drizzle(sqlite, { schema: finalSchema })
  }

  throw new Error(`Database driver "${config.driver}" is not yet supported. Use "sqlite".`)
}
