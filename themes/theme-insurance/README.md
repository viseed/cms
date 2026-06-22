# @viseed/theme-insurance

Insurance product theme for [Viseed CMS](https://viseed.github.io/cms). Includes Eta templates (home, category, post, 404), a companion plugin for the home page carousel, and a full settings schema. Register via the `insuranceTheme()` factory.

## Install

```sh
bun add @viseed/theme-insurance
```

## Usage

```ts
import { createCMS } from '@viseed/cms'
import { insuranceTheme } from '@viseed/theme-insurance'

const cms = createCMS({
  database: { url: process.env.DATABASE_URL! },
  themes: [insuranceTheme()],
  defaultTheme: 'theme-insurance',
})

export default cms.fetch
```

## Documentation

**[viseed.github.io/cms/guide/themes](https://viseed.github.io/cms/guide/themes)**

## License

MIT
