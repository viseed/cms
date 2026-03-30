# Phase 1: Contracts and RBAC Model

## Goal
Define stable contracts for site-aware requests and authorization so all later phases implement against one source of truth.

## Scope
- Introduce site-aware request context contract.
- Define permission vocabulary and role-to-permission mapping.
- Keep backward compatibility for current single-site runtime.

## Target Files
- `packages/types/src/cms.ts`
- `packages/types/src/plugin.ts`
- `packages/core/src/hana-cms.ts`

## Design Output
- New shared types:
  - `SiteContext` (resolved site identity and metadata used at request time).
  - `ActorContext` (authenticated user identity).
  - `Permission` (resource-action keys).
  - `RequestContext` (`site`, `actor`, `permissions`).
- Role mapping:
  - `admin` -> all permissions.
  - `site_admin` -> all site-level permissions except platform-wide site management.
  - `site_content_writer` -> content/menu/path/media permissions only.
- Capability boundaries:
  - Platform-scoped actions and site-scoped actions must be separated explicitly.

## API Contract Changes
- Add a canonical admin auth endpoint payload for UI (served from core):
  - Current user identity.
  - Role assignments.
  - Current site and list of accessible sites.
  - Computed permissions.
- Define one permission-check helper contract used by core and plugins.

## Acceptance Criteria
- Types compile without circular dependency violations across `@hana/*`.
- Existing single-site boot still works without requiring site arguments everywhere.
- A single permission matrix exists and is imported by both API guards and UI gating code (later phase).

## Risks
- Overly generic permission schema can slow down implementation in later phases.
- Contract churn can cascade into plugin and UI rewrites.

## Risk Mitigation
- Keep permission keys explicit and small for phase 1.
- Add extension pattern for future permissions without breaking existing keys.

## Out of Scope
- No DB table migration yet.
- No admin UI site switcher yet.
- No plugin route refactor yet.

## Rules to Update in This Phase
- Update `.cursor/rules/05-plugin-api-contract.mdc` if plugin hook/context signatures change.

## Implementation Checklist
- Finalize role and permission vocabulary.
- Add site-aware request context types.
- Add compatibility defaults for single-site mode.
- Document contract usage points in core admin auth and admin guard entry points.
