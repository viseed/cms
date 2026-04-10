import type { CMSPlugin, CMSRouteContextHelpers } from '@hana/types'
import type { MiddlewareHandler } from 'hono'
import { Hono } from 'hono'

interface InstalledEntry {
  plugin: CMSPlugin
  subRouter: Hono
}

export class PluginRouteRegistry {
  private installed = new Map<string, InstalledEntry>()
  private active = new Set<string>()
  private registrationOrder: string[] = []

  register(plugin: CMSPlugin, helpers: CMSRouteContextHelpers): void {
    if (this.installed.has(plugin.name)) return

    const subRouter = new Hono()
    if (plugin.routes) {
      plugin.routes(subRouter, helpers)
    }

    this.installed.set(plugin.name, { plugin, subRouter })
    this.registrationOrder.push(plugin.name)
  }

  activate(name: string): void {
    if (!this.installed.has(name)) {
      throw new Error(`Plugin "${name}" is not registered.`)
    }
    this.active.add(name)
  }

  deactivate(name: string): void {
    this.active.delete(name)
  }

  isActive(name: string): boolean {
    return this.active.has(name)
  }

  isInstalled(name: string): boolean {
    return this.installed.has(name)
  }

  getInstalledNames(): string[] {
    return [...this.installed.keys()]
  }

  middleware(): MiddlewareHandler {
    return async (c, next) => {
      for (const name of this.registrationOrder) {
        if (!this.active.has(name)) continue

        const entry = this.installed.get(name)
        if (!entry) continue

        const response = await entry.subRouter.fetch(c.req.raw)
        if (response.status !== 404) {
          return response
        }
      }

      await next()
    }
  }
}
