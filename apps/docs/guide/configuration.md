# Configuration

All configuration is passed to `createCMS()` as a single `CMSConfig` object.

```typescript
import { createCMS } from '@viseed/core'

const cms = createCMS({
  db: { driver: 'postgres', url: process.env.DATABASE_URL! },
  admin: { ... },
  plugins: [],
  themes: [],
  server: { port: 3000 },
  media: { uploadDir: './uploads', maxFileSizeMb: 10 },
})
```

---

## `db` (required)

Database connection settings.

```typescript
db: {
  driver: 'postgres'  // Only PostgreSQL is supported
  url: string         // Full connection string
}
```

**Example:**

```typescript
db: {
  driver: 'postgres',
  url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/viseed',
}
```

Set `DATABASE_URL` as an environment variable rather than hardcoding it in source.

---

## `admin`

Admin panel settings.

```typescript
admin?: {
  path?: string              // URL path for the admin panel. Default: '/admin'
  enabled?: boolean          // Whether to mount the admin panel. Default: true
  bootstrapAdmin?: {
    email: string            // Email for the initial admin account
    password: string         // Password for the initial admin account
    name?: string            // Display name. Default: 'Administrator'
    siteId?: string          // Specific site to create the admin for (multi-site)
  }
}
```

`bootstrapAdmin` only creates the account if no admin user exists yet — safe to leave in production config.

**Example:**

```typescript
admin: {
  bootstrapAdmin: {
    email: process.env.HANA_ADMIN_EMAIL ?? 'admin@local.dev',
    password: process.env.HANA_ADMIN_PASSWORD ?? '12345678',
    name: process.env.HANA_ADMIN_NAME ?? 'Administrator',
  },
},
```

---

## `plugins`

Array of plugin instances to register at startup. Plugins can also be registered via `cms.use()` before `cms.launch()`.

```typescript
plugins?: CMSPlugin[]
```

Both approaches are equivalent:

```typescript
// Option A — via config
const cms = createCMS({ ..., plugins: [authPlugin(), blogPlugin()] })

// Option B — via cms.use()
const cms = createCMS({ ... })
cms.use(authPlugin())
cms.use(blogPlugin())
```

See the [Plugin System](/guide/plugins) guide for details.

---

## `themes` and `defaultTheme`

Register one or more themes. The active theme is stored in the database and can be changed via the admin panel.

```typescript
themes?: CMSTheme[]          // All available themes
defaultTheme?: string        // Name of the theme to use when none is set in DB
```

**Example:**

```typescript
import { blogTheme } from 'viseed-theme-blog'
import { insuranceTheme } from 'viseed-theme-insurance'

const cms = createCMS({
  ...,
  themes: [blogTheme(), insuranceTheme()],
  defaultTheme: 'blog',
})
```

`theme` (singular) is also accepted as shorthand when you only have one theme:

```typescript
theme: blogTheme(),
```

See the [Themes](/guide/themes) guide for details.

---

## `server`

HTTP server settings.

```typescript
server?: {
  port?: number       // Default: 3000
  hostname?: string   // Default: '0.0.0.0'
}
```

The `PORT` environment variable takes precedence over `server.port` when using the standard `Bun.serve()` pattern from the starter template.

---

## `media`

Media upload settings.

```typescript
media?: {
  uploadDir?: string      // Directory to store uploaded files. Default: './uploads'
  maxFileSizeMb?: number  // Maximum upload size in megabytes. Default: 10
}
```

**Example:**

```typescript
media: {
  uploadDir: './uploads',
  maxFileSizeMb: 20,
},
```

See the [Media](/guide/media) guide for the full upload API.

---

## Environment Variables

| Variable              | Used by             | Description                          |
|-----------------------|---------------------|--------------------------------------|
| `DATABASE_URL`        | `db.url`            | PostgreSQL connection string         |
| `PORT`                | `Bun.serve()`       | HTTP server port (default `3000`)    |
| `HANA_ADMIN_EMAIL`    | `bootstrapAdmin`    | Initial admin email                  |
| `HANA_ADMIN_PASSWORD` | `bootstrapAdmin`    | Initial admin password               |
| `HANA_ADMIN_NAME`     | `bootstrapAdmin`    | Initial admin display name           |

Create a `.env` file at the project root for local development:

```bash
DATABASE_URL=postgresql://postgres:admin@localhost:5432/viseed
PORT=3000
HANA_ADMIN_EMAIL=admin@local.dev
HANA_ADMIN_PASSWORD=12345678
```
