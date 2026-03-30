import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { sessions, siteDomains, userSiteRoles, users } from '@hana/schema'
import type { DatabaseInstance } from './database'
import { createCMS } from './hana-cms'

const DEFAULT_SITE_ID = 'default'
const SQLITE_MEMORY_DB = ':memory:'

function ensureAdminAuthTables(db: DatabaseInstance) {
  const sqlite = (db as unknown as { $client: { exec: (query: string) => void } }).$client
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS hana_users (
      id text PRIMARY KEY NOT NULL,
      email text NOT NULL UNIQUE,
      name text NOT NULL,
      password_hash text NOT NULL,
      role text NOT NULL DEFAULT 'viewer',
      created_at integer NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at integer NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS hana_sessions (
      id text PRIMARY KEY NOT NULL,
      site_id text NOT NULL DEFAULT 'default',
      user_id text NOT NULL,
      token text NOT NULL,
      expires_at integer NOT NULL,
      created_at integer NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS hana_user_site_roles (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL,
      site_id text NOT NULL,
      role text NOT NULL,
      created_at integer NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `)
}

describe('admin runtime tenancy and guards', () => {
  test('rejects admin API requests without session token', async () => {
    const cms = createCMS({
      db: { driver: 'sqlite', url: SQLITE_MEMORY_DB },
      admin: { enabled: false },
    })
    const app = await cms.launch()

    const response = await app.request('http://localhost/api/admin/plugins')

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: 'Authentication required: missing session token.',
    })
  })

  test('allows admin session for platform route', async () => {
    const cms = createCMS({
      db: { driver: 'sqlite', url: SQLITE_MEMORY_DB },
      admin: { enabled: false },
    })
    const app = await cms.launch()
    const db = cms.getDatabase()
    ensureAdminAuthTables(db)

    const adminUserId = randomUUID()
    const adminToken = `token-${randomUUID()}`

    await db.insert(users).values({
      id: adminUserId,
      email: 'admin@hana.dev',
      name: 'Admin',
      passwordHash: 'hashed',
      role: 'admin',
    })
    await db.insert(sessions).values({
      id: randomUUID(),
      siteId: DEFAULT_SITE_ID,
      userId: adminUserId,
      token: adminToken,
      expiresAt: new Date(Date.now() + 60_000),
    })

    const response = await app.request('http://localhost/api/admin/plugins', {
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([])
  })

  test('forbids writer role on platform-managed routes', async () => {
    const cms = createCMS({
      db: { driver: 'sqlite', url: SQLITE_MEMORY_DB },
      admin: { enabled: false },
    })
    const app = await cms.launch()
    const db = cms.getDatabase()
    ensureAdminAuthTables(db)

    const writerUserId = randomUUID()
    const writerToken = `token-${randomUUID()}`

    await db.insert(users).values({
      id: writerUserId,
      email: 'writer@hana.dev',
      name: 'Writer',
      passwordHash: 'hashed',
      role: 'viewer',
    })
    await db.insert(userSiteRoles).values({
      id: randomUUID(),
      userId: writerUserId,
      siteId: DEFAULT_SITE_ID,
      role: 'site_content_writer',
    })
    await db.insert(sessions).values({
      id: randomUUID(),
      siteId: DEFAULT_SITE_ID,
      userId: writerUserId,
      token: writerToken,
      expiresAt: new Date(Date.now() + 60_000),
    })

    const response = await app.request('http://localhost/api/admin/plugins', {
      headers: {
        authorization: `Bearer ${writerToken}`,
      },
    })

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'Forbidden: missing permission "platform.sites.read".',
    })
  })

  test('rejects unresolved host for non-fallback domains', async () => {
    const cms = createCMS({
      db: { driver: 'sqlite', url: SQLITE_MEMORY_DB },
      admin: { enabled: false },
    })
    const app = await cms.launch()
    const db = cms.getDatabase()
    ensureAdminAuthTables(db)

    const adminUserId = randomUUID()
    const adminToken = `token-${randomUUID()}`

    await db.insert(users).values({
      id: adminUserId,
      email: 'admin@hana.dev',
      name: 'Admin',
      passwordHash: 'hashed',
      role: 'admin',
    })
    await db.insert(sessions).values({
      id: randomUUID(),
      siteId: DEFAULT_SITE_ID,
      userId: adminUserId,
      token: adminToken,
      expiresAt: new Date(Date.now() + 60_000),
    })

    const response = await app.request('http://localhost/api/admin/plugins', {
      headers: {
        authorization: `Bearer ${adminToken}`,
        host: 'not-mapped.local',
      },
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Host "not-mapped.local" is not mapped to any site.',
    })
  })

  test('enforces deny-by-default for unmapped admin routes', async () => {
    const cms = createCMS({
      db: { driver: 'sqlite', url: SQLITE_MEMORY_DB },
      admin: { enabled: false },
    })
    const app = await cms.launch()
    const db = cms.getDatabase()
    ensureAdminAuthTables(db)

    const adminUserId = randomUUID()
    const adminToken = `token-${randomUUID()}`

    await db.insert(users).values({
      id: adminUserId,
      email: 'admin@hana.dev',
      name: 'Admin',
      passwordHash: 'hashed',
      role: 'admin',
    })
    await db.insert(sessions).values({
      id: randomUUID(),
      siteId: DEFAULT_SITE_ID,
      userId: adminUserId,
      token: adminToken,
      expiresAt: new Date(Date.now() + 60_000),
    })
    await db.insert(siteDomains).values({
      id: randomUUID(),
      siteId: DEFAULT_SITE_ID,
      domain: 'tenant.local',
      isPrimary: true,
    })

    const response = await app.request('http://tenant.local/api/admin/not-registered', {
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    })

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'No policy mapping for admin route "GET /not-registered".',
    })
  })
})
