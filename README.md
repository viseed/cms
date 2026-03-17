# Hanabi CMS

A lightweight, extensible CMS framework built on **Hono** + **Drizzle** + **Vue 3** for the **Bun** runtime.

## Architecture

```
hanabi-cms/
├── packages/
│   ├── core/           # @hanabi/core — Hono engine, Plugin system, DB bridge
│   ├── types/          # @hanabi/types — Shared TypeScript interfaces
│   ├── validator/      # @hanabi/validator — Zod validation schemas
│   ├── schema/         # @hanabi/schema — Drizzle base tables & merge helper
│   ├── registry/       # @hanabi/registry — Plugin marketplace client
│   ├── ui/             # @hanabi/ui — Vue component registry
│   ├── config/         # @hanabi/config — Shared tsconfig
│   └── cli/            # @hanabi/cli — CLI commands
├── plugins/
│   ├── plugin-auth/    # @hanabi/plugin-auth
│   ├── plugin-blog/    # @hanabi/plugin-blog
│   └── plugin-media/   # @hanabi/plugin-media
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
