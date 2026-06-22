import { randomBytes, randomUUID } from 'node:crypto'
import { installedThemes, themeState } from '@viseed/schema'
import type { CMSPlugin, CMSRouteContextHelpers, CMSTheme, ViseedCMS } from '@viseed/types'
import { HOOK_KEY } from '@viseed/types'
import type { RequiredLayoutKey } from '@viseed/types'
import { eq } from 'drizzle-orm'
import type { Context, Handler } from 'hono'
import { setCookie } from 'hono/cookie'
import type { DatabaseInstance } from '../database'
import type { HookRegistry } from '../hook-registry'
import type { PluginRouteRegistry } from '../plugin-route-registry'
import {
  buildPreviewPathFromParts,
  normalizeThemePreviewRelativePath,
  resolveValidatedPreviewRoot,
} from '../theme-preview-path'
import type { RegisterAdminRoute } from './auth'

export interface AdminThemeContext {
  getDatabase: () => DatabaseInstance
  themeRegistry: Map<string, CMSTheme>
  getActiveThemeName: () => string | null
  setActiveThemeName: (name: string) => void
  pluginRegistry: PluginRouteRegistry
  hooks: HookRegistry
  createRouteContextHelpers: () => CMSRouteContextHelpers
  clearThemePreviewState: (c: Context) => Promise<Response>
  describeTheme: (theme: CMSTheme, active: boolean) => object
  requiredLayouts: RequiredLayoutKey[]
  registerPluginHooks: (plugin: CMSPlugin) => Promise<void>
  cms: ViseedCMS
}

function handleListThemes(ctx: AdminThemeContext): Handler {
  return async (c) => {
    const db = ctx.getDatabase()
    const dbRecords = await db.select().from(installedThemes)
    const activeThemeName = ctx.getActiveThemeName()

    const seen = new Set<string>()
    const catalog: object[] = []

    for (const [, theme] of ctx.themeRegistry) {
      seen.add(theme.name)
      catalog.push(ctx.describeTheme(theme, theme.name === activeThemeName))
    }

    for (const record of dbRecords) {
      if (seen.has(record.name)) continue
      catalog.push({
        name: record.name,
        version: record.version,
        description: record.description ?? `${record.name} theme`,
        installed: true,
        active: activeThemeName === record.name,
        missingRequiredLayouts: [],
      })
    }

    return c.json(catalog)
  }
}

function handleGetActiveTheme(ctx: AdminThemeContext): Handler {
  return (c) => {
    const activeThemeName = ctx.getActiveThemeName()
    if (!activeThemeName) return c.json(null)
    const theme = ctx.themeRegistry.get(activeThemeName)
    if (!theme) return c.json(null)
    return c.json(ctx.describeTheme(theme, true))
  }
}

function handleGetThemePreview(ctx: AdminThemeContext): Handler {
  return async (c) => {
    const db = ctx.getDatabase()
    const [row] = await db.select().from(themeState).where(eq(themeState.siteId, 'default'))

    const previewThemeName = row?.previewThemeName ?? null
    const previewThemePath = row?.previewThemePath ?? null
    const token = row?.previewToken ?? null
    const active = Boolean((previewThemeName || previewThemePath) && token)

    return c.json({
      active,
      previewThemeName,
      previewThemePath,
      token,
    })
  }
}

