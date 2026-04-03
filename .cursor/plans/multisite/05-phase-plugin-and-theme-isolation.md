# Phase 5: Plugin Content and Media Isolation

## Goal
Add `site_id` to plugin content tables and namespace media storage so each site has independent blog content and uploaded files.

## Context — What Is Already Done
Theme and plugin **metadata** tables already have `site_id`:
- `hana_installed_plugins` — per-site plugin install + config (done)
- `hana_installed_themes` — per-site theme install (done)
- `hana_theme_state` — active theme, settings, preview token per site (done)

What is **not yet isolated** is the **content data** that plugins create at runtime:
- `blog_posts`, `blog_categories` — no `site_id`, slug unique globally
- `media_files` — no `site_id`
- Media storage path — flat `./uploads/filename`, no site namespace

## Target Files
- `plugins/plugin-blog/src/schema.ts` — add `site_id` column + site-scoped unique constraints
- `plugins/plugin-blog/src/routes.ts` — filter all queries by `site_id` from request context
- `plugins/plugin-media/src/schema.ts` — add `site_id` column
- `plugins/plugin-media/src/routes.ts` — filter queries by `site_id`
- `plugins/plugin-media/src/storage.ts` — namespace upload path by site

## Schema Changes

### `blog_posts`
- Add `site_id TEXT NOT NULL DEFAULT 'default' REFERENCES hana_sites(id) ON DELETE CASCADE`
- Change unique constraint on `slug` to `UNIQUE(site_id, slug)`

### `blog_categories`
- Add `site_id TEXT NOT NULL DEFAULT 'default' REFERENCES hana_sites(id) ON DELETE CASCADE`
- Change unique constraint on `slug` to `UNIQUE(site_id, slug)`

### `media_files`
- Add `site_id TEXT NOT NULL DEFAULT 'default' REFERENCES hana_sites(id) ON DELETE CASCADE`

## Route Changes
- All plugin routes already receive `helpers.resolveRequestContext(c)` which provides the current `siteId`.
- Add `.where(eq(table.siteId, siteId))` to every SELECT, UPDATE, DELETE query.
- Set `siteId` on every INSERT.

## Media Storage Changes
- Change upload path from `./uploads/{filename}` to `./uploads/{siteId}/{filename}`.
- `LocalStorageAdapter.save()` receives `siteId` param and creates subdirectory.
- `LocalStorageAdapter.getUrl()` returns `/uploads/{siteId}/{basename}`.

## Acceptance Criteria
- Same blog slug can exist in different sites without collision.
- Blog listing on site A returns zero posts from site B.
- Uploading a file on site A stores it under `./uploads/{siteA}/` and is not visible from site B.

## Risks
- Plugin routes that forget `site_id` filter silently leak cross-site data.

## Risk Mitigation
- Add integration tests that create content on two sites and verify isolation.

## Out of Scope
- Theme runtime changes (already site-scoped via `hana_theme_state`).
- Admin UI changes (covered in Phase 4).
- Auth plugin — uses core tables (`hana_users`, `hana_sessions`) which are already handled.

## Rules to Update
- Update `.cursor/rules/06-database-patterns.mdc` to document `site_id` convention for plugin content tables.

## Implementation Checklist
- [ ] Add `site_id` to `blog_posts`, `blog_categories`, `media_files` schemas.
- [ ] Update unique constraints to be site-scoped.
- [ ] Filter all plugin-blog routes by `site_id`.
- [ ] Filter all plugin-media routes by `site_id`.
- [ ] Namespace media storage path by `siteId`.
- [ ] Add cross-site isolation tests for blog and media.
