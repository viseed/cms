# Contributing to Viseed CMS

Thank you for considering a contribution to Viseed CMS. This guide covers everything you need to get the monorepo running locally, understand the codebase layout, and submit a quality pull request.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Project Structure](#project-structure)
- [Dependency Graph](#dependency-graph)
- [Development Workflow](#development-workflow)
- [Contributing a Feature or Bug Fix](#contributing-a-feature-or-bug-fix)
- [Adding a New Package or Plugin](#adding-a-new-package-or-plugin)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Versioning & Publishing](#versioning--publishing)

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| [Bun](https://bun.sh) | ≥ 1.3 | **Required** — this is the only supported runtime and package manager |
| [Git](https://git-scm.com) | Any recent | — |
| [PostgreSQL](https://www.postgresql.org) | ≥ 15 | Required for integration tests and local dev database |

> **Do not use Node.js, npm, pnpm, or yarn.** The project is built exclusively on the Bun runtime and Bun workspaces. Using another package manager will break the lockfile and workspace resolution.

---

## Environment Setup

```bash
# 1. Clone the repository
git clone https://github.com/viseed/cms.git
cd cms

# 2. Install all dependencies (all workspaces)
bun install

# 3. Copy the environment template and fill in your values
cp apps/starter/.env.example apps/starter/.env

# 4. Push the database schema to your local PostgreSQL instance
bun run db:push

# 5. Start the full development stack
bun run dev
```

### What `bun run dev` starts

| Process | URL | Description |
|---------|-----|-------------|
| `@viseed/admin` (Vite) | http://localhost:5173 | Admin SPA in hot-reload mode |
| `@viseed/starter` (Bun) | http://localhost:3000 | Example app — Hono server with CMS mounted |
| `@viseed/schema` (watch) | — | Drizzle schema type-gen on change |
| `@viseed/types` (watch) | — | TypeScript declarations on change |
| `@viseed/validator` (watch) | — | Zod schemas on change |
| `@viseed/core` (watch) | — | Core package rebuild on change |

> Running documentation separately: `bun run dev:docs` → http://localhost:5174

---

## Project Structure

```
viseed-cms/
│
├── packages/                   # Core library packages (published to npm)
│   ├── viseed/                 # @viseed/cms        — Umbrella re-export + CLI bin
│   ├── types/                  # @viseed/types      — TypeScript interfaces only
│   ├── validator/              # @viseed/validator  — Zod validation schemas
│   ├── schema/                 # @viseed/schema     — Drizzle base tables + mergeSchemas()
│   ├── registry/               # @viseed/registry   — Plugin marketplace client
│   ├── ui/                     # @viseed/ui         — Vue component registry
│   ├── core/                   # @viseed/core       — ViseedCMS engine, HookRegistry, DB
│   ├── cli/                    # @viseed/cli        — `viseed` CLI commands
│   └── config/                 # @viseed/config     — Shared tsconfig (private, not published)
│
├── plugins/                    # Official plugins (published to npm)
│   ├── plugin-auth/            # @viseed/plugin-auth
│   ├── plugin-blog/            # @viseed/plugin-blog
│   ├── plugin-media/           # @viseed/plugin-media (compat shim)
│   ├── plugin-menu/            # @viseed/plugin-menu
│   ├── plugin-pages/           # @viseed/plugin-pages
│   └── plugin-common-widgets/  # @viseed/plugin-common-widgets
│
├── themes/                     # Built-in themes (published to npm)
│   ├── theme-blog/             # @viseed/theme-blog
│   └── theme-insurance/        # @viseed/theme-insurance
│
├── apps/                       # Private applications (not published)
│   ├── admin/                  # Vue 3 SPA — build output goes to core/dist/admin
│   ├── docs/                   # VitePress documentation site
│   └── starter/                # End-user starter template
│
├── scripts/                    # Release and deploy scripts
│   └── publish-packages.ts     # Custom publish wrapper (see Versioning section)
│
├── turbo.json                  # Turborepo task pipeline
├── biome.json                  # Linter / formatter config
└── bunup.config.ts             # Build config for library packages
```

### Key Entry Points

| File | Description |
|------|-------------|
| `packages/core/src/viseed-cms.ts` | `ViseedCMS` class — the main engine |
| `packages/core/src/hook-registry.ts` | `HookRegistry` — plugin hook system |
| `packages/types/src/plugin.ts` | `CMSPlugin` interface contract |
| `packages/types/src/cms.ts` | `CMSConfig` shape |
| `packages/types/src/theme.ts` | `CMSTheme` interface contract |
| `packages/schema/src/schema-builder.ts` | `mergeSchemas()` — merge plugin schemas |
| `packages/core/src/build.ts` | `buildPluginAdmin()` / `buildPluginPublic()` helpers |
| `packages/cli/src/commands/db.ts` | `viseed db push/generate/migrate` |

---

## Dependency Graph

This graph defines **which package may import from which**. Violating it creates circular dependencies and breaks the build.

```
@viseed/config      (no imports — tsconfig only)

@viseed/types       (no @viseed/* imports)
        ↑
        └── everything imports from here

@viseed/validator   ← @viseed/types
@viseed/schema      ← @viseed/types
@viseed/registry    ← @viseed/types

@viseed/core        ← @viseed/types, @viseed/validator, @viseed/schema, @viseed/registry
@viseed/ui          ← @viseed/types, @viseed/registry

@viseed/cli         ← @viseed/core

@viseed/plugin-*    ← @viseed/types, @viseed/core, @viseed/validator
                       (plugins must NOT import each other)

@viseed/theme-*     ← @viseed/types ONLY
                       (themes must NOT import @viseed/core, @viseed/schema, or any plugin)

@viseed/cms         ← everything above
apps/*              ← anything (leaf nodes)
```

### Hard Rules

| Rule | Reason |
|------|--------|
| `@viseed/types` imports nothing from `@viseed/*` | It is the foundation — any import would create a cycle |
| `@viseed/schema` does NOT import `@viseed/core` | core imports schema, not the reverse |
| Plugins do NOT import each other | Prevents tight coupling; use hooks for cross-plugin communication |
| Themes import ONLY `@viseed/types` | Themes are pure presentation; they must not depend on business logic |
| Plugins do NOT instantiate `new Hono()` | Use `helpers.createSubApp(basePath)` provided by core |

---

## Development Workflow

### Building

```bash
bun run build              # Build all packages (excludes docs)
bun run build:plugins      # Build plugin packages only
bun run dev:docs           # Build and serve docs
```

Library packages use **bunup** (not tsup, rollup, or tsc directly). Plugin admin/public bundles use **Vite** via the `buildPluginAdmin()` / `buildPluginPublic()` helpers from `@viseed/core/build`.

### Linting & Formatting

```bash
bun run lint               # Check all files with Biome
bun run lint:fix           # Auto-fix lint issues
bun run format             # Auto-format all files
```

The project uses **Biome v2** — it replaces both ESLint and Prettier. Do not add `.eslintrc` or `.prettierrc` files.

**Code style enforced by Biome:**
- 2-space indentation
- Single quotes
- No semicolons (except where required by the language)
- Max line width: 100

### Testing

```bash
bun test                   # Run all tests
bun test --watch           # Watch mode
bun run test:unit          # Unit tests only (via Turborepo filter)
bun run test:integration   # Integration tests only
```

Tests use **bun test** (built-in, Jest-compatible API). Do not use Vitest, Jest, or Mocha.

See the [Testing](#testing) section for test organisation conventions.

---

## Contributing a Feature or Bug Fix

This section walks you through the complete lifecycle of a contribution — from forking the repo to getting your PR merged. If you are new to open source, read this carefully before opening a PR.

### Step 1 — Fork and clone

If you are an external contributor, fork the repository first. If you have been added as a collaborator, clone directly.

```bash
# External contributor: fork on GitHub first, then clone your fork
git clone https://github.com/<your-username>/cms.git
cd cms

# Add the upstream remote so you can stay up to date
git remote add upstream https://github.com/viseed/cms.git

# Internal collaborator: clone directly
git clone https://github.com/viseed/cms.git
cd cms
```

### Step 2 — Keep your fork up to date

Before starting any new work, sync with the latest `master`:

```bash
git checkout master
git pull upstream master   # or: git pull origin master (collaborators)
```

### Step 3 — Create a branch

Branch off `master` with a short, descriptive name. Use the prefixes below:

| Prefix | When to use |
|--------|-------------|
| `feat/` | New feature or enhancement |
| `fix/` | Bug fix |
| `docs/` | Documentation only |
| `refactor/` | Code change with no feature or fix |
| `chore/` | Tooling, config, CI, dependencies |
| `test/` | Adding or fixing tests |

```bash
git checkout -b feat/plugin-hook-system
git checkout -b fix/admin-login-redirect
```

### Step 4 — Make your changes

- Follow the [Coding Standards](#coding-standards) section.
- Keep commits focused. Each commit should represent one logical change.
- You do not need perfectly clean commits at this stage — squash happens on merge.

```bash
git add .
git commit -m "feat: add onBeforeRender hook to plugin registry"
```

### Step 5 — Run all checks locally

Make sure everything passes before pushing. CI will run the same checks.

```bash
bun run lint        # Must produce zero errors
bun test            # All tests must pass
bun run build       # Build must succeed
```

If `lint:fix` can resolve issues automatically:

```bash
bun run lint:fix
bun run format
```

### Step 6 — Add a changeset (required for published packages)

If your change affects any package published to npm (anything under `packages/`, `plugins/`, or `themes/` that is not `private: true`), you must include a changeset.

```bash
bun run changeset
```

The interactive CLI will ask:
1. **Which packages changed?** — use `space` to toggle, `enter` to confirm.
2. **Bump type?** — `patch` for bug fixes, `minor` for new features, `major` for breaking changes.
3. **Summary** — write a short user-facing description. This becomes the changelog entry.

A file is created under `.changeset/`. Commit it alongside your code:

```bash
git add .changeset/
git commit -m "chore: add changeset for plugin hook system"
```

> If your change is docs-only, a CI config tweak, or affects only private packages (`@viseed/admin`, `@viseed/docs`, `@viseed/starter`, `@viseed/config`), **skip this step**.

### Step 7 — Push and open a pull request

```bash
git push -u origin feat/plugin-hook-system
```

Then open a pull request on GitHub against the `master` branch.

**PR title format** — use the same prefix as your branch:

```
feat: add onBeforeRender hook to plugin registry
fix: admin login redirect after session expiry
docs: clarify plugin setup order in CONTRIBUTING
```

**PR description should include:**
- What changed and why (not just what the diff shows).
- Any breaking changes, with a migration note.
- How to test the change manually if automated tests do not cover it.
- Screenshots or logs for UI or CLI changes.

### Step 8 — Respond to review feedback

- Address each review comment with either a code change or a reply explaining your reasoning.
- Push new commits to the same branch — the PR updates automatically.
- Once all comments are resolved, re-request review if needed.
- A maintainer will squash and merge your PR when it is approved.

### Step 9 — After your PR is merged

```bash
# Pull the latest master
git checkout master
git pull upstream master

# Delete your local branch (it is no longer needed)
git branch -d feat/plugin-hook-system
```

---

## Adding a New Package or Plugin

### New core package (`packages/`)

1. Create the directory and `package.json` with scope `@viseed/<name>`.
2. Add the package to the dependency graph section above and to `.cursor/rules/03-package-map.mdc` and `.cursor/rules/04-dependency-rules.mdc`.
3. Use `"private": true` if it should not be published (like `@viseed/config`).
4. Reference it from other packages using `"workspace:*"`.

### New official plugin (`plugins/`)

1. Scaffold the plugin directory:
   ```
   plugins/plugin-<name>/
   ├── src/
   │   └── index.ts         # exports pluginFactory(): CMSPlugin
   ├── package.json
   └── bunup.config.ts
   ```

2. `package.json` must declare:
   - `@viseed/core`, `drizzle-orm`, and (if used) `@viseed/validator` as **`peerDependencies`** and mirrored in `devDependencies`.
   - `hono` as `devDependency` only (type-only import — use `helpers.createSubApp()`).
   - `@viseed/types` as a regular `dependency`.

3. Do **not** create a `new Hono()` instance inside a plugin. Example:
   ```typescript
   // ✅ Correct
   export function myPlugin(): CMSPlugin {
     return {
       name: 'my-plugin',
       setup(cms, helpers) {
         const app = helpers.createSubApp('/my-plugin')
         app.get('/hello', (c) => c.json({ ok: true }))
       }
     }
   }

   // ❌ Wrong — creates an isolated Hono instance not mounted on the CMS router
   import { Hono } from 'hono'
   const app = new Hono()
   ```

4. If the plugin registers DB tables, extend `coreSchema` via `mergeSchemas()` — do not create standalone Drizzle instances.

5. Update `.cursor/rules/03-package-map.mdc` with the new plugin entry.

### New theme (`themes/`)

1. Themes export a factory function `myTheme(): CMSTheme`.
2. Themes may only import from `@viseed/types`. They must not import from `@viseed/core`, `@viseed/schema`, or any plugin.
3. Templates use [Eta](https://eta.js.org) (`.eta` files).
4. Update `.cursor/rules/03-package-map.mdc`.

---

## Coding Standards

- **TypeScript** everywhere. No `.js` source files in packages.
- Use `import type` when you only need a type at compile time — avoids unnecessary runtime dependencies.
- Prefer `async/await` over raw Promise chains.
- Handle errors explicitly — never swallow errors silently.
- Avoid magic numbers and magic strings; use named constants.
- Keep functions focused on one responsibility.
- Do not commit commented-out code.

### Workspace References

Always use `workspace:*` for internal package references in `package.json`:

```json
{
  "dependencies": {
    "@viseed/types": "workspace:*"
  }
}
```

The publish script (`scripts/publish-packages.ts`) resolves `workspace:*` to real version numbers before publishing, then restores them for local dev.

---

## Testing

### File naming

| Type | Pattern | Location |
|------|---------|---------|
| Unit test | `*.test.ts` | Alongside the source file |
| Integration test | `*.integration.test.ts` | Alongside the source file |

### Guidelines

- Unit tests should be pure — no real DB, no real filesystem, no real network.
- Integration tests that require a database must use a dedicated test database (never the production one). Set `TEST_DATABASE_URL` in your `.env`.
- New validators, hooks, and pure logic functions should have unit tests **before** the implementation (TDD).
- Test the public API of a module, not its internal implementation details.

---

## Submitting a Pull Request

1. **Fork** the repository and create a feature branch from `master`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. Make your changes, following the coding standards above.

3. Ensure all checks pass locally:
   ```bash
   bun run lint
   bun test
   bun run build
   ```

4. **Create a changeset** if your change affects any published package:
   ```bash
   bun run changeset
   ```
   Select the affected packages and choose the correct bump type (`patch`, `minor`, or `major`).

5. Push and open a pull request against `master`. Describe:
   - **What** changed and **why**.
   - Any breaking changes.
   - How to test the change manually if automated tests do not cover it.

6. A maintainer will review within a few business days. Address review comments promptly; stale PRs (no activity for 30 days) may be closed.

---

## Versioning

Viseed CMS uses [Changesets](https://github.com/changesets/changesets) to track version bumps. As a contributor, **your only responsibility is to include a changeset in your PR** if your change affects any published package.

```bash
bun run changeset
```

Select the affected packages and choose the appropriate bump type:

| Bump | When to use |
|------|-------------|
| `patch` | Bug fix, no API change |
| `minor` | New feature, backward-compatible |
| `major` | Breaking change |

The changeset file (auto-generated in `.changeset/`) should be committed alongside your code changes. Maintainers handle the actual version bump and npm publish after merging.

---

## Questions?

Open a [GitHub Discussion](https://github.com/viseed/cms/discussions) for general questions, or a [GitHub Issue](https://github.com/viseed/cms/issues) for bugs and feature requests.
