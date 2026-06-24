import { randomUUID } from 'node:crypto'
import { installedPlugins } from '@viseed/schema'
import type { CMSPlugin, ViseedCMS } from '@viseed/types'
import { HOOK_KEY } from '@viseed/types'
import { eq } from 'drizzle-orm'
import type { Handler } from 'hono'
import type { DatabaseInstance } from '../database'
import type { HookRegistry } from '../hook-registry'
import type { PluginRouteRegistry } from '../plugin-route-registry'
import type { RegisterAdminRoute } from './auth'

export interface AdminPluginContext {
  getDatabase: () => DatabaseInstance
  plugins: CMSPlugin[]
  pluginRegistry: PluginRouteRegistry
  rebuildWidgetTypeRegistry: () => void
  hooks: HookRegistry
  cms: ViseedCMS
}

function handleListPlugins(ctx: AdminPluginContext): Handler {
  return (c) => {
    const result = ctx.plugins.map((plugin) => ({
      name: plugin.name,
      version: plugin.version,
      description: `${plugin.name} plugin`,
      installed: true,
      enabled: ctx.pluginRegistry.isActive(plugin.name),
      type: 'official' as const,
    }))

    return c.json(result)
  }
}

function handleGetPluginManifest(ctx: AdminPluginContext): Handler {
  return (c) => {
    const manifest = ctx.plugins
      .filter((p) => p.admin && ctx.pluginRegistry.isActive(p.name))
      .map((p) => ({
        name: p.name,
        version: p.version,
        admin: {
          menuItems: p.admin?.menuItems ?? [],
          hasBundle: !!p.admin?.bundlePath,
        },
      }))
    return c.json({ plugins: manifest })
  }
}

function handleGetPluginBundle(ctx: AdminPluginContext): Handler {
  return async (c) => {
    const name = c.req.param('name') || ''
    const plugin = ctx.plugins.find((p) => p.name === name)

    if (!plugin?.admin?.bundlePath) {
      return c.json({ error: 'No admin bundle for this plugin' }, 404)
    }
    if (!ctx.pluginRegistry.isActive(name)) {
      return c.json({ error: 'Plugin is not active' }, 404)
    }

    const file = Bun.file(plugin.admin.bundlePath)
    if (!(await file.exists())) {
      return c.json({ error: 'Admin bundle file not found' }, 404)
    }

    const content = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-1', content)
    const etag = `"${Buffer.from(hashBuffer).toString('hex').slice(0, 16)}"`

    if (c.req.header('if-none-match') === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag } })
    }

    return new Response(content, {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache',
        ETag: etag,
      },
    })
  }
}

function handleInstallPlugin(ctx: AdminPluginContext): Handler {
  return async (c) => {
    const name = c.req.param('name')
    if (!name) return c.json({ error: 'Plugin name is required.' }, 400)

    const db = ctx.getDatabase()
    const [existing] = await db
      .select()
      .from(installedPlugins)
      .where(eq(installedPlugins.name, name))

    if (existing) {
      return c.json({ error: `Plugin "${name}" is already installed.` }, 409)
    }

    const plugin = ctx.plugins.find((p) => p.name === name)
    if (plugin?.lifecycle?.onInstall) {
      await plugin.lifecycle.onInstall(db)
    }

    await db.insert(installedPlugins).values({
      id: randomUUID(),
      name,
      version: plugin?.version ?? '0.0.0',
      type: 'official',
      enabled: true,
    })

    if (plugin) {
      ctx.pluginRegistry.activate(name)
    }

    return c.json({
      message: `Plugin "${name}" installed successfully.`,
      plugin: name,
    })
  }
}

