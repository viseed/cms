# @viseed/schema

Drizzle ORM base schema for [Viseed CMS](https://viseed.github.io/cms). Provides the core tables (`users`, `sessions`, `installed_plugins`, `media_files`, `widgets`) and the `mergeSchemas()` helper used by plugins to compose their tables with the base schema.

## Install

```sh
bun add @viseed/schema
```

> Included transitively via `@viseed/cms`. Install directly only when writing plugins or custom database tooling.

## Documentation

**[viseed.github.io/cms/guide/database](https://viseed.github.io/cms/guide/database)**

## License

MIT
