import type {
  CMSPlugin,
  CMSRouteContextHelpers,
  Permission,
  PermissionDef,
  PermissionKey,
  PluginRouter,
  RequestContext,
} from '@viseed/types'
import type { Context, Handler, MiddlewareHandler } from 'hono'
import { Hono } from 'hono'
import type { AuthenticationResult } from './admin-auth-policy'

interface InstalledEntry {
  plugin: CMSPlugin
  subRouter: Hono
}

/**
 * Dependencies the registry needs to enforce auth + RBAC on protected plugin
 * routes. Injected by core so the registry stays decoupled and testable.
 */
export interface PluginRouteGuardDeps {
  authenticate: (c: Context) => Promise<AuthenticationResult>
  setRequestContext: (c: Context, requestContext: RequestContext) => void
}

type HttpMethod = 'get' | 'post' | 'put' | 'delete'

function toContentfulStatus(status: number): 400 | 401 | 403 {
  if (status === 400) return 400
  if (status === 403) return 403
  return 401
}

function guardMiddleware(
  guard: PluginRouteGuardDeps | undefined,
  permission: PermissionKey,
): MiddlewareHandler {
  return async (c, next) => {
    // Fail closed: a protected route must never run without a configured guard.
    if (!guard) {
      return c.json({ error: 'Plugin route guard is not configured.' }, 500)
    }

    const auth = await guard.authenticate(c)
    if (!auth.ok || !auth.requestContext) {
      return c.json({ error: auth.error ?? 'Unauthorized' }, toContentfulStatus(auth.status))
    }

    guard.setRequestContext(c, auth.requestContext)

    if (!auth.requestContext.permissions.includes(permission as Permission)) {
      return c.json({ error: `Forbidden: missing permission "${permission}".` }, 403)
    }

    await next()
  }
}

/**
 * Wrap a Hono instance in the permission-aware {@link PluginRouter} contract.
 * Protected methods require a permission key and run the auth + RBAC guard
 * before the handler; `public.*` methods register the handler as-is.
 */
export function createPluginRouter(
  child: Hono,
  guard: PluginRouteGuardDeps | undefined,
  onPermission?: (permission: PermissionKey | PermissionDef) => void,
): PluginRouter {
  const registerProtected =
    (method: HttpMethod) =>
    (path: string, permission: PermissionKey | PermissionDef, handler: Handler) => {
      onPermission?.(permission)
      const key = typeof permission === 'string' ? permission : permission.key
      child[method](path, guardMiddleware(guard, key), handler)
    }

  const registerPublic = (method: HttpMethod) => (path: string, handler: Handler) => {
    child[method](path, handler)
  }

  return {
    get: registerProtected('get'),
    post: registerProtected('post'),
    put: registerProtected('put'),
    delete: registerProtected('delete'),
    public: {
      get: registerPublic('get'),
      post: registerPublic('post'),
      put: registerPublic('put'),
      delete: registerPublic('delete'),
    },
  }
}

export class PluginRouteRegistry {
  private installed = new Map<string, InstalledEntry>()
  private active = new Set<string>()
  private registrationOrder: string[] = []
  /**
   * Permissions declared per plugin via protected route registrations. Value is
   * the full {@link PermissionDef} when the route was declared with one (so its
   * label/group reaches the catalog), or `null` for a bare key string.
   */
  private declaredPermissions = new Map<string, Map<string, PermissionDef | null>>()

  constructor(private guard: PluginRouteGuardDeps | undefined = undefined) {}

  register(plugin: CMSPlugin, helpers: CMSRouteContextHelpers): void {
    if (this.installed.has(plugin.name)) return

    const subRouter = new Hono()
    if (plugin.routes) {
      // Hono's `app.route()` snapshots the sub-app's routes at call time, so we
      // must mount each sub-app AFTER the plugin has defined its routes on it.
      const pendingSubApps: Array<{ basePath: string; app: Hono }> = []
      const pluginHelpers: CMSRouteContextHelpers = {
        ...helpers,
        createSubApp: (basePath: string) => {
          const child = new Hono()
          pendingSubApps.push({ basePath, app: child })
          return createPluginRouter(child, this.guard, (permission) =>
            this.recordPermission(plugin.name, permission),
          )
        },
      }
      plugin.routes(subRouter, pluginHelpers)
      for (const { basePath, app } of pendingSubApps) {
        subRouter.route(basePath, app)
      }
    }

    this.installed.set(plugin.name, { plugin, subRouter })
    this.registrationOrder.push(plugin.name)
  }

  private recordPermission(
    pluginName: string,
    permission: PermissionKey | PermissionDef,
  ): void {
    const key = typeof permission === 'string' ? permission : permission.key
    const def = typeof permission === 'string' ? null : permission
    const byKey = this.declaredPermissions.get(pluginName) ?? new Map<string, PermissionDef | null>()
    // Record the key once; upgrade a bare entry to a rich def if one shows up.
    if (!byKey.has(key) || (def && !byKey.get(key))) {
      byKey.set(key, def)
    }
    this.declaredPermissions.set(pluginName, byKey)
  }

  /**
   * Permissions a plugin declared on its protected routes — full
   * {@link PermissionDef} when available, otherwise the bare key string.
   */
  getDeclaredPermissions(pluginName: string): Array<PermissionKey | PermissionDef> {
    const byKey = this.declaredPermissions.get(pluginName)
    if (!byKey) return []
    return [...byKey.entries()].map(([key, def]) => def ?? key)
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