function handleUninstallPlugin(ctx: AdminPluginContext): Handler {
  return async (c) => {
    const name = c.req.param('name')
    if (!name) return c.json({ error: 'Plugin name is required.' }, 400)

    const db = ctx.getDatabase()
    const [existing] = await db
      .select()
      .from(installedPlugins)
      .where(eq(installedPlugins.name, name))

    if (!existing) {
      return c.json({ error: `Plugin "${name}" is not installed.` }, 404)
    }

    const plugin = ctx.plugins.find((p) => p.name === name)
    if (plugin?.lifecycle?.onUninstall) {
      await plugin.lifecycle.onUninstall(db)
    }

    ctx.pluginRegistry.deactivate(name)
    await db.delete(installedPlugins).where(eq(installedPlugins.name, name))

    return c.json({
      message: `Plugin "${name}" uninstalled successfully.`,
      plugin: name,
    })
  }
}

function handleEnablePlugin(ctx: AdminPluginContext): Handler {
  return async (c) => {
    const name = c.req.param('name')
    if (!name) return c.json({ error: 'Plugin name is required.' }, 400)

    if (!ctx.pluginRegistry.isInstalled(name)) {
      return c.json({ error: `Plugin "${name}" is not registered.` }, 404)
    }

    if (ctx.pluginRegistry.isActive(name)) {
      return c.json({ error: `Plugin "${name}" is already enabled.` }, 409)
    }

    const plugin = ctx.plugins.find((p) => p.name === name)
    if (plugin?.lifecycle?.onEnable) {
      await plugin.lifecycle.onEnable(ctx.cms)
    }

    ctx.pluginRegistry.activate(name)
    ctx.rebuildWidgetTypeRegistry()

    const db = ctx.getDatabase()
    await db
      .update(installedPlugins)
      .set({ enabled: true, updatedAt: new Date() })
      .where(eq(installedPlugins.name, name))

    await ctx.hooks.run(HOOK_KEY.PLUGIN_ENABLED, name)

    return c.json({
      message: `Plugin "${name}" enabled.`,
      plugin: name,
    })
  }
}

function handleDisablePlugin(ctx: AdminPluginContext): Handler {
  return async (c) => {
    const name = c.req.param('name')
    if (!name) return c.json({ error: 'Plugin name is required.' }, 400)

    if (!ctx.pluginRegistry.isInstalled(name)) {
      return c.json({ error: `Plugin "${name}" is not registered.` }, 404)
    }

    if (!ctx.pluginRegistry.isActive(name)) {
      return c.json({ error: `Plugin "${name}" is already disabled.` }, 409)
    }

    const plugin = ctx.plugins.find((p) => p.name === name)
    if (plugin?.lifecycle?.onDisable) {
      await plugin.lifecycle.onDisable(ctx.cms)
    }

    ctx.pluginRegistry.deactivate(name)
    ctx.rebuildWidgetTypeRegistry()

    const db = ctx.getDatabase()
    await db
      .update(installedPlugins)
      .set({ enabled: false, updatedAt: new Date() })
      .where(eq(installedPlugins.name, name))

    await ctx.hooks.run(HOOK_KEY.PLUGIN_DISABLED, name)

    return c.json({
      message: `Plugin "${name}" disabled.`,
      plugin: name,
    })
  }
}

export function registerPluginRoutes(
  registerRoute: RegisterAdminRoute,
  context: AdminPluginContext,
): void {
  registerRoute('GET', '/plugins', 'platform.sites.read', handleListPlugins(context))
  registerRoute('GET', '/plugin-manifest', 'site.content.read', handleGetPluginManifest(context))
  registerRoute('GET', '/plugins/:name/ui.js', 'site.content.read', handleGetPluginBundle(context))
  registerRoute(
    'POST',
    '/plugins/:name/install',
    'platform.sites.manage',
    handleInstallPlugin(context),
  )
  registerRoute(
    'POST',
    '/plugins/:name/uninstall',
    'platform.sites.manage',
    handleUninstallPlugin(context),
  )
  registerRoute(
    'POST',
    '/plugins/:name/enable',
    'platform.sites.manage',
    handleEnablePlugin(context),
  )
  registerRoute(
    'POST',
    '/plugins/:name/disable',
    'platform.sites.manage',
    handleDisablePlugin(context),
  )
}
