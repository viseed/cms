---
name: Theme Extension Points
overview: Thêm regions, slots, và block/widget contracts để Theme không bị cứng ở mức full-page layout.
isProject: false
---

# Theme Extension Points

## Goal

Mở extension points chuẩn để plugin hoặc core feature có thể inject UI vào theme mà không phá boundary giữa logic và presentation.

## Depends on

- [theme_06_layout_contract.plan.md](theme_06_layout_contract.plan.md)
- [theme_11_activation_lifecycle.plan.md](theme_11_activation_lifecycle.plan.md)

## Scope

- Type contract cho regions/slots/blocks.
- Runtime registry nhỏ cho theme extension points.
- Chưa xây visual drag-drop builder.

## Files

- Create: [packages/types/src/theme-extension-points.ts](../../packages/types/src/theme-extension-points.ts)
- Modify: [packages/types/src/theme.ts](../../packages/types/src/theme.ts)
- Modify: [packages/types/src/index.ts](../../packages/types/src/index.ts)
- Optional create: [packages/ui/src/theme-region-registry.ts](../../packages/ui/src/theme-region-registry.ts)
- Modify: [`.cursor/rules/08-theme-api-contract.mdc`](../rules/08-theme-api-contract.mdc)

## Tasks

1. Tạo typed regions cho MVP:
   - `header`
   - `footer`
   - `sidebar`
   - `hero`
   - `belowPost`
   - `afterContent`
2. Tạo slot/block contract để theme có thể expose injection points cho plugins.
3. Chốt nguyên tắc:
   - plugin cung cấp logic hoặc component
   - theme quyết định render position
4. Nếu cần UI package support, tạo registry riêng thay vì lạm dụng [packages/ui/src/component-registry.ts](../../packages/ui/src/component-registry.ts).
5. Cập nhật rule file để extension points trở thành part of official theme contract.

## Acceptance

- Theme không bị đóng kín vào vài full-page layouts.
- Kế hoạch cho widget/block về sau có contract sẵn để bám vào.

## Out of scope

- Homepage builder.
- Drag-drop editor.
- Per-page layout composer.
