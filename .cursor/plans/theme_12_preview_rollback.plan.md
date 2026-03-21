---
name: Theme Preview Rollback
overview: Bổ sung preview mode và rollback path an toàn cho Theme sau khi activation lifecycle đã ổn định.
isProject: false
---

# Theme Preview Rollback

## Goal

Giảm rủi ro đổi giao diện production bằng preview tạm thời và rollback về theme trước đó khi cần.

## Depends on

- [theme_11_activation_lifecycle.plan.md](theme_11_activation_lifecycle.plan.md)

## Scope

- Preview state riêng.
- Rollback to previous theme.
- Admin UI controls cho preview và rollback.

## Files

- Modify: [packages/schema/src/tables/theme-state.ts](../../packages/schema/src/tables/theme-state.ts)
- Modify: [packages/core/src/hana-cms.ts](../../packages/core/src/hana-cms.ts)
- Modify: [apps/admin/src/views/ThemesView.vue](../../apps/admin/src/views/ThemesView.vue)
- Optional create: [apps/admin/src/composables/useThemePreview.ts](../../apps/admin/src/composables/useThemePreview.ts)

## Tasks

1. Mở rộng theme state để lưu:
   - `previousThemeName`
   - `previewThemeName`
   - `previewExpiresAt?`
2. Thêm endpoints:
   - `POST /api/admin/themes/:name/preview`
   - `POST /api/admin/themes/rollback`
3. Chốt preview behavior:
   - chỉ admin thấy preview hay global preview flag
   - preview không ghi đè active theme
4. Rollback chỉ về theme active trước đó, không phải undo stack nhiều tầng.
5. UI hiển thị rõ trạng thái `previewing`, `active`, `canRollback`.

## Acceptance

- Theme switching có safety net rõ ràng.
- Preview và rollback dùng chung state model, không tạo đường code tách rời khó bảo trì.

## Out of scope

- Multi-environment preview.
- Shareable preview links.
- Visual diff testing.
