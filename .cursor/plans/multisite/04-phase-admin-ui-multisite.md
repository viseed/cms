# Phase 4: Admin UI Multi-site Experience

## Goal
Deliver one admin application that can manage multiple sites with strict role-based visibility and actions.

## Scope
- Add current-site context and site switch UX.
- Implement UI-level permission gating.
- Add site management UI for platform admin.
- Keep frontend state aligned with backend authorization and site context source of truth.

## Target Files
- `apps/admin/src/main.ts`
- `apps/admin/src/App.vue`
- `apps/admin/src/layouts/AdminLayout.vue`
- `apps/admin/src/views/*` (themes, plugins, settings, content areas)
- `apps/admin/src/router/*` (route metadata + guards)
- New composables/stores for admin auth + site context

## Dependencies (from earlier phases)
- Phase 1 contracts are available:
  - Canonical admin auth payload includes actor, roles, current site, accessible sites, permissions.
  - Stable permission keys are shared with backend.
- Phase 3 guardrails are available:
  - Backend enforces deny-by-default and role/site checks.
  - Site-aware API policies already active.

## UX Rules
- `admin`
  - Sees full site list and can switch across all sites.
- `site_admin`
  - Lands directly on assigned site context.
  - Cannot access platform-wide site management pages.
- `site_content_writer`
  - Sees only content/menu/path/media pages.
  - Hidden navigation for restricted pages.

## API Integration
- Frontend consumes canonical admin auth payload as bootstrap source of:
  - `actor`
  - `roles`
  - `permissions`
  - `activeSite`
  - `accessibleSites`
- Frontend sends active site context through the approved tenancy mechanism from earlier phases.
- Frontend must never trust local permission assumptions over backend responses.

## Route & Navigation Policy (UI Layer)
- Route definitions carry explicit policy metadata:
  - `requiresAuth`
  - `requiredPermissions` (array)
  - `platformOnly` (for site management pages)
  - `siteScoped` (requires active site)
- Navigation is generated from route metadata and filtered by computed permissions + role.
- Direct URL access must be checked by router guard (not only menu hiding).

## State Model
- Introduce `useAdminAuthStore`:
  - Holds actor identity, role assignments, permission set, auth loading/error state.
- Introduce `useSiteContextStore`:
  - Holds `activeSite`, `accessibleSites`, switching state, and switch errors.
- Add a composable `useAdminPermissions()`:
  - Exposes `can(permission)`, `canAny([...])`, `isRole(role)`.
- On site switch:
  - Update active site.
  - Re-fetch site-scoped bootstrap data if needed.
  - Reset view-level transient state and cached site-scoped queries.
  - Keep auth session intact (no full re-auth).

## UI Workstreams
1) App Bootstrap
- Load auth + site context before rendering protected admin routes.
- Add centralized loading/error shell for bootstrap failures.

2) Site Switch Experience
- Add site switcher in `AdminLayout`.
- Show current active site in top-level chrome.
- Disable switcher while pending switch request.

3) Permission-aware Navigation
- Hide restricted sections based on policy metadata.
- Ensure sidebar and quick links use the same guard helper.

4) Route Guards
- Block unauthorized routes with deterministic behavior:
  - Unauthorized -> dedicated forbidden state/view.
  - Missing active site for site-scoped route -> recovery flow (select site).

5) Platform Site Management UI (`admin` only)
- Add/enable site list + site detail management surfaces.
- Exclude these entries from `site_admin` and `site_content_writer`.

## Acceptance Criteria
- Navigation and route guards are role-aware and site-aware.
- Site switch updates data context without full re-auth.
- Forbidden pages are both hidden in UI and blocked by backend.
- Direct URL navigation to restricted routes is denied consistently.
- After site switch, page data reflects new site only (no stale cross-site data bleed).

## Risks
- UI-only guards can create false sense of security.
- Site switch state drift can display wrong data context.
- Stale cached queries can leak prior site data in components.
- Multiple parallel requests during switch can race and paint old state.

## Risk Mitigation
- Keep backend as source of truth for authorization.
- Reset view-level cache/state on site switch.
- Centralize permission checks to one helper/composable.
- Gate rendering of site-scoped screens until switch transition completes.
- Prefer optimistic UX only when rollback path is defined.

## Out of Scope
- Plugin-level API refactor internals.
- DB driver implementation details.
- Backend policy redesign (already handled in Phase 3).

## Rules to Update in This Phase
- No mandatory rule update unless admin contracts or package map changes.
- Re-check `.cursor/rules/00-meta-rule.mdc` completion checklist.

## Implementation Plan (Execution Order)
- [ ] Define route policy metadata and map every admin route.
- [ ] Implement `useAdminAuthStore` + bootstrap flow from canonical auth payload.
- [ ] Implement `useSiteContextStore` + switch-site action.
- [ ] Wire `AdminLayout` site switcher and active-site indicator.
- [ ] Apply permission filtering to sidebar/nav and page entry points.
- [ ] Add global router guard for auth, role, permission, and site requirements.
- [ ] Build/enable platform site management views (`admin` only).
- [ ] Add forbidden and missing-site recovery states.
- [ ] Add cache reset hooks and transient state reset on site switch.
- [ ] Validate all role flows with integration and manual QA checklist.

## Test Plan
- Unit tests
  - Permission helper: `can/canAny/isRole` truth table by role.
  - Route policy matcher: expected allow/deny for representative routes.
  - Site-context store: switch lifecycle (idle -> switching -> success/error).
- Integration tests
  - Bootstrap loads auth/site context and renders correct nav.
  - Site switch updates active site and refreshes site-scoped data.
  - Route guard blocks restricted direct URLs for each role.
- End-to-end checks
  - `admin`: can switch between sites and open platform site management.
  - `site_admin`: no platform site management access, only assigned site context.
  - `site_content_writer`: only content/menu/path/media visible and accessible.
  - Backend deny responses still handled gracefully in UI (no broken state).

## Definition of Done
- Every admin route has explicit policy metadata.
- All three roles match expected visible nav and route accessibility.
- Site switch has no stale-data regression in tested pages.
- QA checklist passes for deep-link, refresh-after-login, and switch-mid-session flows.
