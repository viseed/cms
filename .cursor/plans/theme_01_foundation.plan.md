---
name: Theme Foundation
overview: Chốt terminology, kiến trúc biên giới, naming, và rule-level contract cho Theme system.
todos: []
isProject: false
---

# Theme Foundation

## Goal

Thiết lập nền móng khái niệm cho `Theme` trước khi thêm types, schema, hay runtime behavior.

## Depends on

- Không phụ thuộc plan nào khác.

## Scope

- Đổi ngôn ngữ thiết kế từ `template` sang `theme`.
- Chốt boundary giữa `Theme`, `Plugin`, `Widget/Block`.
- Ghi rõ non-goals cho MVP.
- Thêm rule file mới để Theme trở thành concept chính thức của repo.

## Files

- Create: `[.cursor/rules/08-theme-api-contract.mdc](../rules/08-theme-api-contract.mdc)`
- Modify: `[.cursor/rules/00-meta-rule.mdc](../rules/00-meta-rule.mdc)`
- Modify: `[.cursor/rules/03-package-map.mdc](../rules/03-package-map.mdc)`

## Tasks

1. Tạo rule file mô tả `Theme` là presentation abstraction riêng, không phụ thuộc ngược vào `Plugin`.
2. Ghi trong meta rule rằng thay đổi `CMSTheme`, manifest theme, hay required layouts phải cập nhật rule mới này.
3. Bổ sung package map bằng một section ngắn mô tả vai trò Theme system trong kiến trúc hiện tại.
4. Chốt vocabulary dùng thống nhất trong code/docs/admin UI:
  - `theme`
  - `layout`
  - `region`
  - `slot`
  - `theme settings`
  - `active theme`

## Acceptance

- Repo có source of truth cho Theme API trước khi code implementation bắt đầu.
- Không có file code runtime nào bị sửa trong plan này.
- Các plan sau có thể tham chiếu rule mới thay vì tự giải thích lại boundary.

## Out of scope

- Thêm TypeScript types.
- Thêm DB tables.
- Thêm admin pages.

