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

/**
 * Built-in permission metadata — the SINGLE SOURCE OF TRUTH for core
 * permissions. To add a new built-in permission, add exactly one entry here:
 * {@link Permission}, {@link PERMISSION_CATALOG}, and {@link PERMISSIONS} are
 * all derived from this list. Plugins may freely reuse any of these keys.
 */
export const BUILTIN_PERMISSION_DEFS = [
  { key: 'platform.sites.read', label: 'View sites', group: 'Platform' },
  { key: 'platform.sites.manage', label: 'Manage sites', group: 'Platform' },
  { key: 'platform.users.read', label: 'View users & roles', group: 'Platform' },
  { key: 'platform.users.manage', label: 'Manage users & roles', group: 'Platform' },
  { key: 'site.content.read', label: 'View content', group: 'Content' },
  { key: 'site.content.write', label: 'Edit content', group: 'Content' },
  { key: 'site.menu.read', label: 'View menus', group: 'Menus' },
  { key: 'site.menu.write', label: 'Edit menus', group: 'Menus' },
  { key: 'site.path.read', label: 'View paths', group: 'Paths' },
  { key: 'site.path.write', label: 'Edit paths', group: 'Paths' },
  { key: 'site.media.read', label: 'View media', group: 'Media' },
  { key: 'site.media.write', label: 'Manage media', group: 'Media' },
  { key: 'site.widgets.read', label: 'View widgets', group: 'Widgets' },
  { key: 'site.widgets.manage', label: 'Manage widgets', group: 'Widgets' },
] as const

/** Union of built-in permission keys, derived from {@link BUILTIN_PERMISSION_DEFS}. */
export type Permission = (typeof BUILTIN_PERMISSION_DEFS)[number]['key']

/**
 * A permission key in the general (runtime) sense. Built-in permissions use the
 * strict {@link Permission} union; plugin-declared permissions are arbitrary
 * namespaced strings (e.g. `'pages.publish'`). The `(string & {})` keeps IDE
 * autocomplete for the built-in literals while still allowing custom strings.
 */
export type PermissionKey = Permission | (string & {})

/** Flat list of built-in permission keys, derived from {@link BUILTIN_PERMISSION_DEFS}. */
export const PERMISSION_CATALOG: ReadonlyArray<Permission> = BUILTIN_PERMISSION_DEFS.map(
  (def) => def.key,
)

/** Where a permission entry in the dynamic catalog originates from. */
export type PermissionSource = 'builtin' | 'plugin'

/**
 * Declarative description of a permission. Plugins contribute these via
 * {@link CMSPlugin.permissions}; core seeds the built-in catalog with the same
 * shape so the admin Roles view can render labels and groups uniformly.
 */
export interface PermissionDef {
  /** Unique permission key, e.g. `'site.content.read'` or `'pages.publish'`. */
  key: PermissionKey
  /** Human-readable label shown in the Roles view. */
  label: string
  description?: string
  /** Optional grouping bucket for the Roles UI, e.g. `'Content'`. */
  group?: string
}

/** A permission entry as exposed by the admin permissions API. */
export interface PermissionCatalogEntry extends PermissionDef {
  source: PermissionSource
  /** Name of the contributing plugin when `source === 'plugin'`. */
  pluginName?: string
}

/**
 * Define a custom (plugin) permission with full metadata. Prefer this over a
 * bare key string: the IDE enforces `key` + `label` and suggests `group` /
 * `description`, so the admin Roles view always has something meaningful to
 * render. The literal `key` is preserved, so the result can be passed directly
 * to a route (e.g. `router.put(path, PAGES_PUBLISH, handler)`) and reused as
 * `PAGES_PUBLISH.key` while staying type-safe and refactor-friendly.
 *
 * @example
 * const PAGES_PUBLISH = definePermission({
 *   key: 'pages.publish',
 *   label: 'Publish pages',
 *   group: 'Pages',
 * })
 * // plugin.permissions: [PAGES_PUBLISH]
 * // route:              api.put('/:id/publish', PAGES_PUBLISH, handler)
 */
export function definePermission<const Key extends string>(
  definition: PermissionDef & { key: Key },
): PermissionDef & { key: Key } {
  return definition
}

/** Maps a dotted permission key to a camelCase constant name, e.g.
 * `'site.content.read'` → `'siteContentRead'`. */
type CamelizeDottedKey<S extends string> = S extends `${infer Head}.${infer Tail}`
  ? `${Head}${Capitalize<CamelizeDottedKey<Tail>>}`
  : S

/**
 * Named constants for the built-in permissions, derived from
 * {@link BUILTIN_PERMISSION_DEFS}. Use these for IDE autocomplete and
 * refactor-safety instead of typing raw strings, e.g.
 * `PERMISSIONS.siteContentRead === 'site.content.read'`.
 */
export const PERMISSIONS: { [K in Permission as CamelizeDottedKey<K>]: K } = (() => {
  const constants: Record<string, Permission> = {}
  for (const def of BUILTIN_PERMISSION_DEFS) {
    const name = def.key.replace(/\.(\w)/g, (_match, char: string) => char.toUpperCase())
    constants[name] = def.key
  }
  return constants as { [K in Permission as CamelizeDottedKey<K>]: K }
})()

/**
 * Slugs of the built-in system roles. These are seeded at boot and can never be
 * deleted. Custom roles introduce additional slugs at runtime, so a role slug is
 * a `string` in general (see {@link RoleSlug}).
 */
export type RBACRole = 'admin' | 'site_admin' | 'site_content_writer'

/** A role slug. System roles use {@link RBACRole} values; custom roles use any string. */
export type RoleSlug = string

export const SYSTEM_ROLE_SLUGS: ReadonlyArray<RBACRole> = [
  'admin',
  'site_admin',
  'site_content_writer',
]

/** Role definition as exposed by the admin roles API. */
export interface RoleSummary {
  slug: RoleSlug
  name: string
  description: string | null
  isSystem: boolean
  permissions: Array<Permission>
}

/** User entry as exposed by the admin users API. */
export interface UserSummary {
  id: string
  email: string
  name: string
  isOwner: boolean
  globalRole: RoleSlug | null
  assignments: Array<RoleAssignment>
}

export interface SiteContext {
  id: string
  slug: string
  name: string
  isDefault: boolean
}

export interface RoleAssignment {
  role: RoleSlug
  siteId?: string
}

export interface ActorContext {
  id: string
  email?: string
  name?: string
  roleAssignments: Array<RoleAssignment>
  isOwner: boolean
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
  isOwner: boolean
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
    const mappedPermissions = ROLE_PERMISSION_MATRIX[assignment.role as RBACRole] ?? []
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
    isOwner: context.actor?.isOwner ?? false,
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
