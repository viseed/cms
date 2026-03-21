---
name: Theme Persistence
overview: Bổ sung persistence layer cho installed themes, active theme, và settings snapshot trong schema hiện tại.
todos: []
isProject: false
---

# Theme Persistence

## Goal

Tạo data model đủ nhỏ để hệ thống nhớ theme nào đã cài, theme nào đang active, và đang giữ settings nào.

## Depends on

- [theme_03_manifest_registry_contract.plan.md](theme_03_manifest_registry_contract.plan.md)

## Scope

- Bổ sung schema/tables cho themes.
- Export tables từ schema package.
- Chừa chỗ cho activation và rollback sau này.

## Files

- Create: [packages/schema/src/tables/installed-themes.ts](../../packages/schema/src/tables/installed-themes.ts)
- Create: [packages/schema/src/tables/theme-state.ts](../../packages/schema/src/tables/theme-state.ts)
- Modify: [packages/schema/src/index.ts](../../packages/schema/src/index.ts)
- Modify: [packages/schema/src/schema-builder.ts](../../packages/schema/src/schema-builder.ts)
- Modify: `[.cursor/rules/06-database-patterns.mdc](../rules/06-database-patterns.mdc)`

## Tasks

1. Tạo bảng `hana_installed_themes` tương tự [packages/schema/src/tables/installed-plugins.ts](../../packages/schema/src/tables/installed-plugins.ts), nhưng chỉ cho theme metadata.
2. Tạo bảng `hana_theme_state` hoặc tương đương để lưu:
  - `activeThemeName`
  - `settings`
  - `previewThemeName?`
  - `updatedAt`
3. Export hai bảng mới từ [packages/schema/src/index.ts](../../packages/schema/src/index.ts).
4. Đảm bảo naming và timestamp patterns bám theo rule DB hiện tại.
5. Cập nhật database rule để `installed_themes` và `theme_state` trở thành core tables chính thức.

## Acceptance

- Persistence contract đủ cho install, activate, preview, rollback mà không cần đổi schema thêm lần nữa ở các plan kế tiếp.
- Chưa cần dùng các bảng này trong runtime.

## Out of scope

- DB queries ở core runtime.
- Migration CLI cho theme-specific workflows.

