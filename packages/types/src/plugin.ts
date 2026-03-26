import type { Hono } from 'hono'
import type { ComponentRegistry } from './component-registry'
import type { HanaCMS } from './cms'
import type { CMSTheme } from './theme'

export interface CMSPlugin {
  name: string
  version: string
  schema?: Record<string, unknown>
  hooks?: Partial<CMSPluginHooks>
  routes?: (app: Hono) => void
}

export interface CMSPluginHooks {
  'cms:init': (cms: HanaCMS) => void | Promise<void>
  'cms:ready': (app: Hono) => void | Promise<void>
  'admin:register': (registry: ComponentRegistry) => void
  'theme:mount': (theme: CMSTheme) => void | Promise<void>
  'theme:beforeRender': (layoutKey: string, data: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>
  /**
   * Fired when an admin explicitly activates a theme via the API.
   * Plugins can use this to re-register components or clean up theme-specific state.
   * A server restart is typically required before the new theme takes effect at runtime.
   */
  'theme:activate': (theme: CMSTheme, previousTheme?: CMSTheme) => void | Promise<void>
}

export type PluginFactory = (options?: Record<string, unknown>) => CMSPlugin

export type CMSHookName = keyof CMSPluginHooks
