# @viseed/plugin-common-widgets

Common widget types for [Viseed CMS](https://viseed.github.io/cms). Provides ready-to-use widget types:

- **`common-widgets/tabs`** — vertical or horizontal tab groups with rich content per tab
- **`common-widgets/qa`** — single-open accordion Q&A lists

No schema or API routes — pure widget type definitions with admin config forms and public renderers.

## Install

```sh
bun add @viseed/plugin-common-widgets
```

## Usage

```ts
import { createCMS } from '@viseed/cms'
import { commonWidgetsPlugin } from '@viseed/plugin-common-widgets'

const cms = createCMS({ database: { url: process.env.DATABASE_URL! } })
cms.use(commonWidgetsPlugin())

export default cms.fetch
```

## Documentation

**[viseed.github.io/cms/plugins/widgets](https://viseed.github.io/cms/plugins/widgets)**

## License

MIT
