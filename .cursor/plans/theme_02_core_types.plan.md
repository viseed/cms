---
name: Theme Core Types
overview: Thêm type-level surface cho Theme vào packages/types và HanaCMS contract mà chưa implement runtime loading.
todos: []
isProject: false
---

# Theme Core Types

## Goal

Giới thiệu `CMSTheme` như first-class type trong [packages/types/src](../../packages/types/src) và mở surface nhỏ trong `CMSConfig`/`HanaCMS`.

## Depends on

- [theme_01_foundation.plan.md](theme_01_foundation.plan.md)

## Scope

- Tạo interface `CMSTheme`.
- Export type từ barrel file.
- Mở rộng `CMSConfig` để chấp nhận `theme`.
- Mở rộng type contract của `HanaCMS` với getter tối thiểu cho theme hiện tại.

## Files

- Create: [packages/types/src/theme.ts](../../packages/types/src/theme.ts)
- Modify: [packages/types/src/index.ts](../../packages/types/src/index.ts)
- Modify: [packages/types/src/cms.ts](../../packages/types/src/cms.ts)
- Modify: [packages/core/src/index.ts](../../packages/core/src/index.ts)

## Tasks

1. Tạo `CMSTheme` interface chỉ chứa metadata runtime tối thiểu:
  - `name`
  - `version`
  - `layouts`
  - `settingsSchema?`
  - `assets?`
2. Thêm `theme?: CMSTheme` vào `CMSConfig`.
3. Thêm vào `HanaCMS` interface các getter type-level:
  - `getTheme()`
  - `hasTheme()`
4. Export `CMSTheme` từ [packages/types/src/index.ts](../../packages/types/src/index.ts) và [packages/core/src/index.ts](../../packages/core/src/index.ts).
5. Giữ tất cả thay đổi ở mức type-only, không thêm logic trong [packages/core/src/hana-cms.ts](../../packages/core/src/hana-cms.ts) ở plan này.

## Acceptance

- App code có thể compile với `createCMS({ theme })` ở level type.
- Chưa cần mount theme, nhưng contracts đã ổn định cho các plan sau.

## Out of scope

- Theme manifest.
- Theme persistence.
- Theme activation flow.

