import type { CMSPlugin } from './plugin'
import type { CMSTheme } from './theme'

export const PERMISSION_CATALOG = [
  'platform.sites.read',
  'platform.sites.manage',
  'site.content.read',
  'site.content.write',
  'site.menu.read',
  'site.menu.write',
  'site.path.read',
  'site.path.write',
  'site.media.read',
  'site.media.write',
] as const

export type Permission = (typeof PERMISSION_CATALOG)[number]

export type RBACRole = 'admin' | 'site_admin' | 'site_content_writer'

export interface SiteContext {
  id: string
  slug: string
  name: string
  isDefault: boolean
}

export interface RoleAssignment {
  role: RBACRole
  siteId?: string
}

export interface ActorContext {
  id: string
  email?: string
  name?: string
  roleAssignments: Array<RoleAssignment>
}

export interface RequestContext {
  site: SiteContext
  actor: ActorContext | null
  permissions: Array<Permission>
}

export interface AuthContextPayload {
  currentUser: ActorContext | null
  roleAssignments: Array<RoleAssignment>
  currentSite: SiteContext
  accessibleSites: Array<SiteContext>
  permissions: Array<Permission>
}

export interface PermissionCheckInput {
  context: RequestContext
  permission: Permission
}

export type PermissionChecker = (input: PermissionCheckInput) => boolean

export const SINGLE_SITE_CONTEXT: SiteContext = {
  id: 'default',
  slug: 'default',
  name: 'Default Site',
  isDefault: true,
}

export const SITE_ADMIN_PERMISSIONS: Array<Permission> = PERMISSION_CATALOG.filter(
  (permission) => !permission.startsWith('platform.'),
)

export const SITE_CONTENT_WRITER_PERMISSIONS: Array<Permission> = [
  'site.content.read',
  'site.content.write',
  'site.menu.read',
  'site.menu.write',
  'site.path.read',
  'site.path.write',
  'site.media.read',
  'site.media.write',
]

export const ROLE_PERMISSION_MATRIX: Record<RBACRole, ReadonlyArray<Permission>> = {
  admin: PERMISSION_CATALOG,
  site_admin: SITE_ADMIN_PERMISSIONS,
  site_content_writer: SITE_CONTENT_WRITER_PERMISSIONS,
}

export function resolvePermissionsForRoles(roleAssignments: Array<RoleAssignment>): Array<Permission> {
  const permissions = new Set<Permission>()

  for (const assignment of roleAssignments) {
    const mappedPermissions = ROLE_PERMISSION_MATRIX[assignment.role] ?? []
    for (const permission of mappedPermissions) {
      permissions.add(permission)
    }
  }

  return [...permissions]
}

export function checkPermission({ context, permission }: PermissionCheckInput): boolean {
  return context.permissions.includes(permission)
}

export function toAuthContextPayload(context: RequestContext): AuthContextPayload {
  const roleAssignments = context.actor?.roleAssignments ?? []
  const currentSite = context.site

  return {
    currentUser: context.actor,
    roleAssignments,
    currentSite,
    accessibleSites: [currentSite],
    permissions: context.permissions,
  }
}

/**
 * `sqlite` + `turso` share the same Drizzle sqlite-core schema and both use the libSQL client at runtime.
 * Use `sqlite` for local file or `:memory:` only; use `turso` for remote Turso (and optional `file:` if you prefer that driver name).
 * `postgres` + `mysql` need a separate Drizzle dialect (pgTable / mysqlTable) before they can work.
 */
export interface DatabaseConfig {
  driver: 'sqlite' | 'turso' | 'postgres' | 'mysql'
  url: string
  /** Required for remote Turso / libSQL when `driver` is `turso` (and URL is remote). */
  authToken?: string
}

export interface AdminConfig {
  path?: string
  enabled?: boolean
  bootstrapAdmin?: {
    email: string
    password: string
    name?: string
    siteId?: string
  }
}

export interface CMSConfig {
  db: DatabaseConfig
  admin?: AdminConfig
  plugins?: Array<CMSPlugin>
  theme?: CMSTheme
  server?: {
    port?: number
    hostname?: string
  }
}

export interface HanaCMS {
  use(plugin: CMSPlugin): HanaCMS
  launch(): unknown
  getDatabase(): unknown
  getPlugins(): Array<CMSPlugin>
  getTheme(): CMSTheme | undefined
  hasTheme(): boolean
}
