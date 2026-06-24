import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import {
  installedPlugins,
  mediaStorageConfig,
  sites,
  themeState,
  userSiteRoles,
  users,
  widgets,
} from '@viseed/schema'
import type {
  CMSConfig,
  CMSPlugin,
  CMSRouteContextHelpers,
  CMSTheme,
  MediaStorageConfig,
  Permission,
  RequestContext,
  RequiredLayoutKey,
} from '@viseed/types'
import { HOOK_KEY, resolveDefaultSettings, SINGLE_SITE_CONTEXT } from '@viseed/types'
import { and, eq, sql } from 'drizzle-orm'
import type { Context, Handler } from 'hono'
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { getCookie, setCookie } from 'hono/cookie'
import {
  AdminPolicyRegistry,
  getRequestContext,
  resolveSessionActorContext,
  setRequestContext,
} from './admin-auth-policy'
import { registerAuthRoutes } from './admin-routes/auth'
import { registerDashboardWidgetRoutes } from './admin-routes/dashboard-widgets'
import { registerMediaStorageRoutes } from './admin-routes/media-storage'
import { registerPluginRoutes } from './admin-routes/plugins'
import { registerThemeRoutes } from './admin-routes/themes'
import { registerWidgetRoutes } from './admin-routes/widgets'
import { DashboardWidgetRegistry } from './dashboard-widget-registry'
import { createDatabase, type DatabaseInstance } from './database'
import { HookRegistry } from './hook-registry'
import { setupMediaRoutes } from './media-routes'
import {
  createStorageAdapter,
  LocalStorageAdapter,
  type StorageAdapter,
  type StorageConfig,
} from './media-storage'
import {
  prepareConfigForStorage,
  resolveStoredConfig,
  type StorageConfigPayload,
} from './media-storage-config'
import { PluginRouteRegistry } from './plugin-route-registry'
import { resolveSiteContextByHost } from './site-resolver'
import { StorageProviderRegistry } from './storage-provider-registry'
import { resolveValidatedPreviewRoot } from './theme-preview-path'
import {
  createThemeRuntime,
  resolveTemplateDirFromAbsoluteRoot,
  resolveThemeStaticDirFromRoot,
  type ThemeRuntime,
} from './theme-runtime'
import { WidgetTypeRegistry } from './widget-type-registry'

const DEFAULT_LAYOUT_ROUTES: Record<string, string> = {
  home: '/',
  post: '/post/:slug',
  page: '/page/:slug',
  category: '/category/:slug',
  archive: '/archive',
  '404': '/404',
}

const PUBLIC_ADMIN_AUTH_ROUTES = new Set([
  'POST /auth/login',
  'POST /auth/logout',
  'GET /setup/status',
  'POST /setup',
])
const DEV_BOOTSTRAP_ADMIN_EMAIL = 'admin@local.dev'
const DEV_BOOTSTRAP_ADMIN_PASSWORD = '12345678'
const DEV_BOOTSTRAP_ADMIN_NAME = 'Local Admin'

interface ResolvedTheme {
  theme: CMSTheme
  runtime: ThemeRuntime
  templateRootOverride?: string
  staticRootOverride?: string | null
  previewToken?: string
}

export class ViseedCMS {
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
  private widgetTypeRegistry = new WidgetTypeRegistry()
  private dashboardWidgetRegistry = new DashboardWidgetRegistry()
  private storageProviderRegistry = new StorageProviderRegistry()
  private currentMediaAdapter: StorageAdapter | null = null
  private mediaStorageType: MediaStorageConfig['type'] = 'local'

  constructor(config: CMSConfig) {
    this.config = config
    this.app = new Hono()

    if (config.plugins) {
      for (const plugin of config.plugins) {
        this.use(plugin)
      }
    }
  }

  use(plugin: CMSPlugin): ViseedCMS {
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

    this.setupHealthRoute()

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

    // Mount core media routes (always available, no plugin required).
    // The adapter is resolved from DB-backed config and can be hot-swapped.
    setupMediaRoutes(this.app, helpers, () => this.db, {
      getAdapter: () => this.currentMediaAdapter ?? new LocalStorageAdapter(),
      maxFileSizeMb: this.config.media?.maxFileSizeMb,
    })

    for (const plugin of this.plugins) {
      this.pluginRegistry.register(plugin, helpers)
    }
    for (const theme of this.themeRegistry.values()) {
      if (theme.companionPlugin) {
        this.pluginRegistry.register(theme.companionPlugin, helpers)
      }
    }
    await this.syncPluginActiveStateFromDb()
    this.rebuildRegistries()

    // Storage providers are contributed by active plugins, so the media adapter
    // can only be resolved after the provider registry has been built.
    await this.initMediaStorage()

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
    } else {
      this.mountNoThemeFallback()
    }