function handleSetThemePreview(ctx: AdminThemeContext): Handler {
  return async (c) => {
    if (ctx.themeRegistry.size === 0) {
      return c.json({ error: 'No themes are registered.' }, 400)
    }

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400)
    }

    if (typeof body !== 'object' || body === null) {
      return c.json({ error: 'Body must be an object.' }, 400)
    }

    const b = body as Record<string, unknown>

    let previewThemeName: string | null = null
    let previewThemePath: string | null = null

    if (typeof b.themeName === 'string') {
      if (!ctx.themeRegistry.has(b.themeName)) {
        return c.json({ error: `Theme "${b.themeName}" is not registered.` }, 404)
      }
      previewThemeName = b.themeName
    } else {
      let relative: string | null = null
      if (typeof b.path === 'string') {
        relative = normalizeThemePreviewRelativePath(b.path)
      } else if (typeof b.name === 'string' && typeof b.subdir === 'string') {
        relative = buildPreviewPathFromParts(b.name, b.subdir)
      }

      if (!relative) {
        return c.json(
          {
            error:
              'Invalid preview target. Use { themeName: "<name>" } for registry themes, or { path } / { name, subdir } for path-based.',
          },
          400,
        )
      }

      if (!resolveValidatedPreviewRoot(process.cwd(), relative)) {
        return c.json({ error: 'Invalid or disallowed preview path.' }, 400)
      }
      previewThemePath = relative
    }

    const token = randomBytes(24).toString('hex')
    const db = ctx.getDatabase()
    const activeTheme = ctx.getActiveThemeName() ?? 'default'
    const [existing] = await db.select().from(themeState).where(eq(themeState.siteId, 'default'))

    const updatePayload = {
      previewThemeName,
      previewThemePath,
      previewToken: token,
      updatedAt: new Date(),
    }

    if (existing) {
      await db.update(themeState).set(updatePayload).where(eq(themeState.siteId, 'default'))
    } else {
      await db.insert(themeState).values({
        activeThemeName: activeTheme,
        ...updatePayload,
      })
    }

    if (b.skipCookie !== true) {
      setCookie(c, 'viseed_preview', token, {
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        maxAge: 60 * 60 * 24 * 7,
      })
    }

    const url = new URL(c.req.url)
    const previewQueryExample = `${url.origin}/?viseed_preview=${encodeURIComponent(token)}`

    return c.json({
      message: 'Theme preview enabled for this browser.',
      previewThemeName,
      previewThemePath,
      token,
      previewQueryExample,
    })
  }
}

function handleClearThemePreview(ctx: AdminThemeContext): Handler {
  return async (c) => {
    return ctx.clearThemePreviewState(c)
  }
}

function handleInstallTheme(ctx: AdminThemeContext): Handler {
  return async (c) => {
    const name = c.req.param('name')
    if (!name) return c.json({ error: 'Theme name is required.' }, 400)
    const db = ctx.getDatabase()

    const [existing] = await db
      .select()
      .from(installedThemes)
      .where(eq(installedThemes.name, name))

    if (existing) {
      return c.json({ error: `Theme "${name}" is already installed.` }, 409)
    }

    await db.insert(installedThemes).values({
      id: randomUUID(),
      name,
      version: '0.0.0',
      bundleUrl: '',
      integrity: '',
      requiredLayouts: [],
    })

    return c.json({
      message: `Theme "${name}" installed successfully.`,
      theme: name,
      requiresRestart: true,
    })
  }
}

function handleUninstallTheme(ctx: AdminThemeContext): Handler {
  return async (c) => {
    const name = c.req.param('name')
    if (!name) return c.json({ error: 'Theme name is required.' }, 400)
    const db = ctx.getDatabase()

    if (ctx.getActiveThemeName() === name) {
      return c.json(
        { error: `Cannot uninstall theme "${name}" because it is currently active.` },
        400,
      )
    }

    const [existing] = await db
      .select()
      .from(installedThemes)
      .where(eq(installedThemes.name, name))

    if (!existing) {
      return c.json({ error: `Theme "${name}" is not installed.` }, 404)
    }

    await db.delete(installedThemes).where(eq(installedThemes.name, name))

    return c.json({
      message: `Theme "${name}" uninstalled successfully.`,
      theme: name,
      requiresRestart: true,
    })
  }
}

function handleActivateTheme(ctx: AdminThemeContext): Handler {
  return async (c) => {
    const name = c.req.param('name')
    if (!name) return c.json({ error: 'Theme name is required.' }, 400)
    const db = ctx.getDatabase()

    const registeredTheme = ctx.themeRegistry.get(name)

    if (!registeredTheme) {
      const [installedRecord] = await db
        .select()
        .from(installedThemes)
        .where(eq(installedThemes.name, name))

      if (!installedRecord) {
        return c.json({ error: `Theme "${name}" is not available.` }, 404)
      }

      return c.json({
        message: `Theme "${name}" is installed but not loaded in the registry. A restart is required.`,
        theme: name,
        requiresRestart: true,
      })
    }

    if (ctx.getActiveThemeName() === name) {
      return c.json({ error: `Theme "${name}" is already the active theme.` }, 409)
    }

    const missingLayouts = ctx.requiredLayouts.filter((k) => !(k in registeredTheme.layouts))
    if (missingLayouts.length > 0) {
      return c.json(
        { error: `Theme "${name}" is missing required layouts: ${missingLayouts.join(', ')}.` },
        422,
      )
    }

    const activeThemeName = ctx.getActiveThemeName()
    const previousTheme = activeThemeName ? ctx.themeRegistry.get(activeThemeName) : undefined

    if (previousTheme?.companionPlugin) {
      ctx.pluginRegistry.deactivate(previousTheme.companionPlugin.name)
      await previousTheme.companionPlugin.lifecycle?.onDisable?.(ctx.cms)
      await ctx.hooks.run(HOOK_KEY.PLUGIN_DISABLED, previousTheme.companionPlugin.name)
    }

    const [existingRow] = await db
      .select()
      .from(themeState)
      .where(eq(themeState.siteId, 'default'))

    if (existingRow) {
      await db
        .update(themeState)
        .set({ activeThemeName: name, updatedAt: new Date() })
        .where(eq(themeState.siteId, 'default'))
    } else {
      await db.insert(themeState).values({ activeThemeName: name })
    }

    ctx.setActiveThemeName(name)

    if (registeredTheme.companionPlugin) {
      const companion = registeredTheme.companionPlugin
      const helpers = ctx.createRouteContextHelpers()
      if (!ctx.pluginRegistry.isInstalled(companion.name)) {
        ctx.pluginRegistry.register(companion, helpers)
      }
      await companion.lifecycle?.onEnable?.(ctx.cms)
      ctx.pluginRegistry.activate(companion.name)
      await ctx.registerPluginHooks(companion)
      await ctx.hooks.run(HOOK_KEY.PLUGIN_ENABLED, companion.name)
    }

    await ctx.hooks.run(HOOK_KEY.THEME_ACTIVATE, registeredTheme, previousTheme)

    return c.json({
      message: `Theme "${name}" is now active.`,
      theme: name,
      requiresRestart: false,
    })
  }
}

