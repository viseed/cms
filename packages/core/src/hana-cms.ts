import { resolve } from 'node:path'
import type { CMSConfig, CMSPlugin, CMSTheme } from '@hana/types'
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { createDatabase, type DatabaseInstance } from './database'
import { HookRegistry } from './hook-registry'
import { createThemeRuntime, type ThemeRuntime } from './theme-runtime'

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
        plugin.routes(this.app)
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

  private async mountTheme(): Promise<void> {
    const theme = this.config.theme
    if (!theme) return

    this.themeRuntime = createThemeRuntime(theme, this)

    this.setupThemeStaticAssets(theme)
    this.setupThemeRoutes(theme)

    await this.hooks.run('theme:mount', theme)
  }

  private setupThemeStaticAssets(theme: CMSTheme): void {
    const staticDir = theme.assets?.staticDir
    if (!staticDir) return

    const resolvedDir = resolve(process.cwd(), staticDir)

    this.app.get(
      '/theme/static/*',
      serveStatic({
        root: resolvedDir,
        rewriteRequestPath: (path) => path.replace('/theme/static', ''),
      }),
    )
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

        const html = await runtime.renderLayout(layoutKey, {
          data,
          settings: {},
          menus: {},
          request: {
            url: c.req.url,
            params: c.req.param() as Record<string, string>,
          },
        })

        return c.html(html)
      })
    }
  }

  private setupAdminApi(): void {
    const adminApi = new Hono()

    adminApi.get('/plugins', (c) => {
      const plugins = this.plugins.map((plugin) => ({
        name: plugin.name,
        version: plugin.version,
        description: `${plugin.name} plugin`,
        installed: true,
        type: 'official' as const,
      }))

      return c.json(plugins)
    })

    adminApi.post('/plugins/:name/install', (c) => {
      const name = c.req.param('name')

      return c.json({
        message: `Plugin "${name}" installation is not implemented yet.`,
        plugin: name,
        requiresRestart: true,
      })
    })

    adminApi.post('/plugins/:name/uninstall', (c) => {
      const name = c.req.param('name')

      return c.json({
        message: `Plugin "${name}" uninstallation is not implemented yet.`,
        plugin: name,
        requiresRestart: true,
      })
    })

    this.app.route('/api/admin', adminApi)
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

    console.log(`Admin UI serving at http://localhost:${this.config.server?.port ?? 3000}${adminPath}`)
  }
}

export function createCMS(config: CMSConfig): HanaCMS {
  return new HanaCMS(config)
}