    this.mountUploadsServing()
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

  async shutdown(): Promise<void> {
    console.log('[ViseedCMS] Graceful shutdown initiated...')

    if (this.db) {
      try {
        const client = (this.db as unknown as { $client?: { close?: () => Promise<void> } }).$client
        if (typeof client?.close === 'function') {
          await client.close()
          console.log('[ViseedCMS] Database connection closed.')
        }
      } catch (error) {
        console.error('[ViseedCMS] Error closing database connection:', error)
      }
      this.db = null
    }

    console.log('[ViseedCMS] Shutdown complete.')
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
    const [row] = await db.select().from(themeState).where(eq(themeState.siteId, 'default'))

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
    const rows = await db.select().from(installedPlugins)

    for (const row of rows) {
      if (row.enabled && this.pluginRegistry.isInstalled(row.name)) {
        this.pluginRegistry.activate(row.name)
      }
    }

    for (const plugin of this.plugins) {
      const dbRecord = rows.find((r: { name: string }) => r.name === plugin.name)
      if (!dbRecord) {
        this.pluginRegistry.activate(plugin.name)
      }
    }
  }

  private rebuildRegistries(): void {
    const isActive = (name: string) => this.pluginRegistry.isActive(name)
    this.widgetTypeRegistry.rebuild(this.plugins, isActive)
    this.dashboardWidgetRegistry.rebuild(this.plugins, isActive)
    this.storageProviderRegistry.rebuild(this.plugins, isActive)
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

    const token = c.req.query('viseed_preview') ?? getCookie(c, 'viseed_preview')
    if (token) {
      const db = this.getDatabase()
      const [row] = await db.select().from(themeState).where(eq(themeState.siteId, 'default'))

      if (row?.previewToken === token) {
        if (row.previewThemeName) {
          const previewTheme = this.themeRegistry.get(row.previewThemeName)
          const previewRuntime = this.themeRuntimes.get(row.previewThemeName)
          if (previewTheme && previewRuntime) {
            return { theme: previewTheme, runtime: previewRuntime, previewToken: token }
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
              previewToken: token,
            }
          }
        }
      }
    }

