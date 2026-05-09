import { sessions, userSiteRoles, users } from '@hanano/schema'
import type { ActorContext, Permission, RBACRole, RequestContext, SiteContext } from '@hanano/types'
import { resolvePermissionsForRoles } from '@hanano/types'
import { and, eq, gt } from 'drizzle-orm'
import type { Context } from 'hono'
import { getCookie } from 'hono/cookie'
import type { DatabaseInstance } from './database'

export const REQUEST_CONTEXT_KEY = 'hana.requestContext'

interface SessionResolutionSuccess {
  actor: ActorContext
  permissions: Array<Permission>
}

export interface SessionResolutionResult {
  ok: boolean
  status: number
  error: string | null
  value: SessionResolutionSuccess | null
}

export interface AdminRoutePolicy {
  permission: Permission
}

interface CompiledAdminRoutePolicy {
  method: string
  routePath: string
  policy: AdminRoutePolicy
  matcher: RegExp
}

export class AdminPolicyRegistry {
  private entries: Array<CompiledAdminRoutePolicy> = []

  register(method: string, routePath: string, policy: AdminRoutePolicy): void {
    this.entries.push({
      method: method.toUpperCase(),
      routePath,
      policy,
      matcher: compileRoutePath(routePath),
    })
  }

  resolve(method: string, path: string): CompiledAdminRoutePolicy | null {
    const normalizedMethod = method.toUpperCase()
    for (const entry of this.entries) {
      if (entry.method !== normalizedMethod) {
        continue
      }
      if (entry.matcher.test(path)) {
        return entry
      }
    }
    return null
  }
}

function compileRoutePath(routePath: string): RegExp {
  const escaped = routePath
    .split('/')
    .map((segment) => {
      if (!segment) {
        return ''
      }
      if (segment.startsWith(':')) {
        return '[^/]+'
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('/')

  return new RegExp(`^${escaped}$`)
}

export function getSessionToken(c: Context): string | null {
  const authHeader = c.req.header('authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim()
    if (token) {
      return token
    }
  }

  const cookieToken = getCookie(c, 'hana_admin_session')
  if (cookieToken?.trim()) {
    return cookieToken.trim()
  }

  const headerToken = c.req.header('x-hana-session-token')
  if (headerToken?.trim()) {
    return headerToken.trim()
  }

  return null
}

const USERS_TABLE_ROLES: ReadonlySet<RBACRole> = new Set([
  'admin',
  'site_admin',
  'site_content_writer',
])

function parseUsersTableRole(role: string | null | undefined): RBACRole | null {
  if (!role || !USERS_TABLE_ROLES.has(role as RBACRole)) {
    return null
  }
  return role as RBACRole
}

function dedupeRoleAssignments(
  roleAssignments: Array<{ role: RBACRole; siteId?: string }>,
): Array<{ role: RBACRole; siteId?: string }> {
  const seen = new Set<string>()
  const deduped: Array<{ role: RBACRole; siteId?: string }> = []

  for (const assignment of roleAssignments) {
    const key = `${assignment.role}:${assignment.siteId ?? 'all'}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    deduped.push(assignment)
  }

  return deduped
}

export async function resolveSessionActorContext(
  db: DatabaseInstance,
  c: Context,
  site: SiteContext,
): Promise<SessionResolutionResult> {
  const token = getSessionToken(c)

  if (!token) {
    return {
      ok: false,
      status: 401,
      error: 'Authentication required: missing session token.',
      value: null,
    }
  }

  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))

  if (!session) {
    return {
      ok: false,
      status: 401,
      error: 'Authentication failed: session is invalid or expired.',
      value: null,
    }
  }

  if (session.siteId !== site.id) {
    return {
      ok: false,
      status: 403,
      error: `Session site mismatch. Session belongs to site "${session.siteId}" while request targets "${site.id}".`,
      value: null,
    }
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId))
  if (!user) {
    return {
      ok: false,
      status: 401,
      error: 'Authentication failed: session user not found.',
      value: null,
    }
  }

  const roleRows = await db
    .select({
      role: userSiteRoles.role,
      siteId: userSiteRoles.siteId,
    })
    .from(userSiteRoles)
    .where(eq(userSiteRoles.userId, user.id))

  const explicitAssignments = roleRows.map((row) => ({
    role: row.role as RBACRole,
    siteId: row.role === 'admin' ? undefined : row.siteId,
  }))

  const usersTableRole = parseUsersTableRole(user.role)
  const assignments = dedupeRoleAssignments([
    ...explicitAssignments,
    ...(usersTableRole
      ? [{ role: usersTableRole, siteId: usersTableRole === 'admin' ? undefined : site.id }]
      : []),
  ])

  const scopedAssignments = assignments.filter(
    (assignment) => assignment.role === 'admin' || assignment.siteId === site.id,
  )

  if (scopedAssignments.length === 0) {
    return {
      ok: false,
      status: 403,
      error: `User "${user.id}" has no role assignment for site "${site.id}".`,
      value: null,
    }
  }

  return {
    ok: true,
    status: 200,
    error: null,
    value: {
      actor: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleAssignments: scopedAssignments,
      },
      permissions: resolvePermissionsForRoles(scopedAssignments),
    },
  }
}

export function setRequestContext(c: Context, requestContext: RequestContext): void {
  c.set(REQUEST_CONTEXT_KEY, requestContext)
}

export function getRequestContext(c: Context): RequestContext | null {
  const requestContext = c.get(REQUEST_CONTEXT_KEY) as RequestContext | undefined
  return requestContext ?? null
}
