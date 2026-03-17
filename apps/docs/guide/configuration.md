# Configuration

## CMSConfig

```typescript
interface CMSConfig {
  db: {
    driver: 'sqlite' | 'turso' | 'postgres'
    url: string
    authToken?: string  // For Turso
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

### SQLite (default)

```typescript
const cms = createCMS({
  db: { driver: 'sqlite', url: './data.db' },
})
```

### Turso (coming soon)

```typescript
const cms = createCMS({
  db: {
    driver: 'turso',
    url: 'libsql://your-db.turso.io',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
})
```
