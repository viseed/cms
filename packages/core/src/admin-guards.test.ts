import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { sessions, siteDomains, userSiteRoles, users } from '@hanano/schema'
import { eq } from 'drizzle-orm'
import { createCMS } from './hanano-cms'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/hana_test'
const DEFAULT_SITE_ID = 'default'

describe('admin runtime tenancy and guards', () => {
  test('rejects admin API requests without session token', async () => {
    const cms = createCMS({
      db: { driver: 'postgres', url: DATABASE_URL },
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
      db: { driver: 'postgres', url: DATABASE_URL },
      admin: { enabled: false },
    })
    const app = await cms.launch()
    const db = cms.getDatabase()

    const adminUserId = randomUUID()
    const adminToken = `token-${randomUUID()}`

    await db.insert(users).values({
      id: adminUserId,
      email: `admin-${randomUUID()}@hana.dev`,
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
      db: { driver: 'postgres', url: DATABASE_URL },
      admin: { enabled: false },
    })
    const app = await cms.launch()
    const db = cms.getDatabase()

    const writerUserId = randomUUID()
    const writerToken = `token-${randomUUID()}`

    await db.insert(users).values({
      id: writerUserId,
      email: `writer-${randomUUID()}@hana.dev`,
      name: 'Writer',
      passwordHash: 'hashed',
      role: 'site_content_writer',
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
      db: { driver: 'postgres', url: DATABASE_URL },
      admin: { enabled: false },
    })
    const app = await cms.launch()
    const db = cms.getDatabase()

    const adminUserId = randomUUID()
    const adminToken = `token-${randomUUID()}`

    await db.insert(users).values({
      id: adminUserId,
      email: `admin-${randomUUID()}@hana.dev`,
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
      db: { driver: 'postgres', url: DATABASE_URL },
      admin: { enabled: false },
    })
    const app = await cms.launch()
    const db = cms.getDatabase()

    const adminUserId = randomUUID()
    const adminToken = `token-${randomUUID()}`

    await db.insert(users).values({
      id: adminUserId,
      email: `admin-${randomUUID()}@hana.dev`,
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

  test('supports admin login endpoint in core auth flow', async () => {
    const cms = createCMS({
      db: { driver: 'postgres', url: DATABASE_URL },
      admin: { enabled: false },
    })
    const app = await cms.launch()
    const db = cms.getDatabase()

    const userId = randomUUID()
    const password = 'super-secure-password'
    const passwordHash = await Bun.password.hash(password)
    const email = `login-${randomUUID()}@hana.dev`

    await db.insert(users).values({
      id: userId,
      email,
      name: 'Login User',
      passwordHash,
      role: 'admin',
    })
    await db.insert(userSiteRoles).values({
      id: randomUUID(),
      userId,
      siteId: DEFAULT_SITE_ID,
      role: 'admin',
    })

    const loginResponse = await app.request('http://localhost/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    expect(loginResponse.status).toBe(200)
    const sessionCookie = loginResponse.headers.get('set-cookie')
    expect(sessionCookie?.includes('hana_admin_session=')).toBe(true)

    const contextResponse = await app.request('http://localhost/api/admin/auth/context', {
      headers: {
        cookie: sessionCookie ?? '',
      },
    })

    expect(contextResponse.status).toBe(200)
    const payload = (await contextResponse.json()) as { currentUser?: { email?: string } }
    expect(payload.currentUser?.email).toBe(email)
  })

  test('bootstraps initial admin when configured on first launch', async () => {
    const bootstrapEmail = `bootstrap-${randomUUID()}@hana.dev`
    const cms = createCMS({
      db: { driver: 'postgres', url: DATABASE_URL },
      admin: {
        enabled: false,
        bootstrapAdmin: {
          email: bootstrapEmail,
          password: 'bootstrap-password',
          name: 'Bootstrap Admin',
        },
      },
    })
    await cms.launch()

    const db = cms.getDatabase()
    const [adminUser] = await db.select().from(users).where(eq(users.email, bootstrapEmail))
    expect(adminUser?.name).toBe('Bootstrap Admin')
    expect(Boolean(adminUser?.passwordHash)).toBe(true)

    if (!adminUser) {
      throw new Error('Expected bootstrap admin to be created')
    }

    const [adminRole] = await db
      .select()
      .from(userSiteRoles)
      .where(eq(userSiteRoles.userId, adminUser.id))
    expect(adminRole?.role).toBe('admin')
    expect(adminRole?.siteId).toBe(DEFAULT_SITE_ID)
  })

  test('seeds default dev admin automatically when no users exist', async () => {
    const previousEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    try {
      const cms = createCMS({
        db: { driver: 'postgres', url: DATABASE_URL },
        admin: { enabled: false },
      })
      await cms.launch()

      const db = cms.getDatabase()
      const [defaultAdmin] = await db.select().from(users).where(eq(users.email, 'admin@local.dev'))

      expect(defaultAdmin?.name).toBe('Local Admin')
      expect(Boolean(defaultAdmin?.passwordHash)).toBe(true)
    } finally {
      process.env.NODE_ENV = previousEnv
    }
  })
})
