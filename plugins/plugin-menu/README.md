# @viseed/plugin-menu

Menu management plugin for [Viseed CMS](https://viseed.github.io/cms). Adds menu and menu item tables, full CRUD REST routes, and an admin view (MenusView). Injects `menuMain` and `menuFooter` data into the theme context via the `theme:beforeRender` hook.

## Install

```sh
bun add @viseed/plugin-menu
```

## Usage

```ts
import { createCMS } from '@viseed/cms'
import { menuPlugin } from '@viseed/plugin-menu'

const cms = createCMS({ database: { url: process.env.DATABASE_URL! } })
cms.use(menuPlugin())

export default cms.fetch
```

## Documentation

**[viseed.github.io/cms/plugins/overview](https://viseed.github.io/cms/plugins/overview)**

## License

MIT
