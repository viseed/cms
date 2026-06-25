import { randomBytes, randomUUID } from 'node:crypto'
import { sessions, siteDomains, sites, userSiteRoles, users } from '@viseed/schema'
import type { Permission, RequestContext } from '@viseed/types'
import { SINGLE_SITE_CONTEXT, toAuthContextPayload } from '@viseed/types'
import { loginSchema } from '@viseed/validator'
import { count, eq } from 'drizzle-orm'
import type { Context, Handler } from 'hono'
import { setCookie } from 'hono/cookie'
import { getSessionToken } from '../admin-auth-policy'
import type { DatabaseInstance } from '../database'
import { generateAndActivateEncryptionKey, hasEncryptionKey } from '../secret-cipher'

const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7

const USERS_TABLE_ROLES = new Set<'admin' | 'site_admin' | 'site_content_writer'>([
  'admin',
  'site_admin',
  'site_content_writer',
])

function parseUsersTableRole(
  role: string | null | undefined,
): 'admin' | 'site_admin' | 'site_content_writer' | null {
  if (!role || !USERS_TABLE_ROLES.has(role as 'admin' | 'site_admin' | 'site_content_writer')) {
    return null
  }
  return role as 'admin' | 'site_admin' | 'site_content_writer'
}

export interface AdminAuthContext {
  getDatabase: () => DatabaseInstance
  resolveRequestContext: (c: Context) => RequestContext
}

export type RegisterPublicAdminRoute = (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  routePath: string,
  handler: Handler,
) => void

export type RegisterAdminRoute = (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  routePath: string,
  permission: Permission,
  handler: Handler,
) => void

function handleLogin(ctx: AdminAuthContext): Handler {
  return async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400)
    }

    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid login payload.' }, 400)
    }

    const requestContext = ctx.resolveRequestContext(c)
    const site = requestContext.site
    const db = ctx.getDatabase()
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, parsed.data.email.trim().toLowerCase()))

    if (!user) {
      return c.json({ error: 'Invalid email or password.' }, 401)
    }

    const passwordOk = await Bun.password.verify(parsed.data.password, user.passwordHash)
    if (!passwordOk) {
      return c.json({ error: 'Invalid email or password.' }, 401)
    }

    if (!user.isOwner) {
      const roleRows = await db
        .select({
          role: userSiteRoles.role,
          siteId: userSiteRoles.siteId,
        })
        .from(userSiteRoles)
        .where(eq(userSiteRoles.userId, user.id))

      const usersTableRole = parseUsersTableRole(user.role)
      const usersTableGrantsDefaultSite =
        site.id === SINGLE_SITE_CONTEXT.id &&
        (usersTableRole === 'site_admin' || usersTableRole === 'site_content_writer')
      const hasSiteAccess =
        roleRows.some(
          (row: { role: string; siteId: string }) =>
            row.role === 'admin' || row.siteId === site.id,
        ) ||
        usersTableRole === 'admin' ||
        usersTableGrantsDefaultSite

      if (!hasSiteAccess) {
        return c.json({ error: `User has no access to site "${site.slug}".` }, 403)
      }
    }

    const token = randomBytes(32).toString('hex')
    await db.insert(sessions).values({
      id: randomUUID(),
      siteId: site.id,
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + ADMIN_SESSION_TTL_MS),
    })

    setCookie(c, 'viseed_admin_session', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      secure: c.req.url.startsWith('https://'),
      maxAge: ADMIN_SESSION_TTL_MS / 1000,
    })

    return c.json({ message: 'Logged in.' })
  }
}

function handleLogout(ctx: AdminAuthContext): Handler {
  return async (c) => {
    const db = ctx.getDatabase()
    const requestContext = ctx.resolveRequestContext(c)
    const token = getSessionToken(c)
    if (token) {
      const rows = await db
        .select({
          id: sessions.id,
          siteId: sessions.siteId,
        })
        .from(sessions)
        .where(eq(sessions.token, token))

      for (const row of rows) {
        const sameSite = row.siteId === requestContext.site.id
        const hasSiteRole = requestContext.actor?.roleAssignments.some(
          (assignment) => assignment.role === 'admin' || assignment.siteId === row.siteId,
        )

        if (sameSite || hasSiteRole) {
          await db.delete(sessions).where(eq(sessions.id, row.id))
        }
      }
    }

    setCookie(c, 'viseed_admin_session', '', {
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      secure: c.req.url.startsWith('https://'),
      maxAge: 0,
    })

    return c.json({ message: 'Logged out.' })
  }
}

