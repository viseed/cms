# Getting Started

## Prerequisites

- [Bun](https://bun.sh) v1.0 or later

## Quick Start

### Using the CLI

```bash
bunx @hanabi/cli init my-project
cd my-project
bun install
bun run dev
```

### Manual Setup

```bash
mkdir my-project && cd my-project
bun init
bun add @hanabi/core @hanabi/plugin-auth @hanabi/plugin-blog
```

Create `src/index.ts`:

```typescript
import { createCMS } from '@hanabi/core'
import { authPlugin } from '@hanabi/plugin-auth'
import { blogPlugin } from '@hanabi/plugin-blog'

const cms = createCMS({
  db: {
    driver: 'sqlite',
    url: './data.db',
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

Run with:

```bash
bun run src/index.ts
```

Your CMS is now running at `http://localhost:3000`.
