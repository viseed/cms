# Configuration

## CMSConfig

```typescript
interface CMSConfig {
  db: {
    driver: 'postgres'
    url: string
  }
  admin?: {
    path?: string       // Default: '/admin'
    enabled?: boolean   // Default: true
  }
  server?: {
    port?: number       // Default: 3000
    hostname?: string
  }
}
```

## Database

Hana CMS uses **PostgreSQL** as its database engine, powered by **Bun's built-in SQL driver** (`bun:sql`) and **Drizzle ORM** (`drizzle-orm/bun-sql`).

```typescript
const cms = createCMS({
  db: {
    driver: 'postgres',
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/hana',
  },
})
```

Set `DATABASE_URL` to your PostgreSQL connection string:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/hana"
```

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

The CLI automatically discovers schemas from `@hana/schema` (core tables) and all installed `@hana/plugin-*` packages.
