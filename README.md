# Viseed CMS

A lightweight, extensible CMS framework built on **Hono** + **Drizzle** + **Vue 3** for the **Bun** runtime.

## Architecture

```
viseed-cms/
├── packages/
│   ├── core/           # @viseed/core — Hono engine, Plugin system, DB bridge
│   ├── types/          # @viseed/types — Shared TypeScript interfaces
│   ├── validator/      # @viseed/validator — Zod validation schemas
│   ├── schema/         # @viseed/schema — Drizzle base tables & merge helper
│   ├── registry/       # @viseed/registry — Plugin marketplace client
│   ├── ui/             # @viseed/ui — Vue component registry
│   ├── config/         # @viseed/config — Shared tsconfig
│   └── cli/            # @viseed/cli — CLI commands
├── plugins/
│   ├── plugin-auth/    # @viseed/plugin-auth
│   ├── plugin-blog/    # @viseed/plugin-blog
│   └── plugin-media/   # @viseed/plugin-media
├── apps/
│   ├── admin/          # Vue 3 admin dashboard
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

# Run docs
cd apps/docs && bun run dev
```

## Tooling

- **Runtime**: Bun
- **Server**: Hono
- **Database**: Drizzle ORM (PostgreSQL)
- **Frontend**: Vue 3 + Vite
- **Build**: Bunup
- **Lint/Format**: Biome v2
- **Test**: bun test
- **Versioning**: Changesets
- **Monorepo**: Turborepo + Bun workspaces
