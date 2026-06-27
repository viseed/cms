import type { Context, Handler, Hono } from 'hono'
import type {
  HOOK_KEY,
  Permission,
  PermissionDef,
  PermissionKey,
  RequestContext,
  StorageProviderDef,
  ViseedCMS,
} from './cms'
import type { ComponentRegistry } from './component-registry'
import type { CMSTheme } from './theme'

export interface ThemeRenderRequestContext {
  params: Record<string, string>
  url: string
  query: Record<string, string>
  path: string
}

/**
 * Router handed to plugins for declaring API routes. Every protected method
 * REQUIRES a permission — either a key string (built-in or custom) or a
 * {@link PermissionDef} from `definePermission()`. Passing a `PermissionDef`
 * also surfaces its label/group in the admin Roles view without a separate
 * `plugin.permissions` declaration. Plugin endpoints are authenticated and
 * authorized by default (secure-by-default); routes that must stay public have
 * to opt out explicitly via the `public.*` variants.
 *
 * Core owns the single Hono instance, so plugins never import `hono` at runtime
 * — they only need its `Handler` type for their callbacks.
 */
export interface PluginRouter {
  get: (path: string, permission: PermissionKey | PermissionDef, handler: Handler) => void
  post: (path: string, permission: PermissionKey | PermissionDef, handler: Handler) => void
  put: (path: string, permission: PermissionKey | PermissionDef, handler: Handler) => void
  delete: (path: string, permission: PermissionKey | PermissionDef, handler: Handler) => void
  /** Explicitly public (unauthenticated) routes. Use sparingly. */
  public: {
    get: (path: string, handler: Handler) => void
    post: (path: string, handler: Handler) => void
    put: (path: string, handler: Handler) => void
    delete: (path: string, handler: Handler) => void
  }
}

export interface CMSRouteContextHelpers {
  resolveRequestContext: (context: Context) => RequestContext
  hasPermission: (context: Context, permission: Permission) => boolean
  /**
   * Create a permission-aware sub-router mounted at `basePath` on the plugin's
   * router. Protected routes require a permission key and are guarded by the
   * core auth + RBAC pipeline before the handler runs.
   */
  createSubApp: (basePath: string) => PluginRouter
}

export interface PluginLifecycle {
  onInstall?: (db: unknown) => void | Promise<void>
  onUninstall?: (db: unknown) => void | Promise<void>
  onEnable?: (cms: ViseedCMS) => void | Promise<void>
  onDisable?: (cms: ViseedCMS) => void | Promise<void>
}

export interface PluginAdminMenuItem {
  id: string
  label: string
  icon: string
  /** Admin route path, e.g. '/blog/posts' */
  path: string
  requiredPermissions?: PermissionKey[]
  siteScoped?: boolean
  /** Lower = higher in sidebar; default 50 */
  order?: number
  /** Explicit export name in admin bundle; derived from path if omitted */
  componentExport?: string
}

export interface PluginAdminConfig {
  menuItems: PluginAdminMenuItem[]
  /** Absolute filesystem path to compiled admin ESM bundle */
  bundlePath?: string
}

export interface PluginPublicConfig {
  /** Absolute filesystem path to compiled public ESM bundle (widget renderers) */
  bundlePath?: string
}

/**
 * Declares a widget kind that plugins can register.
 * Users create named instances of this type via the Widgets admin view.
 * Instances can then be embedded into post/page content via the TipTap editor.
 */
export interface WidgetTypeDef {
  /** Unique id, recommended pattern: '{pluginName}/{widgetName}', e.g. 'plugin-blog/latest-posts' */
  id: string
  label: string
  icon?: string
  description?: string
  /** Must match the CMSPlugin.name of the plugin that declares this type */
  pluginName: string
  /** Export name of the Vue config form component in the plugin admin bundle */
  configComponent: string
  /** Optional export name of a lightweight preview component shown in the TipTap NodeView */
  previewComponent?: string
  /** Export name of the public Vue renderer component in the plugin public bundle */
  publicComponent: string
  defaultConfig?: Record<string, unknown>
}

/**
 * Grid size of a dashboard widget, expressed as `{colspan}x{rowspan}`.
 * Columns are capped at the dashboard grid width (4).
 */
export type DashboardWidgetSize = '1x1' | '2x1' | '3x1' | '4x1' | '2x2' | '3x2' | '4x2'

/**
 * Declares a widget kind that plugins can contribute to the admin dashboard.
 * Unlike `WidgetTypeDef` (content widgets rendered on the public site), dashboard
 * widgets render inside the admin SPA. Their component is resolved from the
 * plugin's admin bundle, so no public bundle is required.
 */
export interface DashboardWidgetDef {
  /** Unique id, recommended pattern: '{pluginName}/{widgetName}', e.g. 'plugin-blog/recent-posts' */
  id: string
  label: string
  icon?: string
  description?: string
  /** Must match the CMSPlugin.name of the plugin that declares this widget */
  pluginName: string
  /** Export name of the Vue component in the plugin admin bundle */
  component: string
  /** Grid sizes this widget supports */
  supportedSizes: DashboardWidgetSize[]
  /** Default size used when the widget is first placed on the dashboard */
  defaultSize: DashboardWidgetSize
}

export interface CMSPlugin {
  name: string
  version: string
  schema?: Record<string, unknown>
  hooks?: Partial<CMSPluginHooks>
  routes?: (app: Hono, helpers: CMSRouteContextHelpers) => void
  lifecycle?: PluginLifecycle
  admin?: PluginAdminConfig
  /** Widget types this plugin contributes */
  widgets?: WidgetTypeDef[]
  /** Dashboard widgets this plugin contributes to the admin dashboard */
  dashboardWidgets?: DashboardWidgetDef[]
  /** Public-facing ESM bundle (Vue widget renderers for CSR hydration) */
  public?: PluginPublicConfig
  /** Media storage providers this plugin contributes (e.g. S3, R2) */
  storageProviders?: StorageProviderDef[]
  /**
   * Custom permissions this plugin declares. Reuse built-in keys freely (no
   * need to redeclare them); only declare entries here for plugin-specific
   * permissions. Declared entries surface in the admin Roles view and become
   * valid grant targets.
   */
  permissions?: PermissionDef[]
}

export interface CMSPluginHooks {
  [HOOK_KEY.CMS_INIT]: (cms: ViseedCMS) => void | Promise<void>
  [HOOK_KEY.CMS_READY]: (app: Hono) => void | Promise<void>
  [HOOK_KEY.ADMIN_REGISTER]: (registry: ComponentRegistry) => void
  [HOOK_KEY.THEME_MOUNT]: (theme: CMSTheme) => void | Promise<void>
  [HOOK_KEY.THEME_BEFORE_RENDER]: (
    layoutKey: string,
    data: Record<string, unknown>,
    requestContext: ThemeRenderRequestContext,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>
  /**
   * Fired when an admin explicitly activates a theme via the API.
   * Plugins can use this to re-register components or clean up theme-specific state.
   * A server restart is typically required before the new theme takes effect at runtime.
   */
  [HOOK_KEY.THEME_ACTIVATE]: (theme: CMSTheme, previousTheme?: CMSTheme) => void | Promise<void>
  [HOOK_KEY.PLUGIN_ENABLED]: (pluginName: string) => void | Promise<void>
  [HOOK_KEY.PLUGIN_DISABLED]: (pluginName: string) => void | Promise<void>
}

export type PluginFactory = (options?: Record<string, unknown>) => CMSPlugin

export type CMSHookName = keyof CMSPluginHooks
