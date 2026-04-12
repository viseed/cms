# Database

Hana CMS uses **PostgreSQL** with **Drizzle ORM** for type-safe database access.

## Schema Merging

Plugins can define their own Drizzle tables using `pgTable`. All schemas are automatically merged at startup:

```typescript
// Plugin defines its tables
export const blogSchema = {
  posts: pgTable('blog_posts', { ... }),
  categories: pgTable('blog_categories', { ... }),
}

// Core merges all plugin schemas into one
const finalSchema = mergeSchemas(coreSchema, blogSchema, mediaSchema)
```

## Core Tables

The core schema includes:

- `hana_users` — User accounts
- `hana_sessions` — Auth sessions
- `hana_sites` — Multi-site support
- `hana_installed_plugins` — Plugin registry
- `hana_installed_themes` — Theme registry
- `hana_theme_state` — Active theme state

## Schema Management

Use the Hana CLI to manage your database schema:

```bash
# Development — push schema directly to database
bunx hanabi db push

# Production — generate SQL migration files
bunx hanabi db generate

# Production — apply pending migrations
bunx hanabi db migrate
```

The CLI automatically discovers schemas from all installed `@hana/plugin-*` packages and generates a temporary barrel file for `drizzle-kit` to consume.

## Custom Schemas

If your application defines additional Drizzle tables beyond what plugins provide, register them in `hana.config.ts`:

```typescript
// hana.config.ts
import { myCustomSchema } from './src/schema'

export default {
  extraSchemas: ['./src/schema.ts'],
}
```

These will be included when running `hanabi db` commands.
