# Getting Started

## Prerequisites

- [Bun](https://bun.sh) v1.3 or later
- [PostgreSQL](https://www.postgresql.org/) 14 or later

## Quick Start

The fastest way to create a new Viseed CMS project is with the `viseedbi` CLI.

```bash
bunx @viseed/cli init my-site
cd my-site
bun install
```

Set your database connection string:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/viseed"
```

Push the schema to your database and start the server:

```bash
bunx viseedbi db push
bun run dev
```

Your CMS is now running at `http://localhost:3000`.
The admin panel is available at `http://localhost:3000/admin`.

**Default admin credentials** (first run only):

| Field    | Value             |
|----------|-------------------|
| Email    | `admin@local.dev` |
| Password | `12345678`        |

::: tip Custom admin account
Override the defaults with environment variables before the first run:
```bash
export HANA_ADMIN_EMAIL="you@example.com"
export HANA_ADMIN_PASSWORD="secure-password"
export HANA_ADMIN_NAME="Admin"
```
:::

---

## Manual Setup

If you prefer to scaffold the project yourself instead of using the CLI:

```bash
mkdir my-site && cd my-site
bun init -y
bun add @viseed/core viseed-plugin-auth viseed-plugin-blog
bun add -d @viseed/cli
```

Create `src/index.ts`:

```typescript
import { createCMS } from '@viseed/core'
import { authPlugin } from 'viseed-plugin-auth'
import { blogPlugin } from 'viseed-plugin-blog'

const cms = createCMS({
  db: {
    driver: 'postgres',
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/viseed',
  },
  admin: {
    bootstrapAdmin:
      process.env.HANA_ADMIN_EMAIL && process.env.HANA_ADMIN_PASSWORD
        ? {
            email: process.env.HANA_ADMIN_EMAIL,
            password: process.env.HANA_ADMIN_PASSWORD,
            name: process.env.HANA_ADMIN_NAME ?? 'Administrator',
          }
        : undefined,
  },
})

cms.use(authPlugin())
cms.use(blogPlugin())

const app = await cms.launch()

export default {
  port: Number(process.env.PORT) || 3000,
  fetch: app.fetch,
}
```

Push schema and run:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/viseed"
bunx viseedbi db push
bun run src/index.ts
```

---

## Project Structure

A minimal Viseed CMS project looks like this:

```
my-site/
├── src/
│   └── index.ts       # Entry point — createCMS, plugins, themes
├── package.json
└── tsconfig.json
```

The CLI-generated project (`viseedbi init`) produces the same structure with sensible defaults already configured.

---

## Next Steps

- [Configuration](/guide/configuration) — all `CMSConfig` options
- [Plugin System](/guide/plugins) — add built-in and custom plugins
- [Themes](/guide/themes) — set up and switch themes
- [CLI Reference](/guide/cli) — all `viseedbi` commands
