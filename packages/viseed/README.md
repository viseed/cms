# @viseed/cms

Umbrella package for [Viseed CMS](https://viseed.github.io/cms) — a lightweight, plugin-based CMS framework built on Hono + Drizzle + Bun.

Installs the full runtime: `@viseed/core`, `@viseed/schema`, `@viseed/types`, `@viseed/validator`, `@viseed/registry`, and the `viseed` CLI binary.

## Install

```sh
bun add @viseed/cms
```

## Documentation

**[viseed.github.io/cms/guide/getting-started](https://viseed.github.io/cms/guide/getting-started)**

## Quick start

```ts
import { createCMS } from '@viseed/cms'

const cms = createCMS({
  database: { url: process.env.DATABASE_URL! },
})

export default cms.fetch
```

## License

MIT