function handleGetThemeSettings(ctx: AdminThemeContext): Handler {
  return async (c) => {
    const name = c.req.param('name')
    if (!name) return c.json({ error: 'Theme name is required.' }, 400)
    const theme = ctx.themeRegistry.get(name)

    if (!theme) {
      return c.json({ error: `Theme "${name}" not found.` }, 404)
    }

    const db = ctx.getDatabase()
    const [row] = await db.select().from(themeState).where(eq(themeState.siteId, 'default'))

    return c.json({
      schema: theme.settingsSchema ?? null,
      values: (row?.settings as Record<string, unknown>) ?? {},
    })
  }
}

function handleUpdateThemeSettings(ctx: AdminThemeContext): Handler {
  return async (c) => {
    const name = c.req.param('name')
    if (!name) return c.json({ error: 'Theme name is required.' }, 400)
    const theme = ctx.themeRegistry.get(name)

    if (!theme) {
      return c.json({ error: `Theme "${name}" not found.` }, 404)
    }

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400)
    }

    if (typeof body !== 'object' || body === null || !('values' in body)) {
      return c.json({ error: 'Body must be { values: Record<string, unknown> }.' }, 400)
    }

    const values = (body as { values: Record<string, unknown> }).values
    if (typeof values !== 'object' || values === null) {
      return c.json({ error: '"values" must be an object.' }, 400)
    }

    const db = ctx.getDatabase()
    const [existing] = await db.select().from(themeState).where(eq(themeState.siteId, 'default'))

    if (existing) {
      await db
        .update(themeState)
        .set({ settings: values, updatedAt: new Date() })
        .where(eq(themeState.siteId, 'default'))
    } else {
      await db.insert(themeState).values({ activeThemeName: name, settings: values })
    }

    return c.json({ message: 'Settings saved.', values })
  }
}

export function registerThemeRoutes(
  registerRoute: RegisterAdminRoute,
  context: AdminThemeContext,
): void {
  registerRoute('GET', '/themes', 'platform.sites.read', handleListThemes(context))
  registerRoute('GET', '/themes/active', 'platform.sites.read', handleGetActiveTheme(context))
  registerRoute('GET', '/themes/preview', 'platform.sites.read', handleGetThemePreview(context))
  registerRoute('POST', '/themes/preview', 'platform.sites.manage', handleSetThemePreview(context))
  registerRoute('DELETE', '/themes/preview', 'platform.sites.manage', handleClearThemePreview(context))
  registerRoute('POST', '/themes/preview/clear', 'platform.sites.manage', handleClearThemePreview(context))
  registerRoute('POST', '/themes/:name/install', 'platform.sites.manage', handleInstallTheme(context))
  registerRoute('POST', '/themes/:name/uninstall', 'platform.sites.manage', handleUninstallTheme(context))
  registerRoute('POST', '/themes/:name/activate', 'platform.sites.manage', handleActivateTheme(context))
  registerRoute('GET', '/themes/:name/settings', 'site.content.read', handleGetThemeSettings(context))
  registerRoute('PUT', '/themes/:name/settings', 'site.content.write', handleUpdateThemeSettings(context))
}
