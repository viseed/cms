# Database

Hana CMS uses Drizzle ORM for type-safe database access.

## Schema Merging

Plugins can define their own Drizzle tables. All schemas are automatically merged at startup:

```typescript
// Plugin defines its tables
export const blogSchema = {
  posts: sqliteTable('blog_posts', { ... }),
  categories: sqliteTable('blog_categories', { ... }),
}

// Core merges all plugin schemas into one
const finalSchema = mergeSchemas(coreSchema, blogSchema, mediaSchema)
```

## Core Tables

The core schema includes:

- `hana_users` — User accounts
- `hana_sessions` — Auth sessions
- `hana_installed_plugins` — Plugin registry

## Migrations

Run migrations using the CLI:

```bash
bunx hana migrate
```

This collects schemas from all installed plugins and generates/applies Drizzle migrations.
