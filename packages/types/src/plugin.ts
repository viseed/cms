import type { Context, Hono } from 'hono'
import type { HanaCMS, Permission, RequestContext } from './cms'
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

export interface CMSPlugin {
  name: string
  version: string
  schema?: Record<string, unknown>
  hooks?: Partial<CMSPluginHooks>
  routes?: (app: Hono, helpers: CMSRouteContextHelpers) => void
  lifecycle?: PluginLifecycle
}

export interface CMSPluginHooks {
  'cms:init': (cms: HanaCMS) => void | Promise<void>
  'cms:ready': (app: Hono) => void | Promise<void>
  'admin:register': (registry: ComponentRegistry) => void
  'theme:mount': (theme: CMSTheme) => void | Promise<void>
  'theme:beforeRender': (
    layoutKey: string,
    data: Record<string, unknown>,
    requestContext: ThemeRenderRequestContext,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>
  /**
   * Fired when an admin explicitly activates a theme via the API.
   * Plugins can use this to re-register components or clean up theme-specific state.
   * A server restart is typically required before the new theme takes effect at runtime.
   */
  'theme:activate': (theme: CMSTheme, previousTheme?: CMSTheme) => void | Promise<void>
  'plugin:enabled': (pluginName: string) => void | Promise<void>
  'plugin:disabled': (pluginName: string) => void | Promise<void>
}

export type PluginFactory = (options?: Record<string, unknown>) => CMSPlugin

export type CMSHookName = keyof CMSPluginHooks
