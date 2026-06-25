import { beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { rolePermissions, roles, sessions, sites, userSiteRoles, users } from '@viseed/schema'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import { createCMS } from './viseed-cms'
import type { DatabaseInstance } from './database'
import { ensureTestDatabase } from './test-support'

const DEFAULT_SITE_ID = 'default'

// Provision the dedicated test database up-front (create + migrate + clean slate).
// The suite runs whenever a local Postgres is reachable and ALWAYS targets the
// guarded test DB (never `DATABASE_URL`). If Postgres is unavailable, skip instead
// of failing — this is what keeps `bun run test` both safe and self-contained.
let testDatabaseUrl = ''
let testDatabaseReady = false
try {
  testDatabaseUrl = await ensureTestDatabase()
  testDatabaseReady = true
} catch (error) {
  console.warn(`[users-roles.integration] skipping: test database unavailable — ${(error as Error).message}`)
}

// Share a single CMS instance (and DB pool) across the suite to avoid exhausting
// PostgreSQL connections when run alongside other integration suites.
let app: Hono
let db: DatabaseInstance

type Db = DatabaseInstance

async function clearOwners(db: Db): Promise<void> {
  await db.update(users).set({ isOwner: false })
}

async function createUser(
  db: Db,
  options: { role?: string; isOwner?: boolean } = {},
): Promise<{ id: string; token: string }> {
  const id = randomUUID()
  const token = `token-${randomUUID()}`
  await db.insert(users).values({
    id,
    email: `user-${randomUUID()}@viseed.dev`,
    name: 'Test User',
    passwordHash: 'hashed',
    role: options.role ?? 'admin',
    isOwner: options.isOwner ?? false,
  })
  await db.insert(sessions).values({
    id: randomUUID(),
    siteId: DEFAULT_SITE_ID,
    userId: id,
    token,
    expiresAt: new Date(Date.now() + 60_000),
  })
  return { id, token }
}

describe.skipIf(!testDatabaseReady)('users & roles', () => {
  beforeAll(async () => {
    const cms = createCMS({
      db: { driver: 'postgres', url: testDatabaseUrl },
      admin: { enabled: false },
    })
    app = await cms.launch()
    db = cms.getDatabase()

    // Tests assign roles/sessions on the default site; ensure it exists so the
    // suite is self-contained on a fresh (e.g. dedicated test) database.
    const [site] = await db.select().from(sites).where(eq(sites.id, DEFAULT_SITE_ID))
    if (!site) {
      await db.insert(sites).values({
        id: DEFAULT_SITE_ID,
        name: 'Default',
        slug: 'default',
        status: 'active',
      })
    }
  })

  test('seeds the three system roles with locked admin permissions', async () => {
    const systemRoles = await db.select().from(roles).where(eq(roles.isSystem, true))
    const slugs = systemRoles.map((role) => role.slug).sort()
    expect(slugs).toEqual(['admin', 'site_admin', 'site_content_writer'])

    const adminPerms = await db
      .select({ permission: rolePermissions.permission })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleSlug, 'admin'))
    expect(adminPerms.some((row) => row.permission === 'platform.users.manage')).toBe(true)
  })

  test('owner resolves to the full permission catalog', async () => {
    await clearOwners(db)
    const owner = await createUser(db, { role: 'admin', isOwner: true })

    const response = await app.request('http://localhost/api/admin/auth/context', {
      headers: { authorization: `Bearer ${owner.token}` },
    })

    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      isOwner: boolean
      permissions: Array<string>
    }
    expect(payload.isOwner).toBe(true)
    expect(payload.permissions).toContain('platform.users.manage')
    expect(payload.permissions).toContain('site.content.write')
  })

  test('custom role resolves to its assigned permissions only', async () => {

    const slug = `editor-${randomUUID().slice(0, 8)}`
    await db.insert(roles).values({
      id: randomUUID(),
      slug,
      name: 'Editor',
      isSystem: false,
    })
    await db.insert(rolePermissions).values({
      id: randomUUID(),
      roleSlug: slug,
      permission: 'site.content.read',
    })

    const editor = await createUser(db, { role: slug })
    await db.insert(userSiteRoles).values({
      id: randomUUID(),
      userId: editor.id,
      siteId: DEFAULT_SITE_ID,
      role: slug,
    })

    const response = await app.request('http://localhost/api/admin/auth/context', {
      headers: { authorization: `Bearer ${editor.token}` },
    })

    expect(response.status).toBe(200)
    const payload = (await response.json()) as { permissions: Array<string> }
    expect(payload.permissions).toContain('site.content.read')
    expect(payload.permissions).not.toContain('platform.users.manage')
  })

  test('forbids non-platform users from listing users', async () => {
    const writer = await createUser(db, { role: 'site_content_writer' })
    await db.insert(userSiteRoles).values({
      id: randomUUID(),
      userId: writer.id,
      siteId: DEFAULT_SITE_ID,
      role: 'site_content_writer',
    })

    const response = await app.request('http://localhost/api/admin/users', {
      headers: { authorization: `Bearer ${writer.token}` },
    })

    expect(response.status).toBe(403)
  })

  test('allows an admin to list users', async () => {
    const admin = await createUser(db, { role: 'admin' })

    const response = await app.request('http://localhost/api/admin/users', {
      headers: { authorization: `Bearer ${admin.token}` },
    })

    expect(response.status).toBe(200)
    const payload = (await response.json()) as { users: Array<{ id: string }> }
    expect(Array.isArray(payload.users)).toBe(true)
  })

  test('refuses to delete the owner', async () => {
    await clearOwners(db)
    const owner = await createUser(db, { role: 'admin', isOwner: true })
    const admin = await createUser(db, { role: 'admin' })

    const response = await app.request(`http://localhost/api/admin/users/${owner.id}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${admin.token}` },
    })

    expect(response.status).toBe(403)

    const [stillThere] = await db.select().from(users).where(eq(users.id, owner.id))
    expect(stillThere?.isOwner).toBe(true)
  })

  test('transfers ownership from the owner to another admin', async () => {
    await clearOwners(db)
    const owner = await createUser(db, { role: 'admin', isOwner: true })
    const target = await createUser(db, { role: 'admin' })

    const response = await app.request(
      `http://localhost/api/admin/users/${target.id}/transfer-ownership`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${owner.token}` },
      },
    )

    expect(response.status).toBe(200)

    const [oldOwner] = await db.select().from(users).where(eq(users.id, owner.id))
    const [newOwner] = await db.select().from(users).where(eq(users.id, target.id))
    expect(oldOwner?.isOwner).toBe(false)
    expect(newOwner?.isOwner).toBe(true)
  })

  test('non-owner admin cannot transfer ownership', async () => {
    await clearOwners(db)
    const owner = await createUser(db, { role: 'admin', isOwner: true })
    const admin = await createUser(db, { role: 'admin' })
    const target = await createUser(db, { role: 'admin' })

    const response = await app.request(
      `http://localhost/api/admin/users/${target.id}/transfer-ownership`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${admin.token}` },
      },
    )

    expect(response.status).toBe(403)

    const [stillOwner] = await db.select().from(users).where(eq(users.id, owner.id))
    expect(stillOwner?.isOwner).toBe(true)
  })
})
