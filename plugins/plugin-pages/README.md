# @viseed/plugin-pages

Standalone pages plugin for [Viseed CMS](https://viseed.github.io/cms). Adds a pages table, CRUD REST routes, theme data injection via the `theme:beforeRender` hook, and an admin view (PagesView).

## Install

```sh
bun add @viseed/plugin-pages
```

## Usage

```ts
import { createCMS } from '@viseed/cms'
import { pagesPlugin } from '@viseed/plugin-pages'

const cms = createCMS({ database: { url: process.env.DATABASE_URL! } })
cms.use(pagesPlugin())

export default cms.fetch
```

## Documentation

**[viseed.github.io/cms/plugins/overview](https://viseed.github.io/cms/plugins/overview)**

## License

MIT
