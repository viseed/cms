---
name: Theme Advanced Ecosystem
overview: Các bước nâng cao cho compatibility matrix, child themes, layout variants, và quality gates sau khi Theme MVP đã ổn định.
todos: []
isProject: false
---

# Theme Advanced Ecosystem

## Goal

Mở rộng Theme system thành ecosystem trưởng thành sau khi foundation, activation, settings, và extension points đã ổn định.

## Depends on

- [theme_12_preview_rollback.plan.md](theme_12_preview_rollback.plan.md)
- [theme_13_extension_points.plan.md](theme_13_extension_points.plan.md)

## Scope

- Compatibility matrix.
- Child themes/theme inheritance.
- Layout variants.
- Quality gates cho theme marketplace.
- Framework plugins roadmap (`plugin-vue`, `plugin-react`).

## Files

- Modify: [packages/types/src/theme-manifest.ts](../../packages/types/src/theme-manifest.ts)
- Modify: [packages/types/src/theme-layout.ts](../../packages/types/src/theme-layout.ts)
- Modify: [packages/core/src/hana-cms.ts](../../packages/core/src/hana-cms.ts)
- Modify: [packages/registry/src/registry-client.ts](../../packages/registry/src/registry-client.ts)
- Modify: [apps/admin/src/views/ThemesView.vue](../../apps/admin/src/views/ThemesView.vue)
- Modify: `[.cursor/rules/08-theme-api-contract.mdc](../rules/08-theme-api-contract.mdc)`

## Tasks

1. Thêm compatibility matrix giữa theme và plugins.
2. Thêm `extends` hoặc `parentTheme` vào manifest để hỗ trợ child theme.
3. Chuẩn hóa layout variants như:
  - `post.default`
  - `post.fullWidth`
  - `home.magazine`
4. Định nghĩa quality gates cho theme registry:
  - required layouts
  - accessibility baseline
  - responsive baseline
  - screenshot/demo metadata
5. Định nghĩa roadmap cho **framework plugins** — client-side interactivity qua plugin system:
  - `plugin-vue`: inject Vue 3 runtime, cung cấp `<div data-island="...">` mount points, cho phép theme/plugin register Vue components vào islands
  - `plugin-react`: tương tự cho React ecosystem
  - Cả hai plugins hook vào `theme:beforeRender` để inject script tags và mount points vào HTML output
  - Theme không cần biết Vue/React — plugin tự quản lý client-side hydration
6. Chỉ thêm feature nào không làm phình Theme MVP quá sớm; mọi advanced behavior phải optional.

## Acceptance

- Theme system có đường phát triển dài hạn rõ ràng mà không làm phức tạp MVP.
- Các advanced features đều bám trên contracts đã có, không phá lại các plan trước.

## Out of scope

- Visual marketplace polish.
- Commercial licensing flows.
- Real-time theme hot reload across tenants.

