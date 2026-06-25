import { SQL } from 'bun'
import { beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { sessions, siteDomains, userSiteRoles, users } from '@viseed/schema'
import { eq } from 'drizzle-orm'
import { createCMS } from './viseed-cms'
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
  console.warn(`[admin-guards.integration] skipping: test database unavailable — ${(error as Error).message}`)
}

// Some tests assert the boot-time seeding that only runs when no users exist.
// They must start from an empty users table regardless of what earlier tests
// inserted into the shared test database.
async function resetUsersTable(): Promise<void> {
  const sql = new SQL(testDatabaseUrl)
  try {
    await sql`TRUNCATE TABLE viseed_users CASCADE`
  } finally {
    await sql.end()
  }
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key]
  } else {
    process.env[key] = value
  }
}

describe.skipIf(!testDatabaseReady)('admin runtime tenancy and guards', () => {
  beforeAll(async () => {
    // Sessions/role assignments reference the default site; ensure it exists so
    // the suite is self-contained on a fresh (dedicated) test database.
    const sql = new SQL(testDatabaseUrl)
    try {
      await sql`
        INSERT INTO viseed_sites (id, name, slug, status)
        VALUES (${DEFAULT_SITE_ID}, 'Default', 'default', 'active')
        ON CONFLICT (id) DO NOTHING
      `
    } finally {
      await sql.end()
    }
  })

  test('rejects admin API requests without session token', async () => {
    const cms = createCMS({
      db: { driver: 'postgres', url: testDatabaseUrl },
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
      db: { driver: 'postgres', url: testDatabaseUrl },
      admin: { enabled: false },
    })
    const app = await cms.launch()
    const db = cms.getDatabase()

    const adminUserId = randomUUID()
    const adminToken = `token-${randomUUID()}`

    await db.insert(users).values({
      id: adminUserId,
      email: `admin-${randomUUID()}@viseed.dev`,
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
      db: { driver: 'postgres', url: testDatabaseUrl },
      admin: { enabled: false },
    })
    const app = await cms.launch()
    const db = cms.getDatabase()

    const writerUserId = randomUUID()
    const writerToken = `token-${randomUUID()}`

    await db.insert(users).values({
      id: writerUserId,
      email: `writer-${randomUUID()}@viseed.dev`,
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
      db: { driver: 'postgres', url: testDatabaseUrl },
      admin: { enabled: false },
    })
    const app = await cms.launch()
    const db = cms.getDatabase()

    const adminUserId = randomUUID()
    const adminToken = `token-${randomUUID()}`

    await db.insert(users).values({
      id: adminUserId,
      email: `admin-${randomUUID()}@viseed.dev`,
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
      db: { driver: 'postgres', url: testDatabaseUrl },
      admin: { enabled: false },
    })
    const app = await cms.launch()
    const db = cms.getDatabase()

    const adminUserId = randomUUID()
    const adminToken = `token-${randomUUID()}`

    await db.insert(users).values({
      id: adminUserId,
      email: `admin-${randomUUID()}@viseed.dev`,
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
      db: { driver: 'postgres', url: testDatabaseUrl },
      admin: { enabled: false },
    })
    const app = await cms.launch()
    const db = cms.getDatabase()

    const userId = randomUUID()
    const password = 'super-secure-password'
    const passwordHash = await Bun.password.hash(password)
    const email = `login-${randomUUID()}@viseed.dev`

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
    expect(sessionCookie?.includes('viseed_admin_session=')).toBe(true)

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
    await resetUsersTable()
    const bootstrapEmail = `bootstrap-${randomUUID()}@viseed.dev`
    const cms = createCMS({
      db: { driver: 'postgres', url: testDatabaseUrl },
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

  test('seeds default dev admin automatically when dev env vars are set', async () => {
    const previousEnv = {
      NODE_ENV: process.env.NODE_ENV,
      email: process.env.HANA_ADMIN_EMAIL,
      password: process.env.HANA_ADMIN_PASSWORD,
      name: process.env.HANA_ADMIN_NAME,
    }
    process.env.NODE_ENV = 'development'
    // The dev admin is auto-seeded only when explicit HANA_ADMIN_* env vars are
    // provided (see ensureBootstrapAdmin); without them the setup wizard handles
    // first-run setup instead.
    process.env.HANA_ADMIN_EMAIL = 'admin@local.dev'
    process.env.HANA_ADMIN_PASSWORD = 'local-dev-password'
    process.env.HANA_ADMIN_NAME = 'Local Admin'

    try {
      await resetUsersTable()
      const cms = createCMS({
        db: { driver: 'postgres', url: testDatabaseUrl },
        admin: { enabled: false },
      })
      await cms.launch()

      const db = cms.getDatabase()
      const [defaultAdmin] = await db.select().from(users).where(eq(users.email, 'admin@local.dev'))

      expect(defaultAdmin?.name).toBe('Local Admin')
      expect(Boolean(defaultAdmin?.passwordHash)).toBe(true)
    } finally {
      process.env.NODE_ENV = previousEnv.NODE_ENV
      restoreEnv('HANA_ADMIN_EMAIL', previousEnv.email)
      restoreEnv('HANA_ADMIN_PASSWORD', previousEnv.password)
      restoreEnv('HANA_ADMIN_NAME', previousEnv.name)
    }
  })
})
