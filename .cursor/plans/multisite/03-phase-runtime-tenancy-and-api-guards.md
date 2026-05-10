# Phase 3: Runtime Tenancy and API Guardrails

## Goal
Resolve current site per request and enforce RBAC on all admin and site-sensitive APIs.

## Scope
- Host-based site resolution middleware.
- Admin auth/session middleware integration (core-managed).
- Permission guards for admin API and site-scoped operations.

## Target Files
- `packages/core/src/viseed-cms.ts`
- `packages/core/src/database.ts` (only if runtime query helper updates are needed)
- New auth/policy helper modules under `packages/core/src/`

## Runtime Flow
- Resolve incoming `Host` to `site`.
- Resolve session token to `actor`.
- Load actor permissions for current site.
- Enforce route-level policy checks before handler execution.

## Guarding Rules
- `admin`
  - Access all sites and platform-level admin operations.
- `site_admin`
  - Access only assigned site admin operations.
- `site_content_writer`
  - Access content/menu/path/media operations for assigned site only.
  - No site settings, no user management, no platform operations.

## API Surface Hardening
- Introduce deny-by-default for routes without explicit policy mapping.
- Ensure all admin API reads/writes require authenticated actor.
- Ensure site context mismatch returns clear authorization errors.

## Acceptance Criteria
- Requests with unresolved `Host` are rejected or routed to explicit fallback policy.
- Unauthorized role/action combinations fail consistently.
- Existing endpoints in `/api/admin` are covered by explicit policies.

## Risks
- Missing policy mapping can break legitimate actions.
- Session and site resolution order bugs can cause false denies.

## Risk Mitigation
- Add route-policy registry with startup validation.
- Add integration tests for each role against representative admin routes.

## Out of Scope
- Full admin UI role rendering changes.
- Plugin schema migrations.
- `plugins/plugin-auth` site-user authentication flows (separate concern from admin auth).

## Rules to Update in This Phase
- Update `.cursor/rules/05-plugin-api-contract.mdc` if request context passed to plugin hooks changes.

## Implementation Checklist
- Build site resolver middleware.
- Build actor/session resolver middleware.
- Implement policy engine and route mapping.
- Apply guards across existing `/api/admin` endpoints.
