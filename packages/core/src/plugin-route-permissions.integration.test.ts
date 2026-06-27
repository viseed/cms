import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rolePermissions, roles, sessions, sites, userSiteRoles, users } from '@viseed/schema'
import type { CMSPlugin } from '@viseed/types'
import { definePermission, PERMISSIONS } from '@viseed/types'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import type { DatabaseInstance } from './database'
import { ensureTestDatabase } from './test-support'
import { createCMS } from './viseed-cms'

const DEFAULT_SITE_ID = 'default'

let testDatabaseUrl = ''
let testDatabaseReady = false
try {
  testDatabaseUrl = await ensureTestDatabase()
  testDatabaseReady = true
} catch (error) {
  console.warn(
    `[plugin-route-permissions.integration] skipping: test database unavailable — ${(error as Error).message}`,
  )
}

let app: Hono
let db: DatabaseInstance

// A custom permission defined via the helper — passed straight to the route so
// its metadata reaches the Roles catalog without a separate `permissions[]`.
const customPermission = definePermission({
  key: 'test.custom',
  label: 'Custom test permission',
  group: 'Test',
})

// A plugin that exercises every PluginRouter variant: built-in read/write
// permissions, a plugin-declared custom permission, and a public route.
const testPlugin: CMSPlugin = {
  name: 'test-perms',
  version: '0.0.0',
  routes: (_app, helpers) => {
    const api = helpers.createSubApp('/api/test-perms')
    api.get('/read', PERMISSIONS.siteContentRead, (c) => c.json({ ok: 'read' }))
    api.post('/write', PERMISSIONS.siteContentWrite, (c) => c.json({ ok: 'write' }))
    api.get('/custom', customPermission, (c) => c.json({ ok: 'custom' }))
    api.public.get('/public', (c) => c.json({ ok: 'public' }))
  },
}

async function clearOwners(): Promise<void> {
  await db.update(users).set({ isOwner: false })
}

async function createUserWithPermissions(
  permissions: string[],
  options: { isOwner?: boolean } = {},
): Promise<{ id: string; token: string }> {
  const id = randomUUID()
  const token = `token-${randomUUID()}`
  const slug = `role-${randomUUID().slice(0, 8)}`

  await db.insert(roles).values({ id: randomUUID(), slug, name: slug, isSystem: false })
  for (const permission of permissions) {
    await db.insert(rolePermissions).values({ id: randomUUID(), roleSlug: slug, permission })
  }

  await db.insert(users).values({
    id,
    email: `user-${randomUUID()}@viseed.dev`,
    name: 'Test User',
    passwordHash: 'hashed',
    role: slug,
    isOwner: options.isOwner ?? false,
  })
  await db.insert(userSiteRoles).values({
    id: randomUUID(),
    userId: id,
    siteId: DEFAULT_SITE_ID,
    role: slug,
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

describe.skipIf(!testDatabaseReady)('plugin route permissions', () => {
  beforeAll(async () => {
    const cms = createCMS({
      db: { driver: 'postgres', url: testDatabaseUrl },
      admin: { enabled: false },
      plugins: [testPlugin],
    })
    app = await cms.launch()
    db = cms.getDatabase()

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

  // Release this suite's DB pool so later integration suites in the same process
  // don't hit PostgreSQL's `too many clients already` limit.
  afterAll(async () => {
    const client = (db as unknown as { $client?: { end?: () => Promise<void> } }).$client
    await client?.end?.()
  })

  test('public route is reachable without authentication', async () => {
    const response = await app.request('http://localhost/api/test-perms/public')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: 'public' })
  })

  test('protected route without a session returns 401', async () => {
    const response = await app.request('http://localhost/api/test-perms/read')
    expect(response.status).toBe(401)
  })

  test('protected route grants access when the permission is present', async () => {
    const reader = await createUserWithPermissions(['site.content.read'])
    const response = await app.request('http://localhost/api/test-perms/read', {
      headers: { authorization: `Bearer ${reader.token}` },
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: 'read' })
  })

  test('protected write route is forbidden for a read-only role', async () => {
    const reader = await createUserWithPermissions(['site.content.read'])
    const response = await app.request('http://localhost/api/test-perms/write', {
      method: 'POST',
      headers: { authorization: `Bearer ${reader.token}` },
    })
    expect(response.status).toBe(403)
  })

  test('a plugin-declared permission can be granted and enforced', async () => {
    const granted = await createUserWithPermissions(['test.custom'])
    const denied = await createUserWithPermissions(['site.content.read'])

    const grantedResponse = await app.request('http://localhost/api/test-perms/custom', {
      headers: { authorization: `Bearer ${granted.token}` },
    })
    expect(grantedResponse.status).toBe(200)
    expect(await grantedResponse.json()).toEqual({ ok: 'custom' })

    const deniedResponse = await app.request('http://localhost/api/test-perms/custom', {
      headers: { authorization: `Bearer ${denied.token}` },
    })
    expect(deniedResponse.status).toBe(403)
  })

  test('owner can access a plugin-declared permission route', async () => {
    await clearOwners()
    const owner = await createUserWithPermissions([], { isOwner: true })
    const response = await app.request('http://localhost/api/test-perms/custom', {
      headers: { authorization: `Bearer ${owner.token}` },
    })
    expect(response.status).toBe(200)
  })

  test('the dynamic catalog exposes plugin-declared permissions', async () => {
    const reader = await createUserWithPermissions(['platform.users.read'])
    const response = await app.request('http://localhost/api/admin/permissions', {
      headers: { authorization: `Bearer ${reader.token}` },
    })
    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      permissions: Array<{ key: string; source: string; label: string; group?: string }>
    }
    const custom = payload.permissions.find((entry) => entry.key === 'test.custom')
    expect(custom).toMatchObject({
      key: 'test.custom',
      source: 'plugin',
      label: 'Custom test permission',
      group: 'Test',
    })
  })
})
