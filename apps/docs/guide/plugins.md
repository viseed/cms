# Plugin System

Hana CMS uses a hybrid plugin architecture supporting both NPM-based official plugins and CDN-based community plugins.

## Creating a Plugin

```typescript
import type { CMSPlugin } from '@hana/core'

export function myPlugin(): CMSPlugin {
  return {
    name: 'my-plugin',
    version: '1.0.0',

    schema: {
      // Drizzle table definitions
    },

    hooks: {
      'cms:init': async (cms) => {
        console.log('Plugin initializing...')
      },
      'cms:ready': async (app) => {
        console.log('CMS is ready!')
      },
    },

    routes: (app) => {
      app.get('/api/my-plugin/hello', (c) =>
        c.json({ message: 'Hello!' })
      )
    },
  }
}
```

## Lifecycle Hooks

| Hook | When | Arguments |
|------|------|-----------|
| `cms:init` | After database is initialized | `HanaCMS` instance |
| `cms:ready` | After all routes are registered | `Hono` app instance |
| `admin:register` | When admin UI loads | `ComponentRegistry` |

## Using a Plugin

```typescript
import { createCMS } from '@hana/core'
import { myPlugin } from './my-plugin'

const cms = createCMS({ ... })
cms.use(myPlugin())
```
