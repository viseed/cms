# Getting Started

## Prerequisites

- [Bun](https://bun.sh) v1.0 or later
- [PostgreSQL](https://www.postgresql.org/) 14 or later

## Quick Start

### Using the CLI

```bash
bunx @hana/cli init my-project
cd my-project
bun install

# Set your PostgreSQL connection string
export DATABASE_URL="postgresql://user:password@localhost:5432/hana"

# Push schema to database
bunx hanabi db push

bun run dev
```

### Manual Setup

```bash
mkdir my-project && cd my-project
bun init
bun add @hana/core @hana/plugin-auth @hana/plugin-blog
bun add -d @hana/cli
```

Create `src/index.ts`:

```typescript
import { createCMS } from '@hana/core'
import { authPlugin } from '@hana/plugin-auth'
import { blogPlugin } from '@hana/plugin-blog'

const cms = createCMS({
  db: {
    driver: 'postgres',
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/hana',
  },
})

cms.use(authPlugin())
cms.use(blogPlugin())

const app = await cms.launch()

export default {
  port: 3000,
  fetch: app.fetch,
}
```

Push schema and run:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/hana"
bunx hanabi db push
bun run src/index.ts
```

Your CMS is now running at `http://localhost:3000`.
