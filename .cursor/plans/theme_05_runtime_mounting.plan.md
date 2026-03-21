---
name: Theme Runtime Mounting
overview: Mount Theme vào HanaCMS runtime và expose state tối thiểu để các lớp sau đọc được.
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
- Chèn lifecycle nhỏ để về sau layout, settings, admin API có thể dựa vào.

## Files

- Modify: [packages/core/src/hana-cms.ts](../../packages/core/src/hana-cms.ts)
- Modify: [packages/core/src/index.ts](../../packages/core/src/index.ts)
- Modify: [packages/types/src/cms.ts](../../packages/types/src/cms.ts)
- Optional create: [packages/core/src/theme-runtime.ts](../../packages/core/src/theme-runtime.ts)

## Tasks

1. Lưu `theme` từ config vào runtime state khi `createCMS()` khởi tạo.
2. Thêm getter thật trong `HanaCMS`:
   - `getTheme()`
   - `hasTheme()`
3. Nếu cần, tách helper file để tránh làm [packages/core/src/hana-cms.ts](../../packages/core/src/hana-cms.ts) phình quá nhanh.
4. Chừa hook point rõ ràng để sau này:
   - validate required layouts
   - hydrate settings
   - expose admin API
5. Không mount routes, assets, hay admin UI trong plan này.

## Acceptance

- Starter app có thể truyền `theme` vào config mà runtime không bỏ qua silently.
- Core có single source of truth cho active theme tại runtime.

## Out of scope

- Theme discovery từ DB.
- Theme install/uninstall.
- Theme preview.
