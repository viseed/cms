---
name: Theme Settings Schema
overview: Định nghĩa schema-driven settings cho Theme, độc lập với admin form rendering.
todos: []
isProject: false
---

# Theme Settings Schema

## Goal

Tạo contract thống nhất để mỗi theme mô tả settings của nó bằng schema thay vì hardcode UI.

## Depends on

- [theme_02_core_types.plan.md](theme_02_core_types.plan.md)

## Scope

- Tạo types cho theme settings schema/value.
- Chốt shape hỗ trợ các field cơ bản.
- Chừa chỗ cho validation và migration settings sau này.

## Files

- Create: [packages/types/src/theme-settings.ts](../../packages/types/src/theme-settings.ts)
- Modify: [packages/types/src/theme.ts](../../packages/types/src/theme.ts)
- Modify: [packages/types/src/index.ts](../../packages/types/src/index.ts)
- Optional modify: [packages/validator/src/index.ts](../../packages/validator/src/index.ts)

## Tasks

1. Tạo `ThemeSettingsSchema` và `ThemeSettingsValue`.
2. Hỗ trợ các field types đủ cho MVP:
  - text
  - textarea
  - boolean
  - select
  - color
  - image
  - link list
3. Cho phép group/section để UI dễ render sau này.
4. Định nghĩa cơ chế default values và versioning nhẹ cho settings.
5. Gắn `settingsSchema?` vào `CMSTheme`.

## Acceptance

- Theme có thể tự mô tả cấu hình presentation của mình mà không cần custom admin code cho từng theme.
- Settings contract đủ rộng cho color/logo/header/footer/social links.

## Out of scope

- Lưu settings xuống DB.
- Admin form rendering.
- Theme-specific custom validators phức tạp.

