import type { Context, Hono } from 'hono'
import type { HanaCMS, HOOK_KEY, Permission, RequestContext } from './cms'
import type { ComponentRegistry } from './component-registry'
import type { CMSTheme } from './theme'

export interface ThemeRenderRequestContext {
  params: Record<string, string>
  url: string
  query: Record<string, string>
  path: string
}

export interface CMSRouteContextHelpers {
  resolveRequestContext: (context: Context) => RequestContext
  hasPermission: (context: Context, permission: Permission) => boolean
}

export interface PluginLifecycle {
  onInstall?: (db: unknown) => void | Promise<void>
  onUninstall?: (db: unknown) => void | Promise<void>
  onEnable?: (cms: HanaCMS) => void | Promise<void>
  onDisable?: (cms: HanaCMS) => void | Promise<void>
}

export interface PluginAdminMenuItem {
  id: string
  label: string
  icon: string
  /** Admin route path, e.g. '/blog/posts' */
  path: string
  requiredPermissions?: Permission[]
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

export interface CMSPlugin {
  name: string
  version: string
  schema?: Record<string, unknown>
  hooks?: Partial<CMSPluginHooks>
  routes?: (app: Hono, helpers: CMSRouteContextHelpers) => void
  lifecycle?: PluginLifecycle
  admin?: PluginAdminConfig
}

export interface CMSPluginHooks {
  [HOOK_KEY.CMS_INIT]: (cms: HanaCMS) => void | Promise<void>
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
