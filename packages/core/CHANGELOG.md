# @viseed/core

## 0.5.0

### Minor Changes

- 8b6ab62: Add user and role management

### Patch Changes

- Updated dependencies [8b6ab62]
  - @viseed/validator@0.5.0
  - @viseed/schema@0.5.0
  - @viseed/types@0.5.0

## 0.4.0

### Minor Changes

- 533ac4c: Add media plugins: plugin-s3, plugin-r2

### Patch Changes

- d530e05: refactor: re-format project by biome rules
- Updated dependencies [d530e05]
- Updated dependencies [533ac4c]
  - @viseed/schema@0.4.0
  - @viseed/types@0.4.0
  - @viseed/validator@0.3.0

## 0.3.0

### Minor Changes

- Update docs

### Patch Changes

- Updated dependencies
  - @viseed/schema@0.3.0
  - @viseed/types@0.3.0
  - @viseed/validator@0.3.0

## 0.2.4

### Patch Changes

- Fix `viseed init` template and core no-theme fallback.

  - **cli**: Replace `@viseed/plugin-auth` with `@viseed/theme-blog` and `pg` in the generated starter. Add `.env` and `viseed.config.ts` scaffold files. Remove deprecated `admin.bootstrapAdmin` config from generated `src/index.ts`. Update default DB name from `hana` to `viseed`.
  - **core**: Add a no-theme fallback that redirects `/` to the admin path when no theme is registered. Fix `setupAdminServing` to treat an absent `enabled` field as enabled (was previously falsy-checking `undefined`).
  - **schema**: Add `"default"` export condition so the package resolves correctly in non-Bun environments that fall through to the default condition.

- Updated dependencies
  - @viseed/schema@0.2.4

## 0.2.3

### Patch Changes

- Republish every package so all internal dependencies resolve to existing,
  fixed versions. The previous release only bumped a subset, leaving published
  packages pointing at older versions that still contained literal `workspace:*`.
- Updated dependencies
  - @viseed/types@0.2.3
  - @viseed/schema@0.2.3
  - @viseed/validator@0.2.3

## 0.2.2

### Patch Changes

- da69549: Fix publishing so the `workspace:*` protocol is resolved to real versions before
  packages are pushed to npm. Previously `changeset publish` (which falls back to
  `npm publish` on Bun) shipped literal `workspace:*` ranges, breaking every
  external install. Republishing all packages with resolved dependency versions.

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
  - @viseed/schema@0.2.0
  - @viseed/validator@0.2.0
