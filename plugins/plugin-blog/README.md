# @viseed/plugin-blog

Blog plugin for [Viseed CMS](https://viseed.github.io/cms). Adds posts and categories with Drizzle schema, full CRUD REST routes, and admin views (PostsView, CategoriesView). Also registers a `blog/latest-posts` widget type.

## Install

```sh
bun add @viseed/plugin-blog
```

## Usage

```ts
import { createCMS } from '@viseed/cms'
import { blogPlugin } from '@viseed/plugin-blog'

const cms = createCMS({ database: { url: process.env.DATABASE_URL! } })
cms.use(blogPlugin())

export default cms.fetch
```

## Documentation

**[viseed.github.io/cms/plugins/overview](https://viseed.github.io/cms/plugins/overview)**

## License

MIT
