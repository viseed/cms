# CLI Reference

The `viseedbi` CLI is the companion tool for Viseed CMS projects. It handles project scaffolding, database management, and plugin/theme management.

## Installation

The CLI is available as `@viseed/cli`. You can use it without installing via `bunx`:

```bash
bunx viseedbi <command>
```

Or install it as a dev dependency in your project:

```bash
bun add -d @viseed/cli
```

---

## `viseedbi init`

Scaffold a new Viseed CMS project.

```bash
viseedbi init <project-name>
```

**Example:**

```bash
bunx viseedbi init my-blog
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

## `viseedbi db`

Manage your database schema using Drizzle.

All `db` subcommands require `DATABASE_URL` to be set:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/viseed"
```

### `viseedbi db push`

Push the current schema directly to the database. Intended for **development only**.

```bash
bunx viseedbi db push
```

- Fast — no migration files generated
- May drop or alter columns to match the schema
- Not safe for production databases with live data

### `viseedbi db generate`

Generate SQL migration files from the current schema. Intended for **production**.

```bash
bunx viseedbi db generate
```

- Creates timestamped `.sql` files in `drizzle/`
- Safe to review and commit to source control
- Does not apply changes to the database

### `viseedbi db migrate`

Apply pending migration files to the database.

```bash
bunx viseedbi db migrate
```

- Reads migration files from `drizzle/`
- Safe for production — applies only new migrations
- Requires migration files to exist (run `db generate` first)

### How it works

The CLI scans your `package.json` for `viseed-plugin-*` dependencies and auto-generates a schema barrel file at `.viseed/_schema.ts`. This file is used by `drizzle-kit` to run the requested operation. The `.viseed/` directory is automatically added to `.gitignore`.

---

## `viseedbi plugin`

Manage plugins in your project.

### `viseedbi plugin install`

```bash
viseedbi plugin install <package-name>
```

Installs the package via `bun add` and prints a reminder to restart the server.

**Example:**

```bash
bunx viseedbi plugin install viseed-plugin-pages
```

After installing, register the plugin in your `src/index.ts`:

```typescript
import { pagesPlugin } from 'viseed-plugin-pages'
cms.use(pagesPlugin())
```

Then push the updated schema:

```bash
bunx viseedbi db push   # development
# or
bunx viseedbi db generate && bunx viseedbi db migrate   # production
```

### `viseedbi plugin uninstall`

```bash
viseedbi plugin uninstall <package-name>
```

Removes the package via `bun remove`.

---

## `viseedbi theme`

Manage themes in your project.

### `viseedbi theme install`

```bash
viseedbi theme install <package-name>
```

**Example:**

```bash
bunx viseedbi theme install viseed-theme-blog
```

After installing, register the theme in your config:

```typescript
import { blogTheme } from 'viseed-theme-blog'

const cms = createCMS({
  themes: [blogTheme()],
  defaultTheme: 'blog',
  // ...
})
```

### `viseedbi theme uninstall`

```bash
viseedbi theme uninstall <package-name>
```

---

## Command Summary

| Command                                   | Description                             |
|-------------------------------------------|-----------------------------------------|
| `viseedbi init <name>`                      | Scaffold a new project                  |
| `viseedbi db push`                          | Push schema to DB (dev)                 |
| `viseedbi db generate`                      | Generate SQL migration files (prod)     |
| `viseedbi db migrate`                       | Apply pending migrations (prod)         |
| `viseedbi plugin install <package>`         | Install a plugin                        |
| `viseedbi plugin uninstall <package>`       | Uninstall a plugin                      |
| `viseedbi theme install <package>`          | Install a theme                         |
| `viseedbi theme uninstall <package>`        | Uninstall a theme                       |
