import type { Client } from '@libsql/client'

const DEFAULT_SITE_ID = 'default'
const DEFAULT_SITE_SLUG = 'default'
const DEFAULT_SITE_NAME = 'Default Site'

/** Safe table identifiers only (internal callers). */
const SAFE_TABLE = /^[a-z_][a-z0-9_]*$/i

export type BootstrapCtx = {
  exec(sql: string): Promise<void>
  tableExists(tableName: string): Promise<boolean>
  /** Column names from PRAGMA table_info; empty if table missing or error. */
  getTableColumnNames(tableName: string): Promise<string[]>
}

function resultRowsAsObjects(columns: string[], rows: unknown[][]): Record<string, unknown>[] {
  return rows.map((row) =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]] as const)),
  )
}

async function libsqlExecuteWithRetry(client: Client, sql: string): Promise<void> {
  const attempts = 3
  let last: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      await client.execute(sql)
      return
    } catch (e) {
      last = e
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 150 * (i + 1)))
      }
    }
  }
  throw last
}

export function createLibsqlBootstrapCtx(client: Client): BootstrapCtx {
  return {
    exec: (sql) => libsqlExecuteWithRetry(client, sql),
    async tableExists(tableName) {
      if (!SAFE_TABLE.test(tableName)) return false
      const rs = await client.execute({
        sql: "SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name = ? LIMIT 1",
        args: [tableName],
      })
      return rs.rows.length > 0
    },
    async getTableColumnNames(tableName) {
      if (!SAFE_TABLE.test(tableName)) return []
      try {
        const rs = await client.execute(`PRAGMA table_info(${tableName})`)
        const objects = resultRowsAsObjects(rs.columns, rs.rows as unknown as unknown[][])
        return objects.map((o) => String(o.name ?? '')).filter(Boolean)
      } catch {
        return []
      }
    },
  }
}

