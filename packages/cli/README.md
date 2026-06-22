# @viseed/cli

CLI for [Viseed CMS](https://viseed.github.io/cms). Provides the `viseed` binary with commands to scaffold projects, manage the database, and install or uninstall plugins.

## Install

```sh
bun add @viseed/cli
```

> Pulled in automatically when you install `@viseed/cms`.

## Commands

| Command | Description |
|---|---|
| `viseed init` | Scaffold a new Viseed CMS project |
| `viseed db push` | Push schema changes to the database |
| `viseed db generate` | Generate Drizzle migration files |
| `viseed db migrate` | Run pending migrations |
| `viseed plugin install <name>` | Install an official plugin |
| `viseed plugin uninstall <name>` | Uninstall a plugin |

## Documentation

**[viseed.github.io/cms/guide/cli](https://viseed.github.io/cms/guide/cli)**

## License

MIT