    return { theme: activeTheme, runtime: activeRuntime }
  }

  private clearThemePreviewCookie(c: Context): void {
    setCookie(c, 'viseed_preview', '', { path: '/', maxAge: 0 })
  }

  private async clearThemePreviewState(c: Context) {
    const db = this.getDatabase()
    const [existing] = await db.select().from(themeState).where(eq(themeState.siteId, 'default'))

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

  /**
   * Resolves the media storage adapter from the DB-backed config (row
   * `default`), seeding it from `CMSConfig.media.storage` on first boot.
   * The secret is decrypted exactly once here and cached in the adapter.
   */
  private async initMediaStorage(): Promise<void> {
    const db = this.getDatabase()
    const [row] = await db
      .select()
      .from(mediaStorageConfig)
      .where(eq(mediaStorageConfig.id, 'default'))

    if (!row) {
      const initial: MediaStorageConfig = this.config.media?.storage ?? {
        type: 'local',
        uploadDir: this.config.media?.uploadDir,
      }
      const secretFields = this.storageProviderRegistry.secretFieldsOf(initial.type)
      const stored = prepareConfigForStorage(initial, secretFields)
      await db.insert(mediaStorageConfig).values({
        id: 'default',
        type: stored.type,
        config: stored.config,
        updatedAt: new Date(),
      })
      this.applyMediaStorageConfig(initial)
      return
    }

    const secretFields = this.storageProviderRegistry.secretFieldsOf(row.type)
    const resolved = resolveStoredConfig(row.type, row.config as StorageConfigPayload, secretFields)
    this.applyMediaStorageConfig(resolved)
  }

  /** Hot-swaps the in-memory storage adapter from a resolved (decrypted) config. */
  private applyMediaStorageConfig(resolved: MediaStorageConfig): void {
    this.currentMediaAdapter = createStorageAdapter(
      resolved as StorageConfig,
      this.storageProviderRegistry,
    )
    this.mediaStorageType = resolved.type
  }

  private mountUploadsServing(): void {
    // Local filesystem serving is only meaningful for the local adapter.
    if (this.mediaStorageType !== 'local') return

    const uploadDir = this.config.media?.uploadDir ?? './uploads'
    const absoluteUploadDir = resolve(uploadDir)
    this.app.get(
      '/uploads/*',
      serveStatic({
        root: absoluteUploadDir,
        rewriteRequestPath: (path) => path.replace('/uploads', ''),
      }),
    )
  }

  private mountNoThemeFallback(): void {
    const adminPath = this.config.admin?.path ?? '/admin'
    this.app.get('/', (c) => c.redirect(adminPath, 302))
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

            const { theme: activeTheme, runtime, templateRootOverride, previewToken } = resolved

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

            const defaultSettings = activeTheme.settingsSchema
              ? resolveDefaultSettings(activeTheme.settingsSchema)
              : {}
            const db = this.getDatabase()
            const [themeRow] = await db
              .select()
              .from(themeState)
              .where(eq(themeState.siteId, 'default'))
            const storedSettings = (themeRow?.settings as Record<string, unknown>) ?? {}
            const settings = { ...defaultSettings, ...storedSettings }

            const html = await runtime.renderLayout(
              resolvedLayoutKey,
              {
                data,
                settings,
                menus: {},
                request: {
                  url: c.req.url,
                  params: c.req.param() as Record<string, string>,
                },
              },
              {
                ...(templateRootOverride ? { templateRoot: templateRootOverride } : {}),
                ...(previewToken ? { previewToken } : {}),
              },
            )

            return c.html(this.injectWidgetRuntime(html))
          })
        }
      }
    }
  }

  private injectWidgetRuntime(html: string): string {
    if (!html.includes('data-widget-id')) return html

    const importMap = `<script type="importmap">{"imports":{"vue":"/api/public/vendor-vue.js"}}</script>`
    const runtimeScript = `<script type="module" src="/api/public/widget-runtime.js"></script>`
    const injection = `\n${importMap}\n${runtimeScript}\n`

    if (html.includes('</body>')) {
      return html.replace('</body>', `${injection}</body>`)
    }
    return html + injection
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

    // Auto-create a dev admin only when env vars are explicitly provided.
    // Without explicit config or env vars, the setup wizard handles first-run setup.
    const hasDevEnvVars = !!(
      process.env.HANA_ADMIN_EMAIL?.trim() || process.env.HANA_ADMIN_PASSWORD?.trim()
    )
    const defaultBootstrapAdmin =
      isDevelopment && !configuredBootstrapAdmin && hasDevEnvVars
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

    const [defaultSite] = await db.select().from(sites).where(eq(sites.id, SINGLE_SITE_CONTEXT.id))
    if (!defaultSite) {
      await db.insert(sites).values({
        id: SINGLE_SITE_CONTEXT.id,
        name: SINGLE_SITE_CONTEXT.name,
        slug: SINGLE_SITE_CONTEXT.slug,
        status: 'active',
      })
    }

    const [existingUser] = await db.select().from(users).where(eq(users.email, email))
    if (existingUser) {
      return
    }

    const [hasAnyUser] = await db.select({ id: users.id }).from(users).limit(1)
    if (hasAnyUser) {
      return
    }

    const [targetSite] = await db.select().from(sites).where(eq(sites.id, siteId))
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

  private setupHealthRoute(): void {
    this.app.get('/health', async (c) => {
      const startedAt = Date.now()

      try {
        const db = this.db
        if (db) {
          await db.execute(sql`SELECT 1`)
        }

        return c.json({
          status: 'ok',
          db: db ? 'connected' : 'not_initialized',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          latencyMs: Date.now() - startedAt,
        })
      } catch (error) {
        return c.json(
          {
            status: 'error',
            db: 'unreachable',
            error: error instanceof Error ? error.message : 'Unknown error',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            latencyMs: Date.now() - startedAt,
          },
          503,
        )
      }
    })
  }

  private setupAdminApi(): void {
    const adminApi = new Hono()
    const policyRegistry = new AdminPolicyRegistry()

    adminApi.use('*', async (c, next) => {
      const db = this.getDatabase()
      const routePath = c.req.path.startsWith('/api/admin')
        ? c.req.path.slice('/api/admin'.length) || '/'
        : c.req.path
      const routeKey = `${c.req.method.toUpperCase()} ${routePath}`
      const isPublicAuthRoute = PUBLIC_ADMIN_AUTH_ROUTES.has(routeKey)
      if (isPublicAuthRoute) {
        setRequestContext(c, {
          site: { ...SINGLE_SITE_CONTEXT },
          actor: null,
          permissions: [],
        })
        await next()
        return
      }
      const siteResolution = await resolveSiteContextByHost(db, c.req.header('host'))

      if (!siteResolution.site) {
        return c.json(
          {
            error: siteResolution.error ?? 'Unable to resolve site from Host header.',
          },
          400,
        )
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

    registerAuthRoutes(registerPublicAdminRoute, registerAdminRoute, {
      getDatabase: () => this.getDatabase(),
      resolveRequestContext: (c) => this.resolveRequestContext(c),
    })

    registerPluginRoutes(registerAdminRoute, {
      getDatabase: () => this.getDatabase(),
      plugins: this.plugins,
      pluginRegistry: this.pluginRegistry,
      rebuildRegistries: () => this.rebuildRegistries(),
      hooks: this.hooks,
      cms: this as never,
    })

    registerThemeRoutes(registerAdminRoute, {
      getDatabase: () => this.getDatabase(),
      themeRegistry: this.themeRegistry,
      getActiveThemeName: () => this.activeThemeName,
      setActiveThemeName: (name) => {
        this.activeThemeName = name
      },
      pluginRegistry: this.pluginRegistry,
      hooks: this.hooks,
      createRouteContextHelpers: () => this.createRouteContextHelpers(),
      clearThemePreviewState: (c) => this.clearThemePreviewState(c),
      describeTheme: (theme, active) => this.describeTheme(theme, active),
      requiredLayouts: ViseedCMS.REQUIRED_LAYOUTS,
      registerPluginHooks: (plugin) => this.registerPluginHooks(plugin),
      cms: this as never,
    })

    registerWidgetRoutes(registerAdminRoute, {
      getDatabase: () => this.getDatabase(),
      plugins: this.plugins,
      pluginRegistry: this.pluginRegistry,
      widgetTypeRegistry: this.widgetTypeRegistry,
      resolveRequestContext: (c) => this.resolveRequestContext(c),
    })

    registerDashboardWidgetRoutes(registerAdminRoute, {
      getDatabase: () => this.getDatabase(),
      pluginRegistry: this.pluginRegistry,
      dashboardWidgetRegistry: this.dashboardWidgetRegistry,
      resolveRequestContext: (c) => this.resolveRequestContext(c),
    })

    registerMediaStorageRoutes(registerAdminRoute, {
      getDatabase: () => this.getDatabase(),
      applyConfig: (resolved) => this.applyMediaStorageConfig(resolved),
      getProviderRegistry: () => this.storageProviderRegistry,
    })

    this.app.route('/api/admin', adminApi)

    this.setupPublicWidgetRoutes()
  }

  private widgetRuntimeBundle: string | null = null
  private vendorVueBundle: string | null = null

  private async buildVendorVue(): Promise<string> {
    if (this.vendorVueBundle) return this.vendorVueBundle

    // Resolve vue's package root then pick the pre-built browser ESM file.
    // This avoids re-bundling Vue through Bun.build (which drops named exports).
    const vuePkgDir = resolve(Bun.resolveSync('vue/package.json', import.meta.dirname), '..')
    const distFile =
      process.env.NODE_ENV === 'production'
        ? 'dist/vue.esm-browser.prod.js'
        : 'dist/vue.esm-browser.js'

    const file = Bun.file(resolve(vuePkgDir, distFile))
    if (!(await file.exists())) {
      throw new Error(`[ViseedCMS] vue browser ESM not found at ${distFile}`)
    }

    this.vendorVueBundle = await file.text()
    return this.vendorVueBundle
  }

  private async buildWidgetRuntime(): Promise<string> {
    if (this.widgetRuntimeBundle) return this.widgetRuntimeBundle

    const entryPath = resolve(import.meta.dirname, 'public-runtime/widget-runtime.ts')
    const result = await Bun.build({
      entrypoints: [entryPath],
      format: 'esm',
      target: 'browser',
      minify: process.env.NODE_ENV === 'production',
      external: ['vue'],
    })

    const firstOutput = result.outputs[0]
    if (!firstOutput) {
      throw new Error('[ViseedCMS] Failed to build widget runtime.')
    }

    this.widgetRuntimeBundle = await firstOutput.text()
    return this.widgetRuntimeBundle
  }

  private setupPublicWidgetRoutes(): void {
    // Widget runtime script (bundled on first request, cached in-process)
    this.app.get('/api/public/widget-runtime.js', async (c) => {
      try {
        const bundle = await this.buildWidgetRuntime()
        return new Response(bundle, {
          headers: {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        })
      } catch (err) {
        console.error('[ViseedCMS] Widget runtime build error:', err)
        return c.json({ error: 'Widget runtime unavailable.' }, 500)
      }
    })

    // Vendor Vue — always serve vue.esm-browser.js (a self-contained ESM bundle
    // from the Vue package itself). The Vite-built dist/admin/assets/vendor-vue.js
    // contains relative imports to sibling chunks and cannot be served from a
    // different URL path such as /api/public/.
    this.app.get('/api/public/vendor-vue.js', async (c) => {
      try {
        const content = await this.buildVendorVue()
        return new Response(content, {
          headers: {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
          },
        })
      } catch (err) {
        console.error('[ViseedCMS] vendor-vue build error:', err)
        return c.json({ error: 'vendor-vue.js unavailable.' }, 500)
      }
    })

    // Public widget instance fetch (for CSR hydration)
    this.app.get('/api/widgets/:id', async (c) => {
      const db = this.getDatabase()
      const id = c.req.param('id')

      const siteResolution = await resolveSiteContextByHost(db, c.req.header('host'))
      const siteId = siteResolution.site?.id ?? 'default'

      const [row] = await db
        .select()
        .from(widgets)
        .where(and(eq(widgets.id, id), eq(widgets.siteId, siteId)))

      if (!row) return c.json({ error: 'Widget not found.' }, 404)

      const widgetType = this.widgetTypeRegistry.get(row.type)

      return c.json(
        {
          id: row.id,
          type: row.type,
          config: row.config,
          componentExport: widgetType?.publicComponent ?? null,
        },
        200,
        { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
      )
    })

    // Public plugin widget bundle serving
    this.app.get('/api/public/plugins/:name/widget.js', async (c) => {
      const name = c.req.param('name')
      const plugin = this.plugins.find((p) => p.name === name)

      if (!plugin?.public?.bundlePath) {
        return c.json({ error: 'No public bundle for this plugin.' }, 404)
      }
      if (!this.pluginRegistry.isActive(name)) {
        return c.json({ error: 'Plugin is not active.' }, 404)
      }

      const file = Bun.file(plugin.public.bundlePath)
      if (!(await file.exists())) {
        return c.json({ error: 'Public bundle file not found.' }, 404)
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
          'Cache-Control': 'public, max-age=3600',
          ETag: etag,
        },
      })
    })
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
    const missingRequiredLayouts = ViseedCMS.REQUIRED_LAYOUTS.filter(
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
    const adminConfig = this.config.admin ?? {}
    if (adminConfig.enabled === false) return

    const adminPath = adminConfig.path ?? '/admin'
    const adminRoot = resolve(import.meta.dirname, '../dist/admin')

    console.log('Admin dist path:', adminRoot)

    this.app.get(
      `${adminPath}/assets/*`,
      serveStatic({
        root: adminRoot,
        rewriteRequestPath: (path) =>
          path.startsWith(adminPath) ? path.slice(adminPath.length) || '/' : path,
      }),
    )
    // Use root + relative path so hono resolves: adminRoot + '/' + 'index.html'
    // Passing an absolute path to serveStatic({ path }) causes hono to strip the
    // leading '/' and prepend './', doubling the cwd prefix (e.g. /app/app/...).
    this.app.get(adminPath, serveStatic({ root: adminRoot, path: 'index.html' }))
    this.app.get(`${adminPath}/*`, serveStatic({ root: adminRoot, path: 'index.html' }))

    console.log(
      `Admin UI serving at http://localhost:${this.config.server?.port ?? 3000}${adminPath}`,
    )
  }

  private createRouteContextHelpers(): CMSRouteContextHelpers {
    return {
      resolveRequestContext: (context) => this.resolveRequestContext(context),
      hasPermission: (context, permission) => this.hasPermission(context, permission),
      // Fallback for core-internal helpers. Plugin routes instead receive a
      // deferred createSubApp from PluginRouteRegistry (which mounts the sub-app
      // after the plugin defines its routes), so this immediate-mount variant is
      // only safe for callers that register routes before requests are served.
      createSubApp: (basePath) => {
        const child = new Hono()
        this.app.route(basePath, child)
        return child
      },
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

export function createCMS(config: CMSConfig): ViseedCMS {
  return new ViseedCMS(config)
}
