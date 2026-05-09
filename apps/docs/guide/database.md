# Database

Hana CMS uses **PostgreSQL** with **Drizzle ORM** for type-safe database access. The connection is managed via Bun's built-in SQL driver (`bun:sql`), so no separate PostgreSQL client package is needed.

::: warning PostgreSQL only
Only PostgreSQL is supported. Other databases (MySQL, SQLite, etc.) are not compatible.
:::

---

## Connection

Provide your connection string via `DATABASE_URL` or directly in the config:

```typescript
const cms = createCMS({
  db: {
    driver: 'postgres',
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/hana',
  },
})
```

Connection string format:

```
postgresql://[user]:[password]@[host]:[port]/[database]
```

For managed databases with SSL (e.g. DigitalOcean, Supabase):

```
postgresql://user:pass@host:5432/db?sslmode=verify-full&sslrootcert=./ca-certificate.crt
```

---

## Schema Management

Use the `hanabi db` commands to manage your database schema. The CLI automatically discovers the core schema plus schemas from all installed `hanano-plugin-*` packages.

### Development

Push your current schema directly to the database. This is the fastest way to iterate during development — no migration files are generated.

```bash
bunx hanabi db push
```

::: warning
`db push` may drop columns or alter tables to match the schema. Do not use in production.
:::

### Production

Generate SQL migration files that can be reviewed and committed to source control:

```bash
bunx hanabi db generate
```

Apply pending migrations to the database:

```bash
bunx hanabi db migrate
```

The recommended production workflow:

```bash
# 1. Generate migration files (in CI or locally)
bunx hanabi db generate

# 2. Review generated files in drizzle/
git add drizzle/
git commit -m "feat: add migration"

# 3. Apply migrations on the server
bunx hanabi db migrate
```

---

## Core Tables

The following tables are created by Hana CMS core:

| Table               | Description                                       |
|---------------------|---------------------------------------------------|
| `sites`             | Site definitions (supports multi-site)            |
| `site_domains`      | Domain mapping per site                           |
| `users`             | User accounts                                     |
| `user_site_roles`   | Role assignments per user per site                |
| `sessions`          | Auth sessions                                     |
| `installed_plugins` | Plugin registry (enabled plugins per site)        |
| `installed_themes`  | Theme registry (installed themes per site)        |
| `theme_state`       | Active theme state per site                       |
| `media_files`       | Uploaded media files                              |

Plugin tables are prefixed by the plugin name, e.g. `blog_posts`, `blog_categories`, `menu_items`.

---

## Schema Merging

Plugins contribute their own Drizzle table definitions. All plugin schemas are merged with the core schema at startup:

```typescript
// Internally handled by createCMS — you don't call this directly
const finalSchema = mergeSchemas(coreSchema, ...pluginSchemas)
```

When running `hanabi db` commands, the CLI scans your `package.json` for `hanano-plugin-*` dependencies and auto-generates a schema barrel file to feed into `drizzle-kit`.

---

## Custom Schemas

If your application defines additional Drizzle tables beyond what plugins provide, register them in `hana.config.ts` at the project root:

```typescript
// hana.config.ts
export default {
  extraSchemas: ['./src/schema.ts'],
}
```

These will be included when running any `hanabi db` command.

Example custom schema:

```typescript
// src/schema.ts
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const mySchema = {
  subscriptions: pgTable('subscriptions', {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  }),
}
```
