# Phase 2: Schema and Migration Foundation

## Goal
Introduce multi-site persistence model with strict `site_id` isolation and site-specific role assignments.

## Scope
- Add site control tables.
- Convert core site-dependent tables from global to site-scoped.
- Prepare migration and backfill path for existing single-site data.

## Target Files
- `packages/schema/src/index.ts`
- `packages/schema/src/tables/users.ts`
- `packages/schema/src/tables/sessions.ts`
- `packages/schema/src/tables/installed-themes.ts`
- `packages/schema/src/tables/installed-plugins.ts`
- `packages/schema/src/tables/theme-state.ts`
- New files under `packages/schema/src/tables/` for site entities

## Proposed Data Model
- `sites`
  - `id`, `name`, `slug`, `status`, `config`, `createdAt`, `updatedAt`.
- `site_domains`
  - `id`, `siteId`, `domain`, `isPrimary`, `verifiedAt`, `createdAt`.
- `user_site_roles`
  - `id`, `userId`, `siteId`, `role`, `createdAt`, unique `(userId, siteId)`.
- Existing core tables:
  - Add `site_id` where data is site-bound.
  - Replace global unique constraints with composite site-scoped unique constraints.

## Constraint Strategy
- Use composite indexes for hot paths:
  - `(site_id, slug)` for content entities.
  - `(site_id, name)` for installed theme/plugin state.
  - `(site_id, active_theme_name)` or single active row rule for theme state.
- Preserve global unique only where platform-global identity is intentional.

## Migration Strategy
- Bootstrap one default site for legacy data.
- Backfill all existing rows to default site.
- Rebuild uniqueness constraints as site-scoped.
- Add not-null constraints for `site_id` after backfill.

## Acceptance Criteria
- All core tables that represent site state are explicitly site-scoped.
- Migration can run from existing single-site database without data loss.
- Schema exports remain compatible with `mergeSchemas` flow.

## Risks
- Constraint changes can fail on dirty legacy data.
- Large data migration can lock writes if not staged.

## Risk Mitigation
- Pre-migration data validation script for duplicate conflicts.
- Two-step migration for high-risk unique constraints.

## Out of Scope
- Runtime host resolution and middleware enforcement.
- Admin UI role gating.

## Rules to Update in This Phase
- Update `.cursor/rules/06-database-patterns.mdc` (new tables, indexing and tenancy conventions).
- Re-check `.cursor/rules/00-meta-rule.mdc` checklist before closing phase.

## Implementation Checklist
- Add site tables and role membership table.
- Apply site scoping to core site-dependent tables.
- Implement backfill migration path from legacy single-site.
- Validate indexes and unique constraints for multi-site reads/writes.
