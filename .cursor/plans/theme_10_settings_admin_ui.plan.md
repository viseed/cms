---
name: Theme Settings Admin UI
overview: Render theme settings trong admin từ schema đã định nghĩa, chưa đụng preview live hay publish workflow.
isProject: false
---

# Theme Settings Admin UI

## Goal

Cho admin sửa theme settings qua form generate từ schema, không hardcode per-theme view.

## Depends on

- [theme_07_admin_catalog_read.plan.md](theme_07_admin_catalog_read.plan.md)
- [theme_09_settings_schema.plan.md](theme_09_settings_schema.plan.md)

## Scope

- API read/write cho theme settings.
- UI form renderer cơ bản.
- Persist settings snapshot vào theme state.

## Files

- Create: [apps/admin/src/views/ThemeSettingsView.vue](../../apps/admin/src/views/ThemeSettingsView.vue)
- Create: [apps/admin/src/components/theme-settings/](../../apps/admin/src/components/theme-settings/)
- Modify: [apps/admin/src/main.ts](../../apps/admin/src/main.ts)
- Modify: [packages/core/src/hana-cms.ts](../../packages/core/src/hana-cms.ts)
- Modify: [packages/schema/src/tables/theme-state.ts](../../packages/schema/src/tables/theme-state.ts)

## Tasks

1. Thêm endpoints:
   - `GET /api/admin/themes/:name/settings`
   - `PUT /api/admin/themes/:name/settings`
2. Tạo screen settings riêng cho active theme hoặc selected installed theme.
3. Render form theo `ThemeSettingsSchema`.
4. Persist settings JSON vào `hana_theme_state`.
5. Tối ưu scope: chưa cần autosave, chưa cần live preview.

## Acceptance

- Theme settings có thể chỉnh trong admin mà không phải code riêng cho từng theme.
- Stored settings đủ để activation/runtime dùng ở plan sau.

## Out of scope

- Live preview.
- Draft vs published settings.
- Undo history.
