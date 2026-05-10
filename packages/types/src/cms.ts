import type { CMSPlugin } from './plugin'
import type { CMSTheme } from './theme'

export const HOOK_KEY = {
  CMS_INIT: 'cms:init',
  CMS_READY: 'cms:ready',
  ADMIN_REGISTER: 'admin:register',
  THEME_MOUNT: 'theme:mount',
  THEME_BEFORE_RENDER: 'theme:beforeRender',
  THEME_AFTER_RENDER: 'theme:afterRender',
  THEME_ACTIVATE: 'theme:activate',
  PLUGIN_ENABLED: 'plugin:enabled',
  PLUGIN_DISABLED: 'plugin:disabled',
} as const

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

export function resolvePermissionsForRoles(
  roleAssignments: Array<RoleAssignment>,
): Array<Permission> {
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

export interface DatabaseConfig {
  driver: 'postgres'
  url: string
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
  /** Multiple built-in themes. CMS builds a registry and resolves active theme from DB at boot. */
  themes?: Array<CMSTheme>
  /** Name of the default theme when DB has no active theme set. Defaults to first entry in `themes`. */
  defaultTheme?: string
  /** Single theme shorthand — merged into `themes` internally for backward compatibility. */
  theme?: CMSTheme
  server?: {
    port?: number
    hostname?: string
  }
  media?: {
    /** Directory to store uploaded files. Defaults to './uploads'. */
    uploadDir?: string
    /** Maximum allowed upload file size in megabytes. Defaults to 10. */
    maxFileSizeMb?: number
  }
}

export interface ViseedCMS {
  use(plugin: CMSPlugin): ViseedCMS
  launch(): unknown
  getDatabase(): unknown
  getPlugins(): Array<CMSPlugin>
  getTheme(): CMSTheme | undefined
  hasTheme(): boolean
  getRegisteredThemes(): Array<CMSTheme>
}