function handleSetupStatus(ctx: AdminAuthContext): Handler {
  return async (c) => {
    const db = ctx.getDatabase()
    const countResult = await db.select({ total: count() }).from(users)
    const userCount = countResult[0]?.total ?? 0
    return c.json({ needsSetup: userCount === 0 })
  }
}

function handleSetup(ctx: AdminAuthContext): Handler {
  return async (c) => {
    const db = ctx.getDatabase()

    const countResult = await db.select({ total: count() }).from(users)
    const userCount = countResult[0]?.total ?? 0
    if (userCount > 0) {
      return c.json({ error: 'Setup already completed.' }, 403)
    }

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400)
    }

    const {
      email: rawEmail,
      password,
      name: rawName,
      siteName: rawSiteName,
      domain: rawDomain,
    } = body as Record<string, unknown>

    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
    const password_ = typeof password === 'string' ? password : ''
    const name = typeof rawName === 'string' ? rawName.trim() : ''
    const siteName = typeof rawSiteName === 'string' ? rawSiteName.trim() : ''
    const domain = typeof rawDomain === 'string' ? rawDomain.trim().toLowerCase() : ''

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: 'A valid email is required.' }, 400)
    }
    if (password_.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters.' }, 400)
    }
    if (!name) {
      return c.json({ error: 'Admin name is required.' }, 400)
    }

    const [existingSite] = await db.select().from(sites).where(eq(sites.id, SINGLE_SITE_CONTEXT.id))

    if (!existingSite) {
      await db.insert(sites).values({
        id: SINGLE_SITE_CONTEXT.id,
        name: siteName || SINGLE_SITE_CONTEXT.name,
        slug: SINGLE_SITE_CONTEXT.slug,
        status: 'active',
      })
    } else if (siteName) {
      await db
        .update(sites)
        .set({ name: siteName, updatedAt: new Date() })
        .where(eq(sites.id, SINGLE_SITE_CONTEXT.id))
    }

    const LOCALHOST_PATTERNS = new Set(['localhost', '127.0.0.1', '::1'])
    const domainHost = domain.split(':').at(0) ?? ''
    if (domain && !LOCALHOST_PATTERNS.has(domainHost)) {
      const [existingDomain] = await db
        .select()
        .from(siteDomains)
        .where(eq(siteDomains.domain, domain))
      if (!existingDomain) {
        await db.insert(siteDomains).values({
          id: randomUUID(),
          siteId: SINGLE_SITE_CONTEXT.id,
          domain,
          isPrimary: true,
        })
      }
    }

    const passwordHash = await Bun.password.hash(password_)
    const userId = randomUUID()

    await db.insert(users).values({
      id: userId,
      email,
      name,
      passwordHash,
      role: 'admin',
      isOwner: true,
    })

    await db.insert(userSiteRoles).values({
      id: randomUUID(),
      userId,
      siteId: SINGLE_SITE_CONTEXT.id,
      role: 'admin',
    })

    if (!hasEncryptionKey()) {
      generateAndActivateEncryptionKey()
    }

    return c.json({ ok: true })
  }
}

function handleGetAuthContext(ctx: AdminAuthContext): Handler {
  return (c) => {
    const requestContext = ctx.resolveRequestContext(c)
    return c.json(toAuthContextPayload(requestContext))
  }
}

export function registerAuthRoutes(
  registerPublic: RegisterPublicAdminRoute,
  registerRoute: RegisterAdminRoute,
  context: AdminAuthContext,
): void {
  registerPublic('POST', '/auth/login', handleLogin(context))
  registerPublic('POST', '/auth/logout', handleLogout(context))
  registerPublic('GET', '/setup/status', handleSetupStatus(context))
  registerPublic('POST', '/setup', handleSetup(context))
  registerRoute('GET', '/auth/context', 'site.content.read', handleGetAuthContext(context))
}
