# Phase 4: Admin UI Multi-site Experience

## Goal
Deliver one admin application that can manage multiple sites with strict role-based visibility and actions.

## Scope
- Add current-site context and site switch UX.
- Implement UI-level permission gating.
- Add site management UI for platform admin.

## Target Files
- `apps/admin/src/main.ts`
- `apps/admin/src/App.vue`
- `apps/admin/src/layouts/AdminLayout.vue`
- `apps/admin/src/views/*` (themes, plugins, settings, content areas)
- New composables/stores for admin auth + site context

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
- Frontend includes site context in requests using stable mechanism:
  - Header, query parameter, or server-side host context only.
- Prefer server-trusted site context to avoid client spoofing.

## Acceptance Criteria
- Navigation and route guards are role-aware and site-aware.
- Site switch updates data context without full re-auth.
- Forbidden pages are both hidden in UI and blocked by backend.

## Risks
- UI-only guards can create false sense of security.
- Site switch state drift can display wrong data context.

## Risk Mitigation
- Keep backend as source of truth for authorization.
- Reset view-level cache/state on site switch.

## Out of Scope
- Plugin-level API refactor internals.
- DB driver implementation details.

## Rules to Update in This Phase
- No mandatory rule update unless admin contracts or package map changes.
- Re-check `.cursor/rules/00-meta-rule.mdc` completion checklist.

## Implementation Checklist
- Add admin auth and permission store/composable.
- Add site list and active-site store/composable.
- Apply route-level and navigation-level permission checks.
- Add site management views for platform admin.
