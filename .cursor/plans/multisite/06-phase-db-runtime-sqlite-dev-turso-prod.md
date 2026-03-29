# Phase 6: Database Runtime (SQLite Dev, Turso Prod)

## Goal
Run multi-site safely in distributed production by implementing Turso runtime support while preserving local SQLite developer workflow.

## Scope
- Implement Turso branch in DB initialization.
- Keep SQLite default ergonomics for local development.
- Document deployment model for many app instances and domains.

## Target Files
- `packages/core/src/database.ts`
- `packages/types/src/cms.ts`
- `apps/starter/src/index.ts`
- Root docs/config examples (`README`, env examples, deploy docs)

## Runtime Behavior
- Local/dev:
  - SQLite file, fast bootstrap, minimal setup.
- Production:
  - Turso URL plus auth token.
  - Shared remote DB for multiple app instances and domains.

## Operational Requirements
- Connection and error handling for remote DB outages.
- Retry strategy for transient network errors.
- Migration workflow documented for Turso.
- Environment-driven driver selection with safe defaults.

## Acceptance Criteria
- `createDatabase()` supports both `sqlite` and `turso` paths.
- Multi-instance deployments can read/write the same site-scoped data safely.
- Local developer setup remains simple and unchanged by default.

## Risks
- Driver parity gaps between local and production environments.
- Latency sensitivity for admin and content APIs.

## Risk Mitigation
- Add smoke tests for both drivers.
- Add observability around DB errors and query latency.
- Keep a clear local-vs-prod config matrix in docs.

## Out of Scope
- Postgres or MySQL first-class support in this phase.
- Major schema redesign unrelated to Turso support.

## Rules to Update in This Phase
- Update `.cursor/rules/06-database-patterns.mdc` (driver matrix and runtime conventions).

## Implementation Checklist
- Implement Turso branch in database factory.
- Add config and env examples for dev/prod.
- Validate migrations and runtime behavior on Turso.
- Document deployment pattern for multi-port and multi-machine setups.
