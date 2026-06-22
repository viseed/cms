# @viseed/theme-blog

Blog theme for [Viseed CMS](https://viseed.github.io/cms). Provides Eta templates, a settings schema, and static assets for a blog-style frontend. Register via the `blogTheme()` factory.

## Install

```sh
bun add @viseed/theme-blog
```

## Usage

```ts
import { createCMS } from '@viseed/cms'
import { blogTheme } from '@viseed/theme-blog'

const cms = createCMS({
  database: { url: process.env.DATABASE_URL! },
  themes: [blogTheme()],
  defaultTheme: 'theme-blog',
})

export default cms.fetch
```

## Documentation

**[viseed.github.io/cms/guide/themes](https://viseed.github.io/cms/guide/themes)**

## License

MIT
