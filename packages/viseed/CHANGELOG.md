# @viseed/cms

## 0.2.1

### Patch Changes

- Updated dependencies
  - @viseed/cli@0.2.1

## 0.2.0

### Minor Changes

- Make the packages installable from npm and fix the admin bundle pipeline.

  - Ship `src` alongside `dist` (and keep the `bun` export condition pointing at
    source) so Bun consumers resolve correctly after `bun add`; previously only
    `dist` was published while the `bun` condition pointed at `./src`, causing
    ENOENT outside the monorepo.
  - Order export conditions with `types` first and drop dead `require`/`./components`
    entries (publint clean across all publishable packages).
  - Core now owns Hono for plugins: `CMSRouteContextHelpers.createSubApp(basePath)`
    returns a sub-app that core mounts after the plugin defines its routes. Plugins
    no longer import `hono` at runtime (`import type` only), and plugin runtime
    dependencies (`@viseed/core`, `@viseed/validator`, `drizzle-orm`) are declared
    as `peerDependencies` so a single shared instance is used.
  - Admin SPA builds into `apps/admin/dist`; `@viseed/core` copies it into
    `dist/admin` after bunup, enforced by a Turbo dependency (`@viseed/core#build`
    depends on `@viseed/admin#build`). The umbrella build no longer wipes its own
    output. Build `./schema` entries for plugins that export them.
  - Publish `@viseed/cli` (previously private) since `@viseed/cms` re-exports it as
    the `viseed` bin at runtime; an unpublished dependency would break installs.

### Patch Changes

- Updated dependencies
  - @viseed/types@0.2.0
  - @viseed/core@0.2.0
  - @viseed/cli@0.2.0
  - @viseed/schema@0.2.0
  - @viseed/validator@0.2.0
  - @viseed/registry@0.2.0
  - @viseed/ui@0.2.0
