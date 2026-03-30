import { randomBytes, randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { installedThemes, themeState } from '@hana/schema'
import {
  checkPermission,
  PERMISSION_CATALOG,
  resolvePermissionsForRoles,
  SINGLE_SITE_CONTEXT,
  toAuthContextPayload,
} from '@hana/types'
import type {
  CMSConfig,
  CMSPlugin,
  CMSRouteContextHelpers,
  Permission,
  RBACRole,
  RequestContext,
  RequiredLayoutKey,
  RoleAssignment,
  SiteContext,
  CMSTheme,
  ThemeLayoutMap,
} from '@hana/types'
import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { getCookie, setCookie } from 'hono/cookie'
import { createDatabase, type DatabaseInstance } from './database'
import { HookRegistry } from './hook-registry'
import {
  buildPreviewPathFromParts,
  normalizeThemePreviewRelativePath,
  resolveValidatedPreviewRoot,
} from './theme-preview-path'
import {
  createThemeRuntime,
  resolveTemplateDirFromAbsoluteRoot,
  resolveThemeStaticDirFromRoot,
  type ThemeRuntime,
} from './theme-runtime'

const DEFAULT_LAYOUT_ROUTES: Record<string, string> = {
  home: '/',
  post: '/post/:slug',
  page: '/page/:slug',
  category: '/category/:slug',
  archive: '/archive',
  '404': '/404',
}

export class HanaCMS {
  private app: Hono
  private plugins: CMSPlugin[] = []
  private hooks = new HookRegistry()
  private db: DatabaseInstance | null = null
  private config: CMSConfig
  private themeRuntime: ThemeRuntime | null = null

  constructor(config: CMSConfig) {
    this.config = config
    this.app = new Hono()

    if (config.plugins) {
      for (const plugin of config.plugins) {
        this.use(plugin)
      }
    }
  }

  use(plugin: CMSPlugin): HanaCMS {
    this.plugins.push(plugin)

    if (plugin.hooks) {
      for (const [hookName, handler] of Object.entries(plugin.hooks)) {
        if (handler) {
          this.hooks.register(hookName as Parameters<HookRegistry['register']>[0], handler)
        }
      }
    }

    return this
  }

  async launch(): Promise<Hono> {
    this.db = createDatabase(
      this.config.db,
      this.plugins.filter((p) => p.schema).map((p) => p.schema!),
    )

    await this.hooks.run('cms:init', this as never)

    for (const plugin of this.plugins) {
      if (plugin.routes) {
        plugin.routes(this.app, this.createRouteContextHelpers())
      }
    }

    if (this.hasTheme()) {
      await this.mountTheme()
    }

    this.setupAdminApi()
    this.setupAdminServing()

    await this.hooks.run('cms:ready', this.app)

    return this.app
  }

  getDatabase(): DatabaseInstance {
    if (!this.db) {
      throw new Error('Database not initialized. Call launch() first.')
    }
    return this.db
  }

  getPlugins(): CMSPlugin[] {
    return [...this.plugins]
  }

  getTheme(): CMSTheme | undefined {
    return this.config.theme
  }

  hasTheme(): boolean {
    return this.config.theme !== undefined
  }

  getApp(): Hono {
    return this.app
  }

  getThemeRuntime(): ThemeRuntime | null {
    return this.themeRuntime
  }

  /**
   * When DB + request token match, returns absolute filesystem root for preview templates/static.
   * Gated by `?hana_preview=` or `hana_preview` cookie so public traffic keeps the active theme.
   */
  private async getEffectivePreviewThemeRoot(c: Context): Promise<string | null> {
    const theme = this.config.theme
    if (!theme || !this.themeRuntime) return null

    const token = c.req.query('hana_preview') ?? getCookie(c, 'hana_preview')
    if (!token) return null

    const db = this.getDatabase()
    const row = await db
      .select()
      .from(themeState)
      .where(eq(themeState.activeThemeName, theme.name))
      .get()

    if (!row?.previewThemePath || !row.previewToken || row.previewToken !== token) {
      return null
    }

    return resolveValidatedPreviewRoot(process.cwd(), row.previewThemePath)
  }

  private clearThemePreviewCookie(c: Context): void {
    setCookie(c, 'hana_preview', '', { path: '/', maxAge: 0 })
  }

  private async clearThemePreviewState(c: Context) {
    const theme = this.config.theme
    if (!theme) {
      this.clearThemePreviewCookie(c)
      return c.json({ message: 'No theme loaded; preview cookie cleared if present.' })
    }

    const db = this.getDatabase()
    const existing = await db
      .select()
      .from(themeState)
      .where(eq(themeState.activeThemeName, theme.name))
      .get()

    if (existing) {
      await db
        .update(themeState)
        .set({
          previewThemePath: null,
          previewToken: null,
          updatedAt: new Date(),
        })
        .where(eq(themeState.activeThemeName, theme.name))
    }

    this.clearThemePreviewCookie(c)
    return c.json({ message: 'Theme preview cleared.' })
  }

  private async mountTheme(): Promise<void> {
    const theme = this.config.theme
    if (!theme) return

    this.themeRuntime = createThemeRuntime(theme, this)

    this.setupThemeStaticAssets(theme)
    this.setupThemeRoutes(theme)

    await this.hooks.run('theme:mount', theme)
  }

  private setupThemeStaticAssets(theme: CMSTheme): void {
    const defaultStaticRoot = theme.assets?.staticDir
      ? resolve(process.cwd(), theme.assets.staticDir)
      : null

    this.app.get('/theme/static/*', async (c, next) => {
      const previewRoot = await this.getEffectivePreviewThemeRoot(c)
      let root: string | null = null
      if (previewRoot) {
        root = resolveThemeStaticDirFromRoot(previewRoot)
      }
      if (!root && defaultStaticRoot) {
        root = defaultStaticRoot
      }
      if (!root) {
        return c.notFound()
      }

      return serveStatic({
        root,
        rewriteRequestPath: (path) => path.replace('/theme/static', ''),
      })(c, next)
    })
  }

  private setupThemeRoutes(theme: CMSTheme): void {
    for (const layoutKey of Object.keys(theme.layouts)) {
      const routePath = DEFAULT_LAYOUT_ROUTES[layoutKey]
      if (!routePath) continue

      this.app.get(routePath, async (c) => {
        const defaultData: Record<string, unknown> = {
          params: c.req.param() as Record<string, string>,
          query: c.req.query(),
          path: c.req.path,
        }

        const data = await this.hooks.runWaterfall('theme:beforeRender', layoutKey, defaultData)

        const runtime = this.themeRuntime
        if (!runtime) return c.text('Theme not mounted', 500)

        const previewRoot = await this.getEffectivePreviewThemeRoot(c)
        const templateRoot = previewRoot
          ? resolveTemplateDirFromAbsoluteRoot(previewRoot)
          : undefined

        const html = await runtime.renderLayout(
          layoutKey,
          {
            data,
            settings: {},
            menus: {},
            request: {
              url: c.req.url,
              params: c.req.param() as Record<string, string>,
            },
          },
          templateRoot ? { templateRoot } : undefined,
        )

        return c.html(html)
      })
    }
  }

  private setupAdminApi(): void {
    const adminApi = new Hono()

    adminApi.get('/auth/context', (c) => {
      const requestContext = this.resolveRequestContext(c)
      return c.json(toAuthContextPayload(requestContext))
    })

    adminApi.get('/plugins', (c) => {
      if (!this.hasPermission(c, 'platform.sites.read')) {
        return c.json({ error: 'Forbidden' }, 403)
      }

      const plugins = this.plugins.map((plugin) => ({
        name: plugin.name,
        version: plugin.version,
        description: `${plugin.name} plugin`,
        installed: true,
        type: 'official' as const,
      }))

      return c.json(plugins)
    })

    adminApi.get('/themes', async (c) => {
      if (!this.hasPermission(c, 'platform.sites.read')) {
        return c.json({ error: 'Forbidden' }, 403)
      }

      const db = this.getDatabase()
      const dbRecords = await db.select().from(installedThemes).all()
      const configTheme = this.config.theme

      const catalog = dbRecords.map((record) => {
        const isActive = configTheme?.name === record.name
        const runtimeTheme = isActive ? configTheme : undefined
        const missingRequiredLayouts = runtimeTheme
          ? HanaCMS.REQUIRED_LAYOUTS.filter((k) => !(k in runtimeTheme.layouts))
          : []

        return {
          name: record.name,
          version: record.version,
          description: record.description ?? `${record.name} theme`,
          installed: true,
          active: isActive,
          missingRequiredLayouts,
        }
      })

      // Include config.theme if it was never inserted into installedThemes
      if (configTheme && !dbRecords.find((r) => r.name === configTheme.name)) {
        catalog.push(this.describeTheme(configTheme, true))
      }

      return c.json(catalog)
    })

    adminApi.get('/themes/active', (c) => {
      if (!this.hasPermission(c, 'platform.sites.read')) {
        return c.json({ error: 'Forbidden' }, 403)
      }

      const theme = this.config.theme
      if (!theme) return c.json(null)
      return c.json(this.describeTheme(theme, true))
    })

    adminApi.get('/themes/preview', async (c) => {
      if (!this.hasPermission(c, 'platform.sites.read')) {
        return c.json({ error: 'Forbidden' }, 403)
      }

      const theme = this.config.theme
      if (!theme) {
        return c.json({
          active: false,
          previewThemePath: null,
          token: null,
        })
      }

      const db = this.getDatabase()
      const row = await db
        .select()
        .from(themeState)
        .where(eq(themeState.activeThemeName, theme.name))
        .get()

      const previewThemePath = row?.previewThemePath ?? null
      const token = row?.previewToken ?? null
      const active = Boolean(previewThemePath && token)

      return c.json({
        active,
        previewThemePath,
        token,
      })
    })

    adminApi.post('/themes/preview', async (c) => {
      if (!this.hasPermission(c, 'platform.sites.manage')) {
        return c.json({ error: 'Forbidden' }, 403)
      }

      const theme = this.config.theme
      if (!theme) {
        return c.json({ error: 'No theme is loaded in this process.' }, 400)
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
              'Invalid preview target. Use { path: "themes/<name>/<subdir>" } or { name, subdir } with safe segments.',
          },
          400,
        )
      }

      if (!resolveValidatedPreviewRoot(process.cwd(), relative)) {
        return c.json({ error: 'Invalid or disallowed preview path.' }, 400)
      }

      const token = randomBytes(24).toString('hex')
      const db = this.getDatabase()
      const existing = await db
        .select()
        .from(themeState)
        .where(eq(themeState.activeThemeName, theme.name))
        .get()

      if (existing) {
        await db
          .update(themeState)
          .set({
            previewThemePath: relative,
            previewToken: token,
            updatedAt: new Date(),
          })
          .where(eq(themeState.activeThemeName, theme.name))
      } else {
        await db.insert(themeState).values({
          activeThemeName: theme.name,
          previewThemePath: relative,
          previewToken: token,
        })
      }

      setCookie(c, 'hana_preview', token, {
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        maxAge: 60 * 60 * 24 * 7,
      })

      const url = new URL(c.req.url)
      const previewQueryExample = `${url.origin}/?hana_preview=${encodeURIComponent(token)}`

      return c.json({
        message: 'Theme preview enabled for this browser.',
        previewThemePath: relative,
        token,
        previewQueryExample,
      })
    })

    adminApi.delete('/themes/preview', async (c) => {
      if (!this.hasPermission(c, 'platform.sites.manage')) {
        return c.json({ error: 'Forbidden' }, 403)
      }

      return this.clearThemePreviewState(c)
    })

    adminApi.post('/themes/preview/clear', async (c) => {
      if (!this.hasPermission(c, 'platform.sites.manage')) {
        return c.json({ error: 'Forbidden' }, 403)
      }

      return this.clearThemePreviewState(c)
    })

    adminApi.post('/themes/:name/install', async (c) => {
      if (!this.hasPermission(c, 'platform.sites.manage')) {
        return c.json({ error: 'Forbidden' }, 403)
      }

      const name = c.req.param('name')
      const db = this.getDatabase()

      const existing = await db
        .select()
        .from(installedThemes)
        .where(eq(installedThemes.name, name))
        .get()

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
    })

    adminApi.post('/themes/:name/uninstall', async (c) => {
      if (!this.hasPermission(c, 'platform.sites.manage')) {
        return c.json({ error: 'Forbidden' }, 403)
      }

      const name = c.req.param('name')
      const db = this.getDatabase()

      const activeTheme = this.config.theme
      if (activeTheme && activeTheme.name === name) {
        return c.json(
          { error: `Cannot uninstall theme "${name}" because it is currently active.` },
          400,
        )
      }

      const existing = await db
        .select()
        .from(installedThemes)
        .where(eq(installedThemes.name, name))
        .get()

      if (!existing) {
        return c.json({ error: `Theme "${name}" is not installed.` }, 404)
      }

      await db.delete(installedThemes).where(eq(installedThemes.name, name))

      return c.json({
        message: `Theme "${name}" uninstalled successfully.`,
        theme: name,
        requiresRestart: true,
      })
    })

    adminApi.post('/themes/:name/activate', async (c) => {
      if (!this.hasPermission(c, 'platform.sites.manage')) {
        return c.json({ error: 'Forbidden' }, 403)
      }

      const name = c.req.param('name')
      const db = this.getDatabase()

      // Validate: theme must be installed in DB
      const installedRecord = await db
        .select()
        .from(installedThemes)
        .where(eq(installedThemes.name, name))
        .get()

      if (!installedRecord) {
        return c.json({ error: `Theme "${name}" is not installed.` }, 404)
      }

      // Validate: not already the active runtime theme
      const currentTheme = this.config.theme
      if (currentTheme?.name === name) {
        return c.json({ error: `Theme "${name}" is already the active theme.` }, 409)
      }

      // Validate: required layouts — only possible when the theme object is loaded in config
      const runtimeTheme = this.config.theme?.name === name ? this.config.theme : undefined
      if (runtimeTheme) {
        const missingLayouts = HanaCMS.REQUIRED_LAYOUTS.filter((k) => !(k in runtimeTheme.layouts))
        if (missingLayouts.length > 0) {
          return c.json(
            { error: `Theme "${name}" is missing required layouts: ${missingLayouts.join(', ')}.` },
            422,
          )
        }
      }

      // Validate: required plugins must be loaded
      const requiredPlugins = installedRecord.requiredPlugins ?? []
      if (requiredPlugins.length > 0) {
        const loadedNames = new Set(this.plugins.map((p) => p.name))
        const missing = requiredPlugins.filter((p) => !loadedNames.has(p))
        if (missing.length > 0) {
          return c.json(
            {
              error: `Theme "${name}" requires the following plugins which are not loaded: ${missing.join(', ')}.`,
            },
            422,
          )
        }
      }

      // Persist: upsert a themeState row so the active choice survives restarts
      const existingRow = await db
        .select()
        .from(themeState)
        .where(eq(themeState.activeThemeName, name))
        .get()

      if (existingRow) {
        await db
          .update(themeState)
          .set({ updatedAt: new Date() })
          .where(eq(themeState.activeThemeName, name))
      } else {
        await db.insert(themeState).values({ activeThemeName: name })
      }

      // Fire hook: allow plugins to react to the pending theme switch
      const nextTheme: CMSTheme =
        runtimeTheme ??
        ({
          name: installedRecord.name,
          version: installedRecord.version,
          layouts: {} as ThemeLayoutMap,
        } as CMSTheme)

      await this.hooks.run('theme:activate', nextTheme, currentTheme)

      return c.json({
        message: `Theme "${name}" has been set as active. A restart is required for changes to take effect.`,
        theme: name,
        requiresRestart: true,
      })
    })

    adminApi.get('/themes/:name/settings', async (c) => {
      if (!this.hasPermission(c, 'site.content.read')) {
        return c.json({ error: 'Forbidden' }, 403)
      }

      const name = c.req.param('name')
      const theme = this.config.theme

      if (!theme || theme.name !== name) {
        return c.json({ error: `Theme "${name}" not found.` }, 404)
      }

      const db = this.getDatabase()
      const row = await db
        .select()
        .from(themeState)
        .where(eq(themeState.activeThemeName, name))
        .get()

      return c.json({
        schema: theme.settingsSchema ?? null,
        values: (row?.settings as Record<string, unknown>) ?? {},
      })
    })

    adminApi.put('/themes/:name/settings', async (c) => {
      if (!this.hasPermission(c, 'site.content.write')) {
        return c.json({ error: 'Forbidden' }, 403)
      }

      const name = c.req.param('name')
      const theme = this.config.theme

      if (!theme || theme.name !== name) {
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

      const db = this.getDatabase()
      const existing = await db
        .select()
        .from(themeState)
        .where(eq(themeState.activeThemeName, name))
        .get()

      if (existing) {
        await db
          .update(themeState)
          .set({ settings: values, updatedAt: new Date() })
          .where(eq(themeState.activeThemeName, name))
      } else {
        await db.insert(themeState).values({ activeThemeName: name, settings: values })
      }

      return c.json({ message: 'Settings saved.', values })
    })

    adminApi.post('/plugins/:name/install', (c) => {
      if (!this.hasPermission(c, 'platform.sites.manage')) {
        return c.json({ error: 'Forbidden' }, 403)
      }

      const name = c.req.param('name')

      return c.json({
        message: `Plugin "${name}" installation is not implemented yet.`,
        plugin: name,
        requiresRestart: true,
      })
    })

    adminApi.post('/plugins/:name/uninstall', (c) => {
      if (!this.hasPermission(c, 'platform.sites.manage')) {
        return c.json({ error: 'Forbidden' }, 403)
      }

      const name = c.req.param('name')

      return c.json({
        message: `Plugin "${name}" uninstallation is not implemented yet.`,
        plugin: name,
        requiresRestart: true,
      })
    })

    this.app.route('/api/admin', adminApi)
  }

  private static readonly REQUIRED_LAYOUTS: RequiredLayoutKey[] = [
    'home',
    'post',
    'category',
    'page',
    '404',
  ]

  private describeTheme(theme: CMSTheme, active: boolean) {
    const providedKeys = Object.keys(theme.layouts)
    const missingRequiredLayouts = HanaCMS.REQUIRED_LAYOUTS.filter(
      (key) => !providedKeys.includes(key),
    )

    return {
      name: theme.name,
      version: theme.version,
      description: `${theme.name} theme`,
      installed: true,
      active,
      missingRequiredLayouts,
    }
  }

  private setupAdminServing(): void {
    const adminConfig = this.config.admin ?? { enabled: true, path: '/admin' }
    if (!adminConfig.enabled) return

    const adminPath = adminConfig.path ?? '/admin'
    const adminRoot = resolve(import.meta.dirname, '../dist/admin')
    const adminIndex = resolve(adminRoot, 'index.html')

    console.log('Admin dist path:', adminRoot)

    this.app.get(
      `${adminPath}/assets/*`,
      serveStatic({
        root: adminRoot,
        rewriteRequestPath: (path) =>
          path.startsWith(adminPath) ? path.slice(adminPath.length) || '/' : path,
      }),
    )
    this.app.get(adminPath, serveStatic({ path: adminIndex }))
    this.app.get(`${adminPath}/*`, serveStatic({ path: adminIndex }))

    console.log(
      `Admin UI serving at http://localhost:${this.config.server?.port ?? 3000}${adminPath}`,
    )
  }

  private createRouteContextHelpers(): CMSRouteContextHelpers {
    return {
      resolveRequestContext: (context) => this.resolveRequestContext(context),
      hasPermission: (context, permission) => this.hasPermission(context, permission),
    }
  }

  private resolveRequestContext(c: Context): RequestContext {
    const site = this.resolveSiteContext(c)
    const actor = this.resolveActorContext(c, site.id)
    const permissions = actor
      ? resolvePermissionsForRoles(actor.roleAssignments)
      : [...PERMISSION_CATALOG]

    return {
      site,
      actor,
      permissions,
    }
  }

  private hasPermission(c: Context, permission: Permission): boolean {
    const context = this.resolveRequestContext(c)
    return checkPermission({ context, permission })
  }

  private resolveSiteContext(c: Context): SiteContext {
    const siteId = c.req.header('x-hana-site-id') ?? SINGLE_SITE_CONTEXT.id
    const siteSlug = c.req.header('x-hana-site-slug') ?? SINGLE_SITE_CONTEXT.slug
    const siteName = c.req.header('x-hana-site-name') ?? SINGLE_SITE_CONTEXT.name

    return {
      id: siteId,
      slug: siteSlug,
      name: siteName,
      isDefault: siteId === SINGLE_SITE_CONTEXT.id,
    }
  }

  private resolveActorContext(c: Context, siteId: string) {
    const userId = c.req.header('x-hana-user-id')
    const roleHeaders = c.req.header('x-hana-roles')
    const singleRole = c.req.header('x-hana-role')
    const roles = this.parseRoles(roleHeaders ?? singleRole)

    if (!userId) {
      return null
    }

    const roleAssignments: Array<RoleAssignment> = roles.map((role) => ({
      role,
      siteId: role === 'admin' ? undefined : siteId,
    }))

    return {
      id: userId,
      email: c.req.header('x-hana-user-email') ?? undefined,
      name: c.req.header('x-hana-user-name') ?? undefined,
      roleAssignments,
    }
  }

  private parseRoles(rawRoleHeader: string | undefined): Array<RBACRole> {
    if (!rawRoleHeader) {
      return ['admin']
    }

    const availableRoles: Array<RBACRole> = ['admin', 'site_admin', 'site_content_writer']
    const parsedRoles = rawRoleHeader
      .split(',')
      .map((role) => role.trim())
      .filter((role): role is RBACRole => availableRoles.includes(role as RBACRole))

    if (parsedRoles.length === 0) {
      return ['admin']
    }

    return parsedRoles
  }
}

export function createCMS(config: CMSConfig): HanaCMS {
  return new HanaCMS(config)
}
