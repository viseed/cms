# Multi-site Hana CMS Master Plan

## Decisions Locked
- Tenancy model: single shared database with strict `site_id` isolation.
- Database runtime: SQLite for local/dev, Turso for production.
- Role model:
  - `admin`: platform-wide access.
  - `site_admin`: admin access for exactly one site.
  - `site_content_writer`: content/menu/path/media only, one site.

## Execution Order
- Phase 1: [`01-phase-contracts-and-rbac.md`](./01-phase-contracts-and-rbac.md)
- Phase 2: [`02-phase-schema-and-migrations.md`](./02-phase-schema-and-migrations.md)
- Phase 3: [`03-phase-runtime-tenancy-and-api-guards.md`](./03-phase-runtime-tenancy-and-api-guards.md)
- Phase 4: [`04-phase-admin-ui-multisite.md`](./04-phase-admin-ui-multisite.md)
- Phase 5: [`05-phase-plugin-and-theme-isolation.md`](./05-phase-plugin-and-theme-isolation.md)
- Phase 6: [`06-phase-db-runtime-sqlite-dev-turso-prod.md`](./06-phase-db-runtime-sqlite-dev-turso-prod.md)

## Dependency Chain
- Phase 1 must complete before Phase 2 because schema depends on role and context contracts.
- Phase 2 must complete before Phase 3 because middleware needs persisted site and membership data.
- Phase 3 should complete before Phase 4 so admin UI can consume real permission endpoints.
- Phase 5 depends on Phase 2 and Phase 3.
- Phase 6 can run in parallel after Phase 2, but should be finalized before production rollout.

## Global Acceptance Criteria
- No cross-site data leakage for any API path.
- Every site-scoped query includes `site_id` filtering.
- Admin API enforces role-based permissions consistently.
- Admin UI only exposes actions user is authorized to perform.
- Production setup supports multiple app instances against one Turso database.

## Rule Sync Checklist
- Update `.cursor/rules/05-plugin-api-contract.mdc` when plugin hook/context contracts change.
- Update `.cursor/rules/06-database-patterns.mdc` when schema/driver behavior changes.
- Update `.cursor/rules/08-theme-api-contract.mdc` when theme contracts become site-aware.
- Keep `.cursor/rules/00-meta-rule.mdc` checklist satisfied in every phase PR.
