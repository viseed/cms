# Phase 5: Plugin, Theme, and Media Isolation

## Goal
Enforce tenant isolation in plugins and theme runtime so each site has independent content, settings, and assets.

## Scope
- Site-scope official plugins.
- Site-scope theme activation/settings/preview state.
- Namespace media storage by site.

## Target Files
- `plugins/plugin-blog/src/schema.ts`
- `plugins/plugin-blog/src/routes.ts`
- `plugins/plugin-media/src/schema.ts`
- `plugins/plugin-media/src/routes.ts`
- `packages/core/src/hana-cms.ts`
- `packages/core/src/theme-runtime.ts`
- `packages/core/src/theme-preview-path.ts`

## Data and Query Changes
- Add `site_id` to plugin content tables.
- Replace global unique keys with site-scoped unique keys.
- Enforce `site_id` filter in all plugin query paths.

## Theme Isolation Rules
- Active theme is scoped by site.
- Theme settings and preview token are scoped by site.
- Theme management APIs operate on current site context.

## Media Isolation Rules
- Storage path includes deterministic site namespace.
- Media listing and lookup always filter by `site_id`.
- Cross-site media references are blocked by default.

## Acceptance Criteria
- Same slug/path can exist in different sites without collision.
- Theme changes in one site do not affect others.
- Media operations are isolated to assigned site.

## Risks
- Hidden global state in theme runtime can leak across requests.
- Old plugin handlers may miss `site_id` filter.

## Risk Mitigation
- Add shared query helpers that require explicit `site_id`.
- Add plugin integration tests for cross-site isolation.

## Out of Scope
- Admin UI polish not directly required for plugin isolation.
- Driver-level database rollout concerns.

## Rules to Update in This Phase
- Update `.cursor/rules/08-theme-api-contract.mdc` if theme runtime contracts become site-context aware.
- Update `.cursor/rules/06-database-patterns.mdc` for plugin table multi-site conventions if changed.

## Implementation Checklist
- Patch plugin schemas and routes to require `site_id`.
- Patch theme state read/write paths to be site-scoped.
- Add media namespacing and strict site filters.
- Add regression tests for cross-site leakage.
