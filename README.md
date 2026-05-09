# Hanano CMS

A lightweight, extensible CMS framework built on **Hono** + **Drizzle** + **Vue 3** for the **Bun** runtime.

## Architecture

```
hanano-cms/
├── packages/
│   ├── core/           # @hanano/core — Hono engine, Plugin system, DB bridge
│   ├── types/          # @hanano/types — Shared TypeScript interfaces
│   ├── validator/      # @hanano/validator — Zod validation schemas
│   ├── schema/         # @hanano/schema — Drizzle base tables & merge helper
│   ├── registry/       # @hanano/registry — Plugin marketplace client
│   ├── ui/             # @hanano/ui — Vue component registry
│   ├── config/         # @hanano/config — Shared tsconfig
│   └── cli/            # @hanano/cli — CLI commands
├── plugins/
│   ├── plugin-auth/    # @hanano/plugin-auth
│   ├── plugin-blog/    # @hanano/plugin-blog
│   └── plugin-media/   # @hanano/plugin-media
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
