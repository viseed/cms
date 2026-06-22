# @viseed/plugin-auth

Authentication plugin for [Viseed CMS](https://viseed.github.io/cms). Adds user registration, login, and session management via Drizzle schema extensions and Hono API routes.

## Install

```sh
bun add @viseed/plugin-auth
```

## Usage

```ts
import { createCMS } from '@viseed/cms'
import { authPlugin } from '@viseed/plugin-auth'

const cms = createCMS({ database: { url: process.env.DATABASE_URL! } })
cms.use(authPlugin())

export default cms.fetch
```

## Documentation

**[viseed.github.io/cms/plugins/overview](https://viseed.github.io/cms/plugins/overview)**

## License

MIT
