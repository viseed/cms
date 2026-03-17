import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import type { CMSConfig, CMSPlugin } from '@hanabi/types'
import { HookRegistry } from './hook-registry'
import { createDatabase, type DatabaseInstance } from './database'

export class HanabiCMS {
  private app: Hono
  private plugins: CMSPlugin[] = []
  private hooks = new HookRegistry()
  private db: DatabaseInstance | null = null
  private config: CMSConfig

  constructor(config: CMSConfig) {
    this.config = config
    this.app = new Hono()

    if (config.plugins) {
      for (const plugin of config.plugins) {
        this.use(plugin)
      }
    }
  }

  use(plugin: CMSPlugin): HanabiCMS {
    this.plugins.push(plugin)

    if (plugin.hooks) {
      for (const [hookName, handler] of Object.entries(plugin.hooks)) {
        if (handler) {
          this.hooks.register(
            hookName as Parameters<HookRegistry['register']>[0],
            handler,
          )
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

  getApp(): Hono {
    return this.app
  }

  private setupAdminServing(): void {
    const adminConfig = this.config.admin ?? { enabled: true, path: '/admin' }
    if (!adminConfig.enabled) return

    const adminPath = adminConfig.path ?? '/admin'

    this.app.get(`${adminPath}/*`, serveStatic({ root: './admin' }))
    this.app.get(adminPath, serveStatic({ path: './admin/index.html' }))
  }
}

export function createCMS(config: CMSConfig): HanabiCMS {
  return new HanabiCMS(config)
}
