# Configuration

## CMSConfig

```typescript
interface CMSConfig {
  db: {
    driver: 'sqlite' | 'turso' | 'postgres' | 'mysql'
    url: string
    authToken?: string  // For Turso / libSQL remote
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

## Database Drivers

### SQLite (default, local)

Uses **`@libsql/client`** under the hood (same as Turso), with `url` as a local path or `:memory:`. Relative paths are resolved with `path.resolve`; `:memory:` maps to **`file::memory:?cache=private`** (one isolated in-memory DB per client, libSQL’s supported form). **Do not** use remote `libsql://` URLs here — use `driver: 'turso'` and `authToken`.

```typescript
const cms = createCMS({
  db: { driver: 'sqlite', url: './data.db' },
})
```

### Turso / libSQL remote

Multi-instance production. Same Drizzle `sqlite-core` schema and same libSQL client stack as local `sqlite`. **Remote URLs** (`libsql://`, `https://`, `wss://`, `http://`) require `authToken`; **`file:`** URLs do not.

`createDatabase` is **async** — use `await createDatabase(...)` if you call it outside `HanaCMS.launch()`.

```typescript
const cms = createCMS({
  db: {
    driver: 'turso',
    url: 'libsql://your-db.turso.io',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
})
```

### Postgres / MySQL (config only until dialect work lands)

`driver: 'postgres' | 'mysql'` is reserved on `DatabaseConfig` so you can point env at the right engine early. Core still ships **sqlite-core** tables; swapping only the URL is **not** enough — Postgres and MySQL need `pgTable` / `mysqlTable` (or an explicit multi-dialect strategy) before `createDatabase()` can connect. Until then, starting the CMS with these drivers will error with a clear message.
