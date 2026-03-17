import type { Hono } from 'hono'
import type { ComponentRegistry } from './component-registry'
import type { HanabiCMS } from './cms'

export interface CMSPlugin {
  name: string
  version: string
  schema?: Record<string, unknown>
  hooks?: Partial<CMSPluginHooks>
  routes?: (app: Hono) => void
}

export interface CMSPluginHooks {
  'cms:init': (cms: HanabiCMS) => void | Promise<void>
  'cms:ready': (app: Hono) => void | Promise<void>
  'admin:register': (registry: ComponentRegistry) => void
}

export type PluginFactory = (options?: Record<string, unknown>) => CMSPlugin

export type CMSHookName = keyof CMSPluginHooks
