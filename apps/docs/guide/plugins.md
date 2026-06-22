# Plugin System

Plugins are the primary extension mechanism in Viseed CMS. Each plugin can contribute database tables, API routes, hooks, and admin UI components.

---

## Using Plugins

Register plugins via `cms.use()` before calling `cms.launch()`:

```typescript
import { createCMS } from '@viseed/core'
import { authPlugin } from '@viseed/plugin-auth'
import { blogPlugin } from '@viseed/plugin-blog'
import { menuPlugin } from '@viseed/plugin-menu'
import { pagesPlugin } from '@viseed/plugin-pages'

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

| Package                          | Function          | What it provides                                    |
|----------------------------------|-------------------|-----------------------------------------------------|
| `@viseed/plugin-auth`            | `authPlugin()`    | User authentication, sessions, role management      |
| `@viseed/plugin-blog`            | `blogPlugin()`    | Blog posts, categories, admin UI                    |
| `@viseed/plugin-menu`            | `menuPlugin()`    | Navigation menus, admin UI, theme menu injection    |
| `@viseed/plugin-pages`           | `pagesPlugin()`   | Standalone pages, TOC support, admin UI             |
| `@viseed/plugin-common-widgets`  | `commonWidgetsPlugin()` | Built-in widget types (Tabs, Q&A)             |

Install what you need:

```bash
bun add @viseed/plugin-auth @viseed/plugin-blog @viseed/plugin-menu @viseed/plugin-pages
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
  ├── cms:init hook          ← ViseedCMS instance available
  ├── plugin.routes()        ← Hono routes registered
  ├── plugin.admin           ← admin UI bundles registered
  └── cms:ready hook         ← Hono app fully ready
```

---

## Lifecycle Hooks

| Hook                    | Trigger                                      | Arguments                              |
|-------------------------|----------------------------------------------|----------------------------------------|
| `cms:init`              | After database connection is established     | `ViseedCMS` instance                   |
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
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CMSPlugin } from '@viseed/types'
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function myPlugin(): CMSPlugin {
  return {
    name: 'my-plugin',
    version: '1.0.0',

    // Optional: Drizzle table definitions
    schema: {
      notes: pgTable('my_notes', {
        id: text('id').primaryKey(),
        content: text('content').notNull(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
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

Plugin tables are passed directly as Drizzle table definitions. The CLI will auto-discover them when the plugin is installed as a `@viseed/plugin-*` package.

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

---

## Admin UI

To add admin UI pages, compile a Vue component bundle and reference it from the plugin.

### Menu items

Each admin sidebar entry is declared as a `PluginAdminMenuItem`:

```typescript
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CMSPlugin } from '@viseed/types'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function myPlugin(): CMSPlugin {
  return {
    name: 'my-plugin',
    version: '1.0.0',
    admin: {
      menuItems: [
        {
          id: 'my-plugin',           // unique sidebar id
          label: 'My Plugin',        // sidebar label
          icon: '🔌',                // sidebar icon (emoji or text)
          path: '/my-plugin',        // admin route path
          order: 50,                 // lower = higher in sidebar (default 50)
          siteScoped: true,          // prefix path with /:siteId when true
          requiredPermissions: ['site.my-plugin.read'],
          componentExport: 'MyView', // named export in the admin bundle
        },
      ],
      bundlePath: resolve(__dirname, '../dist/admin/index.js'),
    },
  }
}
```

`bundlePath` must be the **absolute filesystem path** to the compiled admin ESM bundle.
Use `resolve(__dirname, ...)` — not `new URL(...).pathname` — to keep it cross-platform.

### Admin bundle structure

The admin bundle is a standard Vite library build. The entry file (`src/admin/index.ts`) must
**named-export every Vue component** referenced by `componentExport` in the menu items:

```typescript
// src/admin/index.ts
export { default as MyView } from './MyView.vue'
```

### Building the admin bundle

Create `build-admin.ts` at the plugin root and use the helper from `@viseed/core/build`:

```typescript
// build-admin.ts
import { buildPluginAdmin } from '@viseed/core/build'

await buildPluginAdmin()
```

`buildPluginAdmin()` pre-configures Vite with:
- Entry: `src/admin/index.ts`
- Output: `dist/admin/index.js` (ESM, CSS injected via JS)
- Externals: `vue`, `vue-router`

Add a script to `package.json`:

```json
{
  "scripts": {
    "build": "bunup && bun run build-admin.ts",
    "build:admin": "bun run build-admin.ts"
  }
}
```

To override any default (e.g. a custom entry path):

```typescript
await buildPluginAdmin({ entry: 'src/admin/main.ts' })
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
    menuItems: PluginAdminMenuItem[]
    bundlePath?: string                  // absolute path to compiled ESM bundle
  }
  widgets?: WidgetTypeDef[]              // widget types this plugin contributes
  public?: {
    bundlePath?: string                  // absolute path to compiled public ESM bundle
  }
}

interface PluginAdminMenuItem {
  id: string
  label: string
  icon: string
  path: string                           // admin route path, e.g. '/my-plugin'
  order?: number                         // lower = higher in sidebar; default 50
  siteScoped?: boolean
  requiredPermissions?: string[]
  componentExport?: string               // named export in admin bundle; derived from path if omitted
}
```
