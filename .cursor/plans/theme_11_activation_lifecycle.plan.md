---
name: Theme Activation Lifecycle
overview: Thêm validation và switching flow để một installed theme trở thành active theme.
isProject: false
---

# Theme Activation Lifecycle

## Goal

Cho phép activate một theme cụ thể, validate trước khi switch, và giữ invariant “only one active theme”.

## Depends on

- [theme_08_admin_install_uninstall.plan.md](theme_08_admin_install_uninstall.plan.md)
- [theme_10_settings_admin_ui.plan.md](theme_10_settings_admin_ui.plan.md)

## Scope

- Activation service logic.
- Admin API action cho activate.
- Validation trước khi switch.

## Files

- Modify: [packages/core/src/hana-cms.ts](../../packages/core/src/hana-cms.ts)
- Optional create: [packages/core/src/theme-service.ts](../../packages/core/src/theme-service.ts)
- Modify: [apps/admin/src/views/ThemesView.vue](../../apps/admin/src/views/ThemesView.vue)
- Modify: [packages/schema/src/tables/theme-state.ts](../../packages/schema/src/tables/theme-state.ts)

## Tasks

1. Thêm action `POST /api/admin/themes/:name/activate`.
2. Validate trước khi activate:
   - theme đã installed
   - đủ required layouts
   - settings hợp lệ tối thiểu
   - required plugins (nếu có) đã available
3. Persist active theme vào theme state.
4. Update runtime để `getTheme()` phản ánh active theme sau khi reload/restart.
5. Trả về error messages rõ ràng cho admin UI.

## Acceptance

- Hệ thống chỉ có một active theme tại mọi thời điểm.
- Activation failure không làm theme state rơi vào trạng thái half-switched.

## Out of scope

- Preview mode.
- Rollback UI.
- Live hot-swap không restart.
