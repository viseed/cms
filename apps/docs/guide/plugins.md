# Plugin System

Plugins are the primary extension mechanism in Hana CMS. Each plugin can contribute database tables, API routes, hooks, and admin UI components.

---

## Using Plugins

Register plugins via `cms.use()` before calling `cms.launch()`:

```typescript
import { createCMS } from '@hanano/core'
import { authPlugin } from 'hanano-plugin-auth'
import { blogPlugin } from 'hanano-plugin-blog'
import { menuPlugin } from 'hanano-plugin-menu'
import { pagesPlugin } from 'hanano-plugin-pages'

const cms = createCMS({ db: { driver: 'postgres', url: process.env.DATABASE_URL! } })

cms.use(authPlugin())
cms.use(blogPlugin())
cms.use(menuPlugin())
cms.use(pagesPlugin())

const app = await cms.launch()
```

The order of `cms.use()` calls determines plugin initialization order.

---

## Built-in Plugins

| Package                | Function          | What it provides                                    |
|------------------------|-------------------|-----------------------------------------------------|
| `hanano-plugin-auth`    | `authPlugin()`    | User authentication, sessions, role management      |
| `hanano-plugin-blog`    | `blogPlugin()`    | Blog posts, categories, admin UI                    |
| `hanano-plugin-menu`    | `menuPlugin()`    | Navigation menus, admin UI, theme menu injection    |
| `hanano-plugin-pages`   | `pagesPlugin()`   | Standalone pages, TOC support, admin UI             |

Install what you need:

```bash
bun add hanano-plugin-auth hanano-plugin-blog hanano-plugin-menu hanano-plugin-pages
```

---

## Plugin Lifecycle

When `cms.launch()` is called, plugins go through the following lifecycle in order:

```
createCMS()
  └── cms.use(plugin)        ← register plugins

cms.launch()
  ├── createDatabase()       ← DB connection established
  ├── plugin.schema          ← all plugin tables merged
  ├── cms:init hook          ← HananoCMS instance available
  ├── plugin.routes()        ← Hono routes registered
  ├── plugin.admin           ← admin UI bundles registered
  └── cms:ready hook         ← Hono app fully ready
```

---

## Lifecycle Hooks

| Hook                    | Trigger                                      | Arguments                              |
|-------------------------|----------------------------------------------|----------------------------------------|
| `cms:init`              | After database connection is established     | `HananoCMS` instance                   |
| `cms:ready`             | After all routes are registered              | `Hono` app instance                    |
| `admin:register`        | When admin UI loads                          | `ComponentRegistry`                    |
| `theme:mount`           | When a theme is activated                    | `CMSTheme`                             |
| `theme:beforeRender`    | Before each page render                      | `layoutKey`, `data`, `requestContext`  |
| `theme:activate`        | When admin switches the active theme         | `CMSTheme`, previous `CMSTheme`        |
| `plugin:enabled`        | When a plugin is enabled via admin           | `pluginName`                           |
| `plugin:disabled`       | When a plugin is disabled via admin          | `pluginName`                           |

---

## Writing a Custom Plugin

```typescript
import type { CMSPlugin } from '@hanano/core'
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export function myPlugin(): CMSPlugin {
  return {
    name: 'my-plugin',
    version: '1.0.0',

    // Optional: Drizzle table definitions
    schema: {
      notes: pgTable('my_notes', {
        id: text('id').primaryKey(),
        content: text('content').notNull(),
        createdAt: timestamp('created_at').defaultNow(),
      }),
    },

    // Optional: lifecycle hooks
    hooks: {
      'cms:init': async (cms) => {
        console.log('my-plugin initializing...')
      },
      'cms:ready': async (app) => {
        console.log('CMS ready, routes are live')
      },
    },

    // Optional: Hono routes
    routes: (app, helpers) => {
      app.get('/api/my-plugin/hello', (c) => c.json({ message: 'Hello!' }))
    },
  }
}
```

### Plugin Schema

Plugin tables are passed directly as Drizzle table definitions. The CLI will auto-discover them when the plugin is installed as an `hanano-plugin-*` package.

### Plugin Routes

The `routes` function receives the Hono app and a `helpers` object with context utilities:

```typescript
routes: (app, helpers) => {
  app.get('/api/my-plugin/items', async (c) => {
    const { site, db } = helpers.resolveRequestContext(c)
    // site — current site (multi-site support)
    // db   — Drizzle database instance
    return c.json({ items: [] })
  })
}
```

### Admin UI

To add admin UI pages, provide a bundle path and menu items:

```typescript
admin: {
  menuItems: [
    { label: 'My Plugin', path: '/my-plugin', icon: 'puzzle' },
  ],
  bundlePath: new URL('./admin/dist/index.js', import.meta.url).pathname,
}
```

---

## Plugin `CMSPlugin` Interface

```typescript
interface CMSPlugin {
  name: string
  version: string
  schema?: Record<string, unknown>       // Drizzle tables
  hooks?: Partial<CMSPluginHooks>        // Lifecycle hooks
  routes?: (app: Hono, helpers: CMSRouteContextHelpers) => void
  lifecycle?: PluginLifecycle
  admin?: {
    menuItems?: PluginAdminMenuItem[]
    bundlePath?: string
  }
}
```
