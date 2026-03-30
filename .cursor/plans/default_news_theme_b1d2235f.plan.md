---
name: default news theme
overview: Ship one official built-in News theme for Hana CMS as the default experience for new installs, with enough content/domain support to render real home/post/category/page flows out of the box. Keep the architecture extensible so additional default themes can be added later without reworking core packaging.
todos:
  - id: theme-runtime-foundation
    content: Enable official package-based themes to provide templates/static assets/settings at runtime without relying on cwd-only theme folders.
    status: pending
  - id: news-theme-package
    content: Create the official `@hana/theme-news` package with Eta templates, static assets, settings schema, and theme factory export.
    status: pending
  - id: content-domain-minimum
    content: "Complete the minimum content plugins needed for a usable news site: real blog reads plus a dedicated pages plugin and basic media persistence integration."
    status: pending
  - id: default-install-wiring
    content: Wire the default News theme and required plugins into starter and CLI init so fresh Hana installs boot with the theme automatically.
    status: pending
  - id: tests-and-rules
    content: Add focused verification and update project rules/docs for new package/plugin and any theme API/runtime contract changes.
    status: pending
isProject: false
---

# Default News Theme Implementation Plan

**Goal:** Ship one official built-in `News` theme as Hana CMS's default frontend for new installs, with real `home`, `post`, `category`, and `page` rendering backed by minimal usable content plugins.

**Scope lock:** Only one default theme in this phase. The product/subscription theme is deferred. The design should stay extensible for future official themes.

## Confirmed Decisions

- Ship the theme as an official workspace package, not a scaffolded local folder.
- Make the News theme usable on day one, not just a visual shell.
- Add a dedicated `@hana/plugin-pages` instead of stretching `@hana/plugin-blog` to own static pages.
- Keep theme/business boundaries clean: theme owns presentation; plugins own schema/routes/content retrieval.

## Non-goals

- No second default theme in this phase.
- No billing/subscription/product domain.
- No theme marketplace, visual builder, or DB-driven multi-theme loader beyond what is strictly needed for one default theme.

## Current Constraints To Design Around

- In [packages/core/src/hana-cms.ts](packages/core/src/hana-cms.ts), `launch()` only mounts a theme when `config.theme` is explicitly provided, and `setupThemeRoutes()` currently renders with empty `settings` and `menus`.
- In [packages/core/src/theme-runtime.ts](packages/core/src/theme-runtime.ts), template discovery is effectively cwd-based (`process.cwd()/themes/...`), which blocks clean shipping of official theme packages.
- In [packages/cli/src/commands/init.ts](packages/cli/src/commands/init.ts) and [apps/starter/src/index.ts](apps/starter/src/index.ts), new installs currently bootstrap only `@hana/plugin-auth` and `@hana/plugin-blog`, with no theme at all.
- In [plugins/plugin-blog/src/routes.ts](plugins/plugin-blog/src/routes.ts), blog endpoints are still TODO stubs, so the News theme cannot yet render real content.
- Theme contract requires `home`, `post`, `category`, `page`, and `404` layouts per [packages/types/src/theme-layout.ts](packages/types/src/theme-layout.ts) and  [.cursor/rules/08-theme-api-contract.mdc](.cursor/rules/08-theme-api-contract.mdc).

## Recommended Architecture

### Workstream A: Theme Runtime Foundation

**Outcome:** Official theme packages can resolve their own template/static roots and receive real runtime context.

Files to modify:

- [packages/types/src/theme.ts](packages/types/src/theme.ts)
- [packages/core/src/theme-runtime.ts](packages/core/src/theme-runtime.ts)
- [packages/core/src/hana-cms.ts](packages/core/src/hana-cms.ts)
- [packages/types/src/cms.ts](packages/types/src/cms.ts) if a small helper type is needed
- [.cursor/rules/08-theme-api-contract.mdc](.cursor/rules/08-theme-api-contract.mdc) if the `CMSTheme` contract changes

Plan:

- Add a minimal, explicit way for a theme package to declare where its templates/static files live at runtime. Prefer a small theme-root/template-root contract over brittle cwd conventions.
- Keep backward compatibility for existing local preview paths under `themes/...`.
- Stop rendering with hardcoded empty theme context where feasible: thread persisted `theme settings` into render, and define the minimum placeholder strategy for menus until menu management lands.
- Do not build a full theme registry/loader yet; keep `config.theme` as the startup source of truth for this phase.

Acceptance:

- `@hana/theme-news` can be imported as a dependency and render without copying files into the consumer app's cwd.
- Existing preview-path behavior still works.

### Workstream B: Minimum News Content Domain

**Outcome:** The default News theme has real data to render.

Files to create/modify:

- [plugins/plugin-blog/src/routes.ts](plugins/plugin-blog/src/routes.ts)
- [plugins/plugin-blog/src/index.ts](plugins/plugin-blog/src/index.ts)
- `plugins/plugin-blog/src/`* supporting query/service files as needed
- New plugin package: `plugins/plugin-pages/`*
- [plugins/plugin-media/src/routes.ts](plugins/plugin-media/src/routes.ts) and related storage/schema files if media persistence needs a minimal completion pass

