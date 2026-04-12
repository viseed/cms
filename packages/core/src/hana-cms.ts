import { randomBytes, randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import {
  installedPlugins,
  installedThemes,
  sessions,
  sites,
  themeState,
  userSiteRoles,
  users,
} from '@hana/schema'
import type {
  CMSConfig,
  CMSPlugin,
  CMSRouteContextHelpers,
  CMSTheme,
  Permission,
  RequestContext,
  RequiredLayoutKey,
} from '@hana/types'
import { HOOK_KEY, SINGLE_SITE_CONTEXT, toAuthContextPayload } from '@hana/types'
import { loginSchema } from '@hana/validator'
import { eq } from 'drizzle-orm'
import type { Context, Handler } from 'hono'
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { getCookie, setCookie } from 'hono/cookie'
import {
  AdminPolicyRegistry,
  getRequestContext,
  getSessionToken,
  resolveSessionActorContext,
  setRequestContext,
} from './admin-auth-policy'
import { createDatabase, type DatabaseInstance } from './database'
import { HookRegistry } from './hook-registry'
import { PluginRouteRegistry } from './plugin-route-registry'
import { resolveSiteContextByHost } from './site-resolver'
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

const PUBLIC_ADMIN_AUTH_ROUTES = new Set(['POST /auth/login', 'POST /auth/logout'])
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7
const DEV_BOOTSTRAP_ADMIN_EMAIL = 'admin@local.dev'
const DEV_BOOTSTRAP_ADMIN_PASSWORD = '12345678'
const DEV_BOOTSTRAP_ADMIN_NAME = 'Local Admin'

const USERS_TABLE_ROLES = new Set<'admin' | 'site_admin' | 'site_content_writer'>([
  'admin',
  'site_admin',
  'site_content_writer',
])

function parseUsersTableRole(
  role: string | null | undefined,
): 'admin' | 'site_admin' | 'site_content_writer' | null {
  if (!role || !USERS_TABLE_ROLES.has(role as 'admin' | 'site_admin' | 'site_content_writer')) {
    return null
  }
  return role as 'admin' | 'site_admin' | 'site_content_writer'
}

interface ResolvedTheme {
  theme: CMSTheme
  runtime: ThemeRuntime
  templateRootOverride?: string
  staticRootOverride?: string | null
}

export class HanaCMS {
  private app: Hono
  private plugins: CMSPlugin[] = []
  private hooks = new HookRegistry()
  private db: DatabaseInstance | null = null
  private config: CMSConfig
  private themeRuntime: ThemeRuntime | null = null
  private themeRegistry = new Map<string, CMSTheme>()
  private themeRuntimes = new Map<string, ThemeRuntime>()
  private activeThemeName: string | null = null
  private pluginRegistry = new PluginRouteRegistry()

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
    this.registerThemes()

    const allSchemas = [
      ...this.plugins.flatMap((p) => (p.schema ? [p.schema] : [])),
      ...Array.from(this.themeRegistry.values()).flatMap((t) =>
        t.companionPlugin?.schema ? [t.companionPlugin.schema] : [],
      ),
    ]

    this.db = await createDatabase(this.config.db, allSchemas)

    await this.ensureBootstrapAdmin()

    await this.hooks.run(HOOK_KEY.CMS_INIT, this as never)

    const helpers = this.createRouteContextHelpers()
    for (const plugin of this.plugins) {
      this.pluginRegistry.register(plugin, helpers)
    }
    for (const theme of this.themeRegistry.values()) {
      if (theme.companionPlugin) {
        this.pluginRegistry.register(theme.companionPlugin, helpers)
      }
    }
    await this.syncPluginActiveStateFromDb()
    this.app.use('*', this.pluginRegistry.middleware())

    await this.resolveActiveTheme()

    if (this.activeThemeName) {
      this.mountThemeRoutes()
      const activeTheme = this.themeRegistry.get(this.activeThemeName)
      if (activeTheme) {
        if (activeTheme.companionPlugin) {
          this.pluginRegistry.activate(activeTheme.companionPlugin.name)
          await this.registerPluginHooks(activeTheme.companionPlugin)
        }
        await this.hooks.run(HOOK_KEY.THEME_MOUNT, activeTheme)
      }
    }

    this.setupAdminApi()
    this.setupAdminServing()

    await this.hooks.run(HOOK_KEY.CMS_READY, this.app)

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
    if (this.activeThemeName) {
      return this.themeRegistry.get(this.activeThemeName)
    }
    return this.config.theme
  }

  hasTheme(): boolean {
    return (
      this.activeThemeName !== null ||
      this.themeRegistry.size > 0 ||
      this.config.theme !== undefined
    )
  }

  getRegisteredThemes(): CMSTheme[] {
    return [...this.themeRegistry.values()]
  }

  getApp(): Hono {
    return this.app
  }

  getThemeRuntime(): ThemeRuntime | null {
    if (this.activeThemeName) {
      return this.themeRuntimes.get(this.activeThemeName) ?? null
    }
    return this.themeRuntime
  }

  private registerThemes(): void {
    const allThemes: CMSTheme[] = [...(this.config.themes ?? [])]

    const legacyTheme = this.config.theme
    if (legacyTheme && !allThemes.find((t) => t.name === legacyTheme.name)) {
      allThemes.push(legacyTheme)
    }

    for (const theme of allThemes) {
      this.themeRegistry.set(theme.name, theme)
      const runtime = createThemeRuntime(theme, this)
      this.themeRuntimes.set(theme.name, runtime)
    }

    if (this.config.theme) {
      this.themeRuntime = this.themeRuntimes.get(this.config.theme.name) ?? null
    }
  }

  private async resolveActiveTheme(): Promise<void> {
    if (this.themeRegistry.size === 0) return

    const db = this.getDatabase()
    const row = await db.select().from(themeState).where(eq(themeState.siteId, 'default')).get()

    if (row?.activeThemeName && this.themeRegistry.has(row.activeThemeName)) {
      this.activeThemeName = row.activeThemeName
      return
    }

    if (this.config.defaultTheme && this.themeRegistry.has(this.config.defaultTheme)) {
      this.activeThemeName = this.config.defaultTheme
      return
    }

    const firstName = [...this.themeRegistry.keys()][0]
    if (firstName) {
      this.activeThemeName = firstName
    }
  }

  private async syncPluginActiveStateFromDb(): Promise<void> {
    const db = this.getDatabase()
    const rows = await db.select().from(installedPlugins).all()

    for (const row of rows) {
      if (row.enabled && this.pluginRegistry.isInstalled(row.name)) {
        this.pluginRegistry.activate(row.name)
      }
    }

    for (const plugin of this.plugins) {
      const dbRecord = rows.find((r) => r.name === plugin.name)
      if (!dbRecord) {
        this.pluginRegistry.activate(plugin.name)
      }
    }
  }

  private async registerPluginHooks(plugin: CMSPlugin): Promise<void> {
    if (!plugin.hooks) return
    for (const [hookName, handler] of Object.entries(plugin.hooks)) {
      if (handler) {
        this.hooks.register(hookName as Parameters<HookRegistry['register']>[0], handler)
      }
    }
  }

  private async resolveThemeForRequest(c: Context): Promise<ResolvedTheme | null> {
    if (!this.activeThemeName) return null
    const activeTheme = this.themeRegistry.get(this.activeThemeName)
    const activeRuntime = this.themeRuntimes.get(this.activeThemeName)
    if (!activeTheme || !activeRuntime) return null

    const token = c.req.query('hana_preview') ?? getCookie(c, 'hana_preview')
    if (token) {
      const db = this.getDatabase()
      const row = await db.select().from(themeState).where(eq(themeState.siteId, 'default')).get()

      if (row?.previewToken === token) {
        if (row.previewThemeName) {
          const previewTheme = this.themeRegistry.get(row.previewThemeName)
          const previewRuntime = this.themeRuntimes.get(row.previewThemeName)
          if (previewTheme && previewRuntime) {
            return { theme: previewTheme, runtime: previewRuntime }
          }
        }

        if (row.previewThemePath) {
          const previewRoot = resolveValidatedPreviewRoot(process.cwd(), row.previewThemePath)
          if (previewRoot) {
            return {
              theme: activeTheme,
              runtime: activeRuntime,
              templateRootOverride: resolveTemplateDirFromAbsoluteRoot(previewRoot),
              staticRootOverride: resolveThemeStaticDirFromRoot(previewRoot),
            }
          }
        }
      }
    }

    return { theme: activeTheme, runtime: activeRuntime }
  }

  private clearThemePreviewCookie(c: Context): void {
    setCookie(c, 'hana_preview', '', { path: '/', maxAge: 0 })
  }

  private async clearThemePreviewState(c: Context) {
    const db = this.getDatabase()
    const existing = await db
      .select()
      .from(themeState)
      .where(eq(themeState.siteId, 'default'))
      .get()

    if (existing) {
      await db
        .update(themeState)
        .set({
          previewThemeName: null,
          previewThemePath: null,
          previewToken: null,
          updatedAt: new Date(),
        })
        .where(eq(themeState.siteId, 'default'))
    }

    this.clearThemePreviewCookie(c)
    return c.json({ message: 'Theme preview cleared.' })
  }

  private resolveStaticRoot(theme: CMSTheme): string | null {
    return (
      theme.staticRoot ??
      (theme.assets?.staticDir ? resolve(process.cwd(), theme.assets.staticDir) : null)
    )
  }

  private mountThemeRoutes(): void {
    this.app.get('/theme/static/*', async (c, next) => {
      const resolved = await this.resolveThemeForRequest(c)
      if (!resolved) return c.notFound()

      const root = resolved.staticRootOverride ?? this.resolveStaticRoot(resolved.theme)
      if (!root) return c.notFound()

      return serveStatic({
        root,
        rewriteRequestPath: (path) => path.replace('/theme/static', ''),
      })(c, next)
    })

    const registeredRoutes = new Set<string>()

    for (const theme of this.themeRegistry.values()) {
      for (const [layoutKey, layoutEntry] of Object.entries(theme.layouts)) {
        const routes: string[] = []
        const defaultRoute = DEFAULT_LAYOUT_ROUTES[layoutKey]
        if (defaultRoute) routes.push(defaultRoute)
        if (layoutEntry.routePattern && layoutEntry.routePattern !== defaultRoute) {
          routes.push(layoutEntry.routePattern)
        }

        for (const routePath of routes) {
          if (!routePath) continue
          if (registeredRoutes.has(routePath)) continue
          registeredRoutes.add(routePath)

          this.app.get(routePath, async (c) => {
            const resolved = await this.resolveThemeForRequest(c)
            if (!resolved) return c.text('No active theme', 404)

            const { theme: activeTheme, runtime, templateRootOverride } = resolved

            const resolvedLayoutKey = this.resolveLayoutKeyForRoute(
              activeTheme,
              c.req.path,
              routePath,
            )
            if (!resolvedLayoutKey || !activeTheme.layouts[resolvedLayoutKey]) {
              return c.notFound()
            }

            const requestParams = c.req.param() as Record<string, string>
            const requestQuery = c.req.query()
            const defaultData: Record<string, unknown> = {
              params: requestParams,
              query: requestQuery,
              path: c.req.path,
            }

            const renderRequestContext = {
              params: requestParams,
              url: c.req.url,
              query: requestQuery,
              path: c.req.path,
            }

            const data = (await this.hooks.runWaterfallAt(
              HOOK_KEY.THEME_BEFORE_RENDER,
              1,
              resolvedLayoutKey,
              defaultData,
              renderRequestContext,
            )) as Record<string, unknown>

            const html = await runtime.renderLayout(
              resolvedLayoutKey,
              {
                data,
                settings: {},
                menus: {},
                request: {
                  url: c.req.url,
                  params: c.req.param() as Record<string, string>,
                },
              },
              templateRootOverride ? { templateRoot: templateRootOverride } : undefined,
            )

            return c.html(html)
          })
        }
      }
    }
  }

  private resolveLayoutKeyForRoute(
    theme: CMSTheme,
    _requestPath: string,
    routePattern: string,
  ): string | null {
    for (const [layoutKey, layoutEntry] of Object.entries(theme.layouts)) {
      const entryPattern = layoutEntry.routePattern ?? DEFAULT_LAYOUT_ROUTES[layoutKey]
      if (entryPattern === routePattern) return layoutKey
    }
    return null
  }

  private async ensureBootstrapAdmin(): Promise<void> {
    const configuredBootstrapAdmin = this.config.admin?.bootstrapAdmin
    const isDevelopment = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test'
    const defaultBootstrapAdmin =
      isDevelopment && !configuredBootstrapAdmin
        ? {
            email: process.env.HANA_ADMIN_EMAIL?.trim() || DEV_BOOTSTRAP_ADMIN_EMAIL,
            password: process.env.HANA_ADMIN_PASSWORD || DEV_BOOTSTRAP_ADMIN_PASSWORD,
            name: process.env.HANA_ADMIN_NAME?.trim() || DEV_BOOTSTRAP_ADMIN_NAME,
            siteId: process.env.HANA_ADMIN_SITE_ID?.trim() || SINGLE_SITE_CONTEXT.id,
          }
        : null
    const bootstrapAdmin = configuredBootstrapAdmin ?? defaultBootstrapAdmin

    if (!bootstrapAdmin) {
      return
    }

    const email = bootstrapAdmin.email.trim().toLowerCase()
    const password = bootstrapAdmin.password
    const name = bootstrapAdmin.name?.trim() || 'Administrator'
    const siteId = bootstrapAdmin.siteId?.trim() || SINGLE_SITE_CONTEXT.id

    if (!email) {
      throw new Error('admin.bootstrapAdmin.email is required.')
    }

    if (password.length < 8) {
      throw new Error('admin.bootstrapAdmin.password must be at least 8 characters.')
    }

    const db = this.getDatabase()
    const existingUser = await db.select().from(users).where(eq(users.email, email)).get()
    if (existingUser) {
      return
    }

    const hasAnyUser = await db.select({ id: users.id }).from(users).limit(1).get()
    if (hasAnyUser) {
      return
    }

    const targetSite = await db.select().from(sites).where(eq(sites.id, siteId)).get()
    if (!targetSite) {
      throw new Error(`admin.bootstrapAdmin.siteId "${siteId}" does not exist.`)
    }

    const passwordHash = await Bun.password.hash(password)
    const userId = randomUUID()

    await db.insert(users).values({
      id: userId,
      email,
      name,
      passwordHash,
      role: 'admin',
    })

    await db.insert(userSiteRoles).values({
      id: randomUUID(),
      userId,
      siteId,
      role: 'admin',
    })
  }

  private setupAdminApi(): void {
    const adminApi = new Hono()
    const policyRegistry = new AdminPolicyRegistry()

    adminApi.use('*', async (c, next) => {
      const db = this.getDatabase()
      const siteResolution = await resolveSiteContextByHost(db, c.req.header('host'))

      if (!siteResolution.site) {
        return c.json(
          {
            error: siteResolution.error ?? 'Unable to resolve site from Host header.',
          },
          400,
        )
      }

      const routePath = c.req.path.startsWith('/api/admin')
        ? c.req.path.slice('/api/admin'.length) || '/'
        : c.req.path
      const routeKey = `${c.req.method.toUpperCase()} ${routePath}`
      const isPublicAuthRoute = PUBLIC_ADMIN_AUTH_ROUTES.has(routeKey)
      if (isPublicAuthRoute) {
        setRequestContext(c, {
          site: siteResolution.site,
          actor: null,
          permissions: [],
        })
        await next()
        return
      }

      const sessionResolution = await resolveSessionActorContext(db, c, siteResolution.site)
      if (!sessionResolution.ok || !sessionResolution.value) {
        const statusCode = sessionResolution.status === 403 ? 403 : 401
        return c.json({ error: sessionResolution.error ?? 'Unauthorized' }, statusCode)
      }

      const requestContext: RequestContext = {
        site: siteResolution.site,
        actor: sessionResolution.value.actor,
        permissions: sessionResolution.value.permissions,
      }

      setRequestContext(c, requestContext)
      const policyEntry = policyRegistry.resolve(c.req.method, routePath)
      if (!policyEntry) {
        return c.json(
          {
            error: `No policy mapping for admin route "${c.req.method} ${routePath}".`,
          },
          403,
        )
      }

      if (!requestContext.permissions.includes(policyEntry.policy.permission)) {
        return c.json(
          {
            error: `Forbidden: missing permission "${policyEntry.policy.permission}".`,
          },
          403,
        )
      }

      await next()
    })

    const registerPublicAdminRoute = (
      method: 'GET' | 'POST' | 'PUT' | 'DELETE',
      routePath: string,
      handler: Handler,
    ) => {
      switch (method) {
        case 'GET':
          adminApi.get(routePath, handler)
          break
        case 'POST':
          adminApi.post(routePath, handler)
          break
        case 'PUT':
          adminApi.put(routePath, handler)
          break
        case 'DELETE':
          adminApi.delete(routePath, handler)
          break
      }
    }

    const registerAdminRoute = (
      method: 'GET' | 'POST' | 'PUT' | 'DELETE',
      routePath: string,
      permission: Permission,
      handler: Handler,
    ) => {
      policyRegistry.register(method, routePath, { permission })
      switch (method) {
        case 'GET':
          adminApi.get(routePath, handler)
          break
        case 'POST':
          adminApi.post(routePath, handler)
          break
        case 'PUT':
          adminApi.put(routePath, handler)
          break
        case 'DELETE':
          adminApi.delete(routePath, handler)
          break
      }
    }

    registerPublicAdminRoute('POST', '/auth/login', async (c) => {
      let body: unknown
      try {
        body = await c.req.json()
      } catch {
        return c.json({ error: 'Invalid JSON body.' }, 400)
      }

      const parsed = loginSchema.safeParse(body)
      if (!parsed.success) {
        return c.json({ error: 'Invalid login payload.' }, 400)
      }

      const requestContext = this.resolveRequestContext(c)
      const site = requestContext.site
      const db = this.getDatabase()
      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, parsed.data.email.trim().toLowerCase()))
        .get()

      if (!user) {
        return c.json({ error: 'Invalid email or password.' }, 401)
      }

      const passwordOk = await Bun.password.verify(parsed.data.password, user.passwordHash)
      if (!passwordOk) {
        return c.json({ error: 'Invalid email or password.' }, 401)
      }

      const roleRows = await db
        .select({
          role: userSiteRoles.role,
          siteId: userSiteRoles.siteId,
        })
        .from(userSiteRoles)
        .where(eq(userSiteRoles.userId, user.id))
        .all()

      const usersTableRole = parseUsersTableRole(user.role)
      const usersTableGrantsDefaultSite =
        site.id === SINGLE_SITE_CONTEXT.id &&
        (usersTableRole === 'site_admin' || usersTableRole === 'site_content_writer')
      const hasSiteAccess =
        roleRows.some((row) => row.role === 'admin' || row.siteId === site.id) ||
        usersTableRole === 'admin' ||
        usersTableGrantsDefaultSite

      if (!hasSiteAccess) {
        return c.json({ error: `User has no access to site "${site.slug}".` }, 403)
      }

      const token = randomBytes(32).toString('hex')
      await db.insert(sessions).values({
        id: randomUUID(),
        siteId: site.id,
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + ADMIN_SESSION_TTL_MS),
      })

      setCookie(c, 'hana_admin_session', token, {
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        secure: c.req.url.startsWith('https://'),
        maxAge: ADMIN_SESSION_TTL_MS / 1000,
      })

      return c.json({ message: 'Logged in.' })
    })

    registerPublicAdminRoute('POST', '/auth/logout', async (c) => {
      const db = this.getDatabase()
      const requestContext = this.resolveRequestContext(c)
      const token = getSessionToken(c)
      if (token) {
        const rows = await db
          .select({
            id: sessions.id,
            siteId: sessions.siteId,
          })
          .from(sessions)
          .where(eq(sessions.token, token))
          .all()

        for (const row of rows) {
          const sameSite = row.siteId === requestContext.site.id
          const hasSiteRole = requestContext.actor?.roleAssignments.some(
            (assignment) => assignment.role === 'admin' || assignment.siteId === row.siteId,
          )

          if (sameSite || hasSiteRole) {
            await db.delete(sessions).where(eq(sessions.id, row.id))
          }
        }
      }

      setCookie(c, 'hana_admin_session', '', {
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        secure: c.req.url.startsWith('https://'),
        maxAge: 0,
      })

      return c.json({ message: 'Logged out.' })
    })

    registerAdminRoute('GET', '/auth/context', 'site.content.read', (c) => {
      const requestContext = this.resolveRequestContext(c)
      return c.json(toAuthContextPayload(requestContext))
    })

    registerAdminRoute('GET', '/plugins', 'platform.sites.read', (c) => {
      const plugins = this.plugins.map((plugin) => ({
        name: plugin.name,
        version: plugin.version,
        description: `${plugin.name} plugin`,
        installed: true,
        enabled: this.pluginRegistry.isActive(plugin.name),
        type: 'official' as const,
      }))

      return c.json(plugins)
    })

    registerAdminRoute('GET', '/plugin-manifest', 'site.content.read', (c) => {
      const manifest = this.plugins
        .filter((p) => p.admin && this.pluginRegistry.isActive(p.name))
        .map((p) => ({
          name: p.name,
          version: p.version,
          admin: {
            menuItems: p.admin!.menuItems,
            hasBundle: !!p.admin!.bundlePath,
          },
        }))
      return c.json({ plugins: manifest })
    })

    registerAdminRoute('GET', '/plugins/:name/ui.js', 'site.content.read', async (c) => {
      const name = c.req.param('name') || ''
      const plugin = this.plugins.find((p) => p.name === name)

      if (!plugin?.admin?.bundlePath) {
        return c.json({ error: 'No admin bundle for this plugin' }, 404)
      }
      if (!this.pluginRegistry.isActive(name)) {
        return c.json({ error: 'Plugin is not active' }, 404)
      }

      const file = Bun.file(plugin.admin.bundlePath)
      if (!(await file.exists())) {
        return c.json({ error: 'Admin bundle file not found' }, 404)
      }

      return new Response(await file.arrayBuffer(), {
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    })

    registerAdminRoute('GET', '/themes', 'platform.sites.read', async (c) => {
      const db = this.getDatabase()
      const dbRecords = await db.select().from(installedThemes).all()
      const activeTheme = this.getTheme()

      const seen = new Set<string>()
      const catalog: ReturnType<HanaCMS['describeTheme']>[] = []

      for (const [, theme] of this.themeRegistry) {
        seen.add(theme.name)
        catalog.push(this.describeTheme(theme, theme.name === this.activeThemeName))
      }

      for (const record of dbRecords) {
        if (seen.has(record.name)) continue
        catalog.push({
          name: record.name,
          version: record.version,
          description: record.description ?? `${record.name} theme`,
          installed: true,
          active: activeTheme?.name === record.name,
          missingRequiredLayouts: [],
        })
      }

      return c.json(catalog)
    })

    registerAdminRoute('GET', '/themes/active', 'platform.sites.read', (c) => {
      const theme = this.getTheme()
      if (!theme) return c.json(null)
      return c.json(this.describeTheme(theme, true))
    })

    registerAdminRoute('GET', '/themes/preview', 'platform.sites.read', async (c) => {
      const db = this.getDatabase()
      const row = await db.select().from(themeState).where(eq(themeState.siteId, 'default')).get()

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
    })

    registerAdminRoute('POST', '/themes/preview', 'platform.sites.manage', async (c) => {
      if (this.themeRegistry.size === 0) {
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
        if (!this.themeRegistry.has(b.themeName)) {
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
      const db = this.getDatabase()
      const activeTheme = this.activeThemeName ?? 'default'
      const existing = await db
        .select()
        .from(themeState)
        .where(eq(themeState.siteId, 'default'))
        .get()

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
        previewThemeName,
        previewThemePath,
        token,
        previewQueryExample,
      })
    })

    registerAdminRoute('DELETE', '/themes/preview', 'platform.sites.manage', async (c) => {
      return this.clearThemePreviewState(c)
    })

    registerAdminRoute('POST', '/themes/preview/clear', 'platform.sites.manage', async (c) => {
      return this.clearThemePreviewState(c)
    })

    registerAdminRoute('POST', '/themes/:name/install', 'platform.sites.manage', async (c) => {
      const name = c.req.param('name')
      if (!name) return c.json({ error: 'Theme name is required.' }, 400)
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

    registerAdminRoute('POST', '/themes/:name/uninstall', 'platform.sites.manage', async (c) => {
      const name = c.req.param('name')
      if (!name) return c.json({ error: 'Theme name is required.' }, 400)
      const db = this.getDatabase()

      if (this.activeThemeName === name) {
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

    registerAdminRoute('POST', '/themes/:name/activate', 'platform.sites.manage', async (c) => {
      const name = c.req.param('name')
      if (!name) return c.json({ error: 'Theme name is required.' }, 400)
      const db = this.getDatabase()

      const registeredTheme = this.themeRegistry.get(name)

      if (!registeredTheme) {
        const installedRecord = await db
          .select()
          .from(installedThemes)
          .where(eq(installedThemes.name, name))
          .get()

        if (!installedRecord) {
          return c.json({ error: `Theme "${name}" is not available.` }, 404)
        }

        return c.json({
          message: `Theme "${name}" is installed but not loaded in the registry. A restart is required.`,
          theme: name,
          requiresRestart: true,
        })
      }

      if (this.activeThemeName === name) {
        return c.json({ error: `Theme "${name}" is already the active theme.` }, 409)
      }

      const missingLayouts = HanaCMS.REQUIRED_LAYOUTS.filter((k) => !(k in registeredTheme.layouts))
      if (missingLayouts.length > 0) {
        return c.json(
          { error: `Theme "${name}" is missing required layouts: ${missingLayouts.join(', ')}.` },
          422,
        )
      }

      const previousTheme = this.activeThemeName
        ? this.themeRegistry.get(this.activeThemeName)
        : undefined

      if (previousTheme?.companionPlugin) {
        this.pluginRegistry.deactivate(previousTheme.companionPlugin.name)
        await previousTheme.companionPlugin.lifecycle?.onDisable?.(this as never)
        await this.hooks.run(HOOK_KEY.PLUGIN_DISABLED, previousTheme.companionPlugin.name)
      }

      const existingRow = await db
        .select()
        .from(themeState)
        .where(eq(themeState.siteId, 'default'))
        .get()

      if (existingRow) {
        await db
          .update(themeState)
          .set({ activeThemeName: name, updatedAt: new Date() })
          .where(eq(themeState.siteId, 'default'))
      } else {
        await db.insert(themeState).values({ activeThemeName: name })
      }

      this.activeThemeName = name

      if (registeredTheme.companionPlugin) {
        const companion = registeredTheme.companionPlugin
        const helpers = this.createRouteContextHelpers()
        if (!this.pluginRegistry.isInstalled(companion.name)) {
          this.pluginRegistry.register(companion, helpers)
        }
        await companion.lifecycle?.onEnable?.(this as never)
        this.pluginRegistry.activate(companion.name)
        await this.registerPluginHooks(companion)
        await this.hooks.run(HOOK_KEY.PLUGIN_ENABLED, companion.name)
      }

      await this.hooks.run(HOOK_KEY.THEME_ACTIVATE, registeredTheme, previousTheme)

      return c.json({
        message: `Theme "${name}" is now active.`,
        theme: name,
        requiresRestart: false,
      })
    })

    registerAdminRoute('GET', '/themes/:name/settings', 'site.content.read', async (c) => {
      const name = c.req.param('name')
      if (!name) return c.json({ error: 'Theme name is required.' }, 400)
      const theme = this.themeRegistry.get(name)

      if (!theme) {
        return c.json({ error: `Theme "${name}" not found.` }, 404)
      }

      const db = this.getDatabase()
      const row = await db.select().from(themeState).where(eq(themeState.siteId, 'default')).get()

      return c.json({
        schema: theme.settingsSchema ?? null,
        values: (row?.settings as Record<string, unknown>) ?? {},
      })
    })

    registerAdminRoute('PUT', '/themes/:name/settings', 'site.content.write', async (c) => {
      const name = c.req.param('name')
      if (!name) return c.json({ error: 'Theme name is required.' }, 400)
      const theme = this.themeRegistry.get(name)

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

      const db = this.getDatabase()
      const existing = await db
        .select()
        .from(themeState)
        .where(eq(themeState.siteId, 'default'))
        .get()

      if (existing) {
        await db
          .update(themeState)
          .set({ settings: values, updatedAt: new Date() })
          .where(eq(themeState.siteId, 'default'))
      } else {
        await db.insert(themeState).values({ activeThemeName: name, settings: values })
      }

      return c.json({ message: 'Settings saved.', values })
    })

    registerAdminRoute('POST', '/plugins/:name/install', 'platform.sites.manage', async (c) => {
      const name = c.req.param('name')
      if (!name) return c.json({ error: 'Plugin name is required.' }, 400)

      const db = this.getDatabase()
      const existing = await db
        .select()
        .from(installedPlugins)
        .where(eq(installedPlugins.name, name))
        .get()

      if (existing) {
        return c.json({ error: `Plugin "${name}" is already installed.` }, 409)
      }

      const plugin = this.plugins.find((p) => p.name === name)
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
        this.pluginRegistry.activate(name)
      }

      return c.json({
        message: `Plugin "${name}" installed successfully.`,
        plugin: name,
      })
    })

    registerAdminRoute('POST', '/plugins/:name/uninstall', 'platform.sites.manage', async (c) => {
      const name = c.req.param('name')
      if (!name) return c.json({ error: 'Plugin name is required.' }, 400)

      const db = this.getDatabase()
      const existing = await db
        .select()
        .from(installedPlugins)
        .where(eq(installedPlugins.name, name))
        .get()

      if (!existing) {
        return c.json({ error: `Plugin "${name}" is not installed.` }, 404)
      }

      const plugin = this.plugins.find((p) => p.name === name)
      if (plugin?.lifecycle?.onUninstall) {
        await plugin.lifecycle.onUninstall(db)
      }

      this.pluginRegistry.deactivate(name)
      await db.delete(installedPlugins).where(eq(installedPlugins.name, name))

      return c.json({
        message: `Plugin "${name}" uninstalled successfully.`,
        plugin: name,
      })
    })

    registerAdminRoute('POST', '/plugins/:name/enable', 'platform.sites.manage', async (c) => {
      const name = c.req.param('name')
      if (!name) return c.json({ error: 'Plugin name is required.' }, 400)

      if (!this.pluginRegistry.isInstalled(name)) {
        return c.json({ error: `Plugin "${name}" is not registered.` }, 404)
      }

      if (this.pluginRegistry.isActive(name)) {
        return c.json({ error: `Plugin "${name}" is already enabled.` }, 409)
      }

      const plugin = this.plugins.find((p) => p.name === name)
      if (plugin?.lifecycle?.onEnable) {
        await plugin.lifecycle.onEnable(this as never)
      }

      this.pluginRegistry.activate(name)

      const db = this.getDatabase()
      await db
        .update(installedPlugins)
        .set({ enabled: true, updatedAt: new Date() })
        .where(eq(installedPlugins.name, name))

      await this.hooks.run(HOOK_KEY.PLUGIN_ENABLED, name)

      return c.json({
        message: `Plugin "${name}" enabled.`,
        plugin: name,
      })
    })

    registerAdminRoute('POST', '/plugins/:name/disable', 'platform.sites.manage', async (c) => {
      const name = c.req.param('name')
      if (!name) return c.json({ error: 'Plugin name is required.' }, 400)

      if (!this.pluginRegistry.isInstalled(name)) {
        return c.json({ error: `Plugin "${name}" is not registered.` }, 404)
      }

      if (!this.pluginRegistry.isActive(name)) {
        return c.json({ error: `Plugin "${name}" is already disabled.` }, 409)
      }

      const plugin = this.plugins.find((p) => p.name === name)
      if (plugin?.lifecycle?.onDisable) {
        await plugin.lifecycle.onDisable(this as never)
      }

      this.pluginRegistry.deactivate(name)

      const db = this.getDatabase()
      await db
        .update(installedPlugins)
        .set({ enabled: false, updatedAt: new Date() })
        .where(eq(installedPlugins.name, name))

      await this.hooks.run(HOOK_KEY.PLUGIN_DISABLED, name)

      return c.json({
        message: `Plugin "${name}" disabled.`,
        plugin: name,
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
    const requestContext = getRequestContext(c)
    if (requestContext) {
      return requestContext
    }

    return {
      site: { ...SINGLE_SITE_CONTEXT },
      actor: null,
      permissions: [],
    }
  }

  private hasPermission(c: Context, permission: Permission): boolean {
    const context = this.resolveRequestContext(c)
    return context.permissions.includes(permission)
  }
}

export function createCMS(config: CMSConfig): HanaCMS {
  return new HanaCMS(config)
}
