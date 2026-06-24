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
  'site.widgets.read',
  'site.widgets.manage',
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
  'site.widgets.read',
  'site.widgets.manage',
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
    /**
     * Initial/fallback storage configuration. Used to seed the DB-backed
     * `media_storage_config` row on first boot. Once a row exists, the DB value
     * wins and can be changed at runtime via the admin API.
     */
    storage?: MediaStorageConfig
  }
}

/**
 * Resolved (decrypted) media storage configuration.
 *
 * `local` is the only provider built into core. Remote providers (S3, R2, …)
 * are contributed by plugins via {@link StorageProviderDef}; their settings are
 * stored generically as arbitrary string fields, so core never needs to know
 * about a provider's specific parameters.
 */
export type MediaStorageConfig =
  | { type: 'local'; uploadDir?: string }
  | ({ type: string } & Record<string, unknown>)

/**
 * Storage backend abstraction. `local` is built into core; remote providers are
 * supplied by plugins. Implementations live in core (Local) or in plugins (S3,
 * R2, …) and are constructed via {@link StorageProviderDef.createAdapter}.
 */
export interface StorageAdapter {
  save(filename: string, data: ArrayBuffer, siteId: string, contentType?: string): Promise<string>
  delete(path: string): Promise<void>
  getUrl(path: string, siteId: string): string
  /** True when files live on the local filesystem and can be streamed from disk. */
  isLocal(): boolean
}

/**
 * Declarative description of a single configuration field for a storage
 * provider. The admin Settings UI renders these dynamically, so a plugin can
 * introduce any parameter without core-side changes ("extra field" support).
 */
export interface StorageProviderField {
  /** Key persisted into the `media_storage_config.config` payload. */
  name: string
  label: string
  type: 'text' | 'password'
  required?: boolean
  /** Encrypted at rest and masked in API responses. */
  secret?: boolean
  placeholder?: string
  hint?: string
}

/**
 * A storage provider contributed by a plugin (e.g. S3, R2). Core builds a
 * registry from all active plugins' providers and uses it to render the admin
 * form, validate input, encrypt secrets, and construct the adapter.
 */
export interface StorageProviderDef {
  /** Unique provider key stored in `media_storage_config.type`, e.g. 's3'. */
  type: string
  /** Human-readable name shown in the admin provider dropdown, e.g. 'Amazon S3'. */
  label: string
  fields: StorageProviderField[]
  /** Builds an adapter from the resolved (decrypted) config payload. */
  createAdapter: (config: Record<string, unknown>) => StorageAdapter
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
