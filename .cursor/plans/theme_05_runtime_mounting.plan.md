---
name: Theme Runtime Mounting
overview: Mount Theme vào HanaCMS runtime và expose state tối thiểu để các lớp sau đọc được.
todos: []
isProject: false
---

# Theme Runtime Mounting

## Goal

Làm cho [packages/core/src/hana-cms.ts](../../packages/core/src/hana-cms.ts) hiểu `theme` như một runtime participant, nhưng chưa đụng tới activation UI hay preview flow.

## Depends on

- [theme_02_core_types.plan.md](theme_02_core_types.plan.md)
- [theme_04_persistence.plan.md](theme_04_persistence.plan.md)

## Scope

- Lưu active theme trong `HanaCMS`.
- Expose getter/runtime state.
- Khởi tạo Eta engine và đăng ký render pipeline (Hono routes → Eta render).
- Chèn lifecycle nhỏ để về sau layout, settings, admin API có thể dựa vào.

## Files

- Modify: [packages/core/src/hana-cms.ts](../../packages/core/src/hana-cms.ts)
- Modify: [packages/core/src/index.ts](../../packages/core/src/index.ts)
- Modify: [packages/types/src/cms.ts](../../packages/types/src/cms.ts) — nếu plan 02 chưa thêm getter vào interface
- Modify: [packages/types/src/plugin.ts](../../packages/types/src/plugin.ts) — thêm `theme:mount` hook
- Modify: [`.cursor/rules/05-plugin-api-contract.mdc`](../rules/05-plugin-api-contract.mdc) — document hooks mới
- Optional create: [packages/core/src/theme-runtime.ts](../../packages/core/src/theme-runtime.ts)

## Tasks

1. Lưu `theme` từ config vào runtime state khi `createCMS()` khởi tạo.
2. Implement getter thật trong `HanaCMS` class:
   - `getTheme(): CMSTheme | undefined`
   - `hasTheme(): boolean`
3. Khởi tạo **Eta engine** trong core runtime:
   - `bun add eta` vào `packages/core`
   - Cấu hình Eta với `views` trỏ tới theme template directory
   - Tạo helper `renderLayout(layoutKey, data)` — gọi `theme.layouts[key].data?.()` rồi `eta.render(template, finalData)`
4. Đăng ký **Hono routes** cho theme layouts:
   - Core tự đăng ký routes chuẩn (`/` → home, `/post/:slug` → post, `/category/:slug` → category, ...)
   - Mỗi route: fetch default data → gọi theme `data()` hook nếu có → render Eta template → trả HTML response
   - Route registration chỉ xảy ra khi `hasTheme() === true`
5. Serve **theme static assets** qua Hono static middleware:
   - Nếu `theme.assets.staticDir` có giá trị → mount Hono static route tại `/theme/static/`
   - CSS/JS/fonts từ `theme.assets` được inject vào layout context để Eta templates dùng
6. Thêm theme-specific hooks vào `CMSPluginHooks`:
   - `'theme:mount': (theme: CMSTheme) => void | Promise<void>` — called khi theme được load vào runtime
   - `'theme:beforeRender': (layoutKey: string, data: unknown) => unknown | Promise<unknown>` — cho phép plugins modify data trước khi render
   - Chừa chỗ cho hooks nâng cao (`theme:activate`) ở plan 11.
7. Nếu cần, tách helper file `theme-runtime.ts` để tránh làm [packages/core/src/hana-cms.ts](../../packages/core/src/hana-cms.ts) phình quá nhanh.
8. Chừa hook point rõ ràng để sau này:
   - validate required layouts (plan 06)
   - hydrate settings (plan 09/10)
   - expose admin API (plan 07)

> **Lưu ý:** Plan này cũng cần cập nhật `05-plugin-api-contract.mdc` để document hooks mới.

## Acceptance

- Starter app có thể truyền `theme` vào config mà runtime không bỏ qua silently.
- Core có single source of truth cho active theme tại runtime.
- Truy cập `/` trên starter app trả về HTML rendered từ theme home template.
- Theme assets được serve đúng tại `/theme/static/*`.

## Out of scope

- Theme discovery từ DB.
- Theme install/uninstall.
- Theme preview.

