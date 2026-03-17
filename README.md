# Hana CMS

A lightweight, extensible CMS framework built on **Hono** + **Drizzle** + **Vue 3** for the **Bun** runtime.

## Architecture

```
hana-cms/
├── packages/
│   ├── core/           # @hana/core — Hono engine, Plugin system, DB bridge
│   ├── types/          # @hana/types — Shared TypeScript interfaces
│   ├── validator/      # @hana/validator — Zod validation schemas
│   ├── schema/         # @hana/schema — Drizzle base tables & merge helper
│   ├── registry/       # @hana/registry — Plugin marketplace client
│   ├── ui/             # @hana/ui — Vue component registry
│   ├── config/         # @hana/config — Shared tsconfig
│   └── cli/            # @hana/cli — CLI commands
├── plugins/
│   ├── plugin-auth/    # @hana/plugin-auth
│   ├── plugin-blog/    # @hana/plugin-blog
│   └── plugin-media/   # @hana/plugin-media
├── apps/
│   ├── admin/          # Vue 3 admin dashboard
│   ├── playground/     # Development test environment
│   ├── docs/           # VitePress documentation
│   └── starter/        # Starter template
```

## Quick Start

```bash
# Install dependencies
bun install

# Development (all packages)
bun run dev

# Build all packages
bun run build

# Run playground
cd apps/playground && bun run dev

# Run docs
cd apps/docs && bun run dev
```

## Tooling

- **Runtime**: Bun
- **Server**: Hono
- **Database**: Drizzle ORM (SQLite/Turso/PostgreSQL)
- **Frontend**: Vue 3 + Vite
- **Build**: Bunup
- **Lint/Format**: Biome v2
- **Test**: bun test
- **Versioning**: Changesets
- **Monorepo**: Turborepo + Bun workspaces