async function ensureMultisiteFoundation(ctx: BootstrapCtx) {
  await ctx.exec(`
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

  await ctx.exec(`
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

  await ctx.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS hana_sites_slug_unique
      ON hana_sites(slug);
  `)

  await ctx.exec(`
    INSERT INTO hana_sites (id, name, slug, status)
    VALUES ('${DEFAULT_SITE_ID}', '${DEFAULT_SITE_NAME}', '${DEFAULT_SITE_SLUG}', 'active')
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      slug = excluded.slug;
  `)

  await ctx.exec(`
    CREATE TABLE IF NOT EXISTS hana_site_domains (
      id text PRIMARY KEY NOT NULL,
      site_id text NOT NULL REFERENCES hana_sites(id) ON DELETE CASCADE,
      domain text NOT NULL,
      is_primary integer NOT NULL DEFAULT 0,
      verified_at integer,
      created_at integer NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `)

  await ctx.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS hana_site_domains_domain_unique
      ON hana_site_domains(domain);
  `)

  await ctx.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS hana_site_domains_site_domain_unique
      ON hana_site_domains(site_id, domain);
  `)

  await ctx.exec(`
    CREATE TABLE IF NOT EXISTS hana_user_site_roles (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL REFERENCES hana_users(id) ON DELETE CASCADE,
      site_id text NOT NULL REFERENCES hana_sites(id) ON DELETE CASCADE,
      role text NOT NULL,
      created_at integer NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `)

  await ctx.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS hana_user_site_roles_user_site_unique
      ON hana_user_site_roles(user_id, site_id);
  `)

  await ctx.exec(`
    CREATE TABLE IF NOT EXISTS hana_sessions (
      id text PRIMARY KEY NOT NULL,
      site_id text NOT NULL DEFAULT 'default' REFERENCES hana_sites(id) ON DELETE CASCADE,
      user_id text NOT NULL REFERENCES hana_users(id) ON DELETE CASCADE,
      token text NOT NULL,
      expires_at integer NOT NULL,
      created_at integer NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `)

  await ctx.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS hana_sessions_site_token_unique
      ON hana_sessions(site_id, token);
  `)
}

async function migrateHanaUsersRoleLabels(ctx: BootstrapCtx) {
  if (!(await ctx.tableExists('hana_users'))) return
  try {
    await ctx.exec(`UPDATE hana_users SET role = 'site_admin' WHERE role = 'editor'`)
    await ctx.exec(`UPDATE hana_users SET role = 'site_content_writer' WHERE role = 'viewer'`)
  } catch {
    // Best-effort for corrupted or locked DBs
  }
}

async function ensureSiteIdColumn(ctx: BootstrapCtx, tableName: string) {
  if (!SAFE_TABLE.test(tableName)) return
  try {
    const names = new Set(await ctx.getTableColumnNames(tableName))
    if (names.size === 0) return

    if (!names.has('site_id')) {
      await ctx.exec(
        `ALTER TABLE ${tableName} ADD COLUMN site_id text NOT NULL DEFAULT '${DEFAULT_SITE_ID}'`,
      )
    }

    await ctx.exec(
      `UPDATE ${tableName} SET site_id = '${DEFAULT_SITE_ID}' WHERE site_id IS NULL OR site_id = ''`,
    )
  } catch {
    // Table may not exist yet (fresh DB without migrations) — ignore.
  }
}

async function ensureMultisiteSiteScope(ctx: BootstrapCtx) {
  if (await ctx.tableExists('hana_sessions')) {
    await ensureSiteIdColumn(ctx, 'hana_sessions')
    await ctx.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS hana_sessions_site_token_unique
        ON hana_sessions(site_id, token);
    `)
  }

  if (await ctx.tableExists('hana_installed_plugins')) {
    await ensureSiteIdColumn(ctx, 'hana_installed_plugins')
    await ctx.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS hana_installed_plugins_site_name_unique
        ON hana_installed_plugins(site_id, name);
    `)
  }

  if (await ctx.tableExists('hana_installed_themes')) {
    await ensureSiteIdColumn(ctx, 'hana_installed_themes')
    await ctx.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS hana_installed_themes_site_name_unique
        ON hana_installed_themes(site_id, name);
    `)
  }

  if (await ctx.tableExists('hana_theme_state')) {
    await ensureSiteIdColumn(ctx, 'hana_theme_state')
    await ctx.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS hana_theme_state_site_unique
        ON hana_theme_state(site_id);
    `)
    await ctx.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS hana_theme_state_site_theme_unique
        ON hana_theme_state(site_id, active_theme_name);
    `)
  }

  if (await ctx.tableExists('blog_posts')) {
    await ensureSiteIdColumn(ctx, 'blog_posts')
    await ctx.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_site_slug_unique
        ON blog_posts(site_id, slug);
    `)
  }

  if (await ctx.tableExists('blog_categories')) {
    await ensureSiteIdColumn(ctx, 'blog_categories')
    await ctx.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS blog_categories_site_slug_unique
        ON blog_categories(site_id, slug);
    `)
  }

  if (await ctx.tableExists('media_files')) {
    await ensureSiteIdColumn(ctx, 'media_files')
  }
}

async function ensureThemeStatePreviewColumns(ctx: BootstrapCtx) {
  try {
    const names = new Set(await ctx.getTableColumnNames('hana_theme_state'))
    if (names.size === 0) return
    if (!names.has('preview_theme_path')) {
      await ctx.exec('ALTER TABLE hana_theme_state ADD COLUMN preview_theme_path text')
    }
    if (!names.has('preview_token')) {
      await ctx.exec('ALTER TABLE hana_theme_state ADD COLUMN preview_token text')
    }
  } catch {
    // Table missing until first migration / insert — ignore
  }
}

export async function runSqliteDialectBootstrap(ctx: BootstrapCtx): Promise<void> {
  await ensureMultisiteFoundation(ctx)
  await migrateHanaUsersRoleLabels(ctx)
  await ensureMultisiteSiteScope(ctx)
  await ensureThemeStatePreviewColumns(ctx)
}
