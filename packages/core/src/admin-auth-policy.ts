import { rolePermissions, sessions, userSiteRoles, users } from '@viseed/schema'
import type {
  ActorContext,
  Permission,
  RequestContext,
  RoleSlug,
  SiteContext,
} from '@viseed/types'
import { PERMISSION_CATALOG } from '@viseed/types'
import { and, eq, gt, inArray } from 'drizzle-orm'
import type { Context } from 'hono'
import { getCookie } from 'hono/cookie'
import type { DatabaseInstance } from './database'
import { resolveSiteContextByHost } from './site-resolver'

const BUILTIN_PERMISSION_SET: ReadonlySet<string> = new Set(PERMISSION_CATALOG)

/**
 * View of the active permission catalog used during auth resolution. Defaults
 * to the built-in catalog so callers without the dynamic
 * {@link PermissionRegistry} stay backward compatible. The owner is granted
 * every key in the catalog; role-based permissions are filtered by `has`.
 */
export interface PermissionCatalog {
  has: (key: string) => boolean
  keys: () => string[]
}

const BUILTIN_PERMISSION_CATALOG: PermissionCatalog = {
  has: (key) => BUILTIN_PERMISSION_SET.has(key),
  keys: () => [...PERMISSION_CATALOG],
}

/**
 * Resolve the union of permissions granted by a set of role slugs, sourced from
 * the DB-backed `role_permissions` table. Permissions unknown to the active
 * catalog are ignored defensively.
 */
async function resolvePermissionsForRoleSlugs(
  db: DatabaseInstance,
  slugs: Array<RoleSlug>,
  catalog: PermissionCatalog = BUILTIN_PERMISSION_CATALOG,
): Promise<Array<Permission>> {
  if (slugs.length === 0) {
    return []
  }

  const rows = await db
    .select({ permission: rolePermissions.permission })
    .from(rolePermissions)
    .where(inArray(rolePermissions.roleSlug, slugs))

  const permissions = new Set<Permission>()
  for (const row of rows) {
    if (catalog.has(row.permission)) {
      permissions.add(row.permission as Permission)
    }
  }

  return [...permissions]
}

export const REQUEST_CONTEXT_KEY = 'viseed.requestContext'

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

  const cookieToken = getCookie(c, 'viseed_admin_session')
  if (cookieToken?.trim()) {
    return cookieToken.trim()
  }

  const headerToken = c.req.header('x-viseed-session-token')
  if (headerToken?.trim()) {
    return headerToken.trim()
  }

  return null
}

function parseUsersTableRole(role: string | null | undefined): RoleSlug | null {
  const slug = role?.trim()
  return slug ? slug : null
}

function dedupeRoleAssignments(
  roleAssignments: Array<{ role: RoleSlug; siteId?: string }>,
): Array<{ role: RoleSlug; siteId?: string }> {
  const seen = new Set<string>()
  const deduped: Array<{ role: RoleSlug; siteId?: string }> = []

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
  catalog: PermissionCatalog = BUILTIN_PERMISSION_CATALOG,
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

  // The owner is a platform-wide superuser: full permissions on every site and
  // never blocked by per-site role checks.
  if (user.isOwner) {
    return {
      ok: true,
      status: 200,
      error: null,
      value: {
        actor: {
          id: user.id,
          email: user.email,
          name: user.name,
          roleAssignments: [{ role: 'admin' }],
          isOwner: true,
        },
        permissions: catalog.keys() as Array<Permission>,
      },
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
    role: row.role as RoleSlug,
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

  const slugs = [...new Set(scopedAssignments.map((assignment) => assignment.role))]

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
        isOwner: false,
      },
      permissions: await resolvePermissionsForRoleSlugs(db, slugs, catalog),
    },
  }
}

/**
 * Resolve the full authenticated {@link RequestContext} for a request: resolve
 * the site from the Host header, validate the session, and compute the actor's
 * effective permissions. Shared by the admin API middleware and the plugin
 * route guard so both enforce identical auth semantics.
 */
export interface AuthenticationResult {
  ok: boolean
  status: number
  error: string | null
  requestContext: RequestContext | null
}

export async function authenticateRequest(
  db: DatabaseInstance,
  c: Context,
  catalog: PermissionCatalog = BUILTIN_PERMISSION_CATALOG,
): Promise<AuthenticationResult> {
  const siteResolution = await resolveSiteContextByHost(db, c.req.header('host'))
  if (!siteResolution.site) {
    return {
      ok: false,
      status: 400,
      error: siteResolution.error ?? 'Unable to resolve site from Host header.',
      requestContext: null,
    }
  }

  const sessionResolution = await resolveSessionActorContext(
    db,
    c,
    siteResolution.site,
    catalog,
  )
  if (!sessionResolution.ok || !sessionResolution.value) {
    return {
      ok: false,
      status: sessionResolution.status === 403 ? 403 : 401,
      error: sessionResolution.error ?? 'Unauthorized',
      requestContext: null,
    }
  }

  return {
    ok: true,
    status: 200,
    error: null,
    requestContext: {
      site: siteResolution.site,
      actor: sessionResolution.value.actor,
      permissions: sessionResolution.value.permissions,
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