Plan:

- Finish the read side of `plugin-blog` first: published post listing for home/category, single post by slug, and category lookup.
- Add `@hana/plugin-pages` with minimal schema + slug-based read/write routes so the required `page` layout has a real source.
- Decide a minimal content shape for News MVP: headline, slug, excerpt, body, category, publishedAt, hero image reference if media is wired.
- If media is part of the usable News experience, complete the missing persistence path so uploaded assets can actually be referenced by posts/pages.
- Keep write/admin complexity minimal; this phase needs usable content plumbing, not a full editorial workflow.

Acceptance:

- `home` can show latest published posts and categories.
- `post/:slug` resolves a real article.
- `category/:slug` resolves a category page with posts.
- `page/:slug` resolves a standalone page from `plugin-pages`.

### Workstream C: Official News Theme Package

**Outcome:** A reusable `@hana/theme-news` package exists and is the default frontend experience.

Files to create:

- `packages/theme-news/package.json`
- `packages/theme-news/src/index.ts`
- `packages/theme-news/templates/*.eta`
- `packages/theme-news/static/`*
- Optional theme-specific helpers/types/tests under `packages/theme-news/src/`*

Plan:

- Package name: `@hana/theme-news` under `packages/theme-news` to align with current workspaces.
- Export a theme factory, for example `newsTheme()` returning `CMSTheme` with its runtime roots, settings schema, menu zones, and required layouts.
- Build required layouts: `home`, `post`, `category`, `page`, `404`.
- Keep the visual system editorial/news-focused: homepage hero + post list, article layout, category archive, simple page template, basic footer/header navigation.
- Use `layout.data()` only for presentation-level shaping; avoid embedding business/data access rules that belong in plugins.
- Add a small settings surface only where it materially helps: site title, brand color, hero layout toggle, sidebar on/off, social/footer metadata.

Acceptance:

- A fresh install renders a complete news site without manual theme wiring.
- The theme package can be versioned independently and later joined by other official themes.

### Workstream D: Default Install Wiring

**Outcome:** New Hana consumers get the News theme by default.

Files to modify:

- [apps/starter/src/index.ts](apps/starter/src/index.ts)
- [packages/cli/src/commands/init.ts](packages/cli/src/commands/init.ts)
- Package manifests that need new internal dependencies

Plan:

- Add `@hana/theme-news` and `@hana/plugin-pages` to the default starter/init dependency set.
- Import the theme in generated starter code and pass it into `createCMS({ theme: newsTheme(), ... })`.
- Keep `auth`, `blog`, and any required content/media plugin registrations aligned between the monorepo starter and CLI-generated app.
- Make sure the generated app still works with Bun and the existing package distribution model.

Acceptance:

- `hana init <project>` produces a project that boots directly into the News theme.
- `apps/starter` mirrors that same default stack for local repo development.

### Workstream E: Testing, Rules, and Documentation

**Outcome:** The new default theme path is stable and the repo rules stay truthful.

Files to modify:

- [.cursor/rules/03-package-map.mdc](.cursor/rules/03-package-map.mdc)
- [.cursor/rules/04-dependency-rules.mdc](.cursor/rules/04-dependency-rules.mdc)
- [.cursor/rules/08-theme-api-contract.mdc](.cursor/rules/08-theme-api-contract.mdc) if theme contract changes
- Focused test files near core/theme/plugin changes

Plan:

- Add focused tests for theme runtime path resolution, theme render context, blog/page query behavior, and starter/CLI smoke-level config generation where practical.
- Update package map for `@hana/theme-news` and `@hana/plugin-pages`.
- Update dependency graph so the new package/plugin import boundaries are explicit and safe.
- If `CMSTheme` changes, document the new package-runtime contract immediately.

Acceptance:

- Rules match the codebase state in the same PR/session.
- Recently touched files are lint-clean.

## Parallelization Strategy

These can move in parallel once the runtime contract is settled:

- Track 1: Workstream A (`theme runtime foundation`)
- Track 2: Workstream B (`blog/pages/media minimum domain`)
- Track 3: Workstream C (`theme-news package templates/assets/settings`)

Then converge on:

- Workstream D (`starter + CLI default wiring`)
- Workstream E (`tests + rules + cleanup`)

## Suggested Sequence

1. Lock the runtime contract for package-based themes.
2. Create `@hana/plugin-pages` and finish the minimum read paths in `plugin-blog`.
3. Build `@hana/theme-news` against those data contracts.
4. Wire the theme/plugins into starter and CLI init defaults.
5. Add focused verification and update rules/docs.

## Delivery Checklist

- New package: `@hana/theme-news`
- New plugin: `@hana/plugin-pages`
- Starter and CLI init default to the News theme
- Real blog/category/post/page rendering works
- Theme runtime no longer depends solely on cwd theme folders
- Rules/docs updated in the same change set

