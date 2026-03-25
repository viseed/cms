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
}

export type PluginFactory = (options?: Record<string, unknown>) => CMSPlugin

export type CMSHookName = keyof CMSPluginHooks
