# CLI Reference

The `hanabi` CLI is the companion tool for Hana CMS projects. It handles project scaffolding, database management, and plugin/theme management.

## Installation

The CLI is available as `@hanano/cli`. You can use it without installing via `bunx`:

```bash
bunx hanabi <command>
```

Or install it as a dev dependency in your project:

```bash
bun add -d @hanano/cli
```

---

## `hanabi init`

Scaffold a new Hana CMS project.

```bash
hanabi init <project-name>
```

**Example:**

```bash
bunx hanabi init my-blog
cd my-blog
bun install
```

Creates the following structure:

```
my-blog/
├── src/
│   └── index.ts     # Entry point with createCMS, authPlugin, blogPlugin
├── package.json
└── tsconfig.json
```

The generated `src/index.ts` is pre-configured with `authPlugin` and `blogPlugin`, using `HANA_ADMIN_EMAIL` / `HANA_ADMIN_PASSWORD` env vars for the initial admin account.

---

## `hanabi db`

Manage your database schema using Drizzle.

All `db` subcommands require `DATABASE_URL` to be set:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/hana"
```

### `hanabi db push`

Push the current schema directly to the database. Intended for **development only**.

```bash
bunx hanabi db push
```

- Fast — no migration files generated
- May drop or alter columns to match the schema
- Not safe for production databases with live data

### `hanabi db generate`

Generate SQL migration files from the current schema. Intended for **production**.

```bash
bunx hanabi db generate
```

- Creates timestamped `.sql` files in `drizzle/`
- Safe to review and commit to source control
- Does not apply changes to the database

### `hanabi db migrate`

Apply pending migration files to the database.

```bash
bunx hanabi db migrate
```

- Reads migration files from `drizzle/`
- Safe for production — applies only new migrations
- Requires migration files to exist (run `db generate` first)

### How it works

The CLI scans your `package.json` for `hanano-plugin-*` dependencies and auto-generates a schema barrel file at `.hana/_schema.ts`. This file is used by `drizzle-kit` to run the requested operation. The `.hana/` directory is automatically added to `.gitignore`.

---

## `hanabi plugin`

Manage plugins in your project.

### `hanabi plugin install`

```bash
hanabi plugin install <package-name>
```

Installs the package via `bun add` and prints a reminder to restart the server.

**Example:**

```bash
bunx hanabi plugin install hanano-plugin-pages
```

After installing, register the plugin in your `src/index.ts`:

```typescript
import { pagesPlugin } from 'hanano-plugin-pages'
cms.use(pagesPlugin())
```

Then push the updated schema:

```bash
bunx hanabi db push   # development
# or
bunx hanabi db generate && bunx hanabi db migrate   # production
```

### `hanabi plugin uninstall`

```bash
hanabi plugin uninstall <package-name>
```

Removes the package via `bun remove`.

---

## `hanabi theme`

Manage themes in your project.

### `hanabi theme install`

```bash
hanabi theme install <package-name>
```

**Example:**

```bash
bunx hanabi theme install hanano-theme-blog
```

After installing, register the theme in your config:

```typescript
import { blogTheme } from 'hanano-theme-blog'

const cms = createCMS({
  themes: [blogTheme()],
  defaultTheme: 'blog',
  // ...
})
```

### `hanabi theme uninstall`

```bash
hanabi theme uninstall <package-name>
```

---

## Command Summary

| Command                                   | Description                             |
|-------------------------------------------|-----------------------------------------|
| `hanabi init <name>`                      | Scaffold a new project                  |
| `hanabi db push`                          | Push schema to DB (dev)                 |
| `hanabi db generate`                      | Generate SQL migration files (prod)     |
| `hanabi db migrate`                       | Apply pending migrations (prod)         |
| `hanabi plugin install <package>`         | Install a plugin                        |
| `hanabi plugin uninstall <package>`       | Uninstall a plugin                      |
| `hanabi theme install <package>`          | Install a theme                         |
| `hanabi theme uninstall <package>`        | Uninstall a theme                       |
