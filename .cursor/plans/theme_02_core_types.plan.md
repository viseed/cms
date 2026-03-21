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
  - `layouts` — typed chi tiết hơn ở plan 06, ban đầu dùng `Record<string, ThemeLayoutEntry>`
  - `settingsSchema?` — typed chi tiết hơn ở plan 09
  - `assets?` — mô tả CSS/JS/font paths mà theme cung cấp
  - `hooks?` — typed chi tiết hơn ở plan 05
2. Tạo `ThemeLayoutEntry` type — mỗi layout entry gồm Eta template path + optional data hook:

```typescript
export interface LayoutContext<TData = Record<string, unknown>> {
  data: TData
  settings: ThemeSettingsValue
  menus: Record<string, ThemeMenuItem[]>
  request: { url: string; params: Record<string, string> }
}

export interface ThemeLayoutEntry<TData = Record<string, unknown>> {
  template: string // relative path to .eta file
  data?: (defaultData: TData, cms: HanaCMS) => TData | Promise<TData>
}
```

1. Tạo `ThemeFactory` type tương tự `PluginFactory`:

```typescript
export type ThemeFactory = (options?: Record<string, unknown>) => CMSTheme
```

1. Tạo `ThemeAssets` interface tối thiểu:

```typescript
export interface ThemeAssets {
  css?: string[]     // relative paths to CSS files
  js?: string[]      // relative paths to JS files
  fonts?: string[]   // relative paths to font files
  staticDir?: string // directory containing static assets
}
```

1. Thêm `theme?: CMSTheme` vào `CMSConfig`.
2. Thêm vào `HanaCMS` interface các getter type-level:
  - `getTheme(): CMSTheme | undefined`
  - `hasTheme(): boolean`
3. Export `CMSTheme`, `ThemeFactory`, `ThemeAssets`, `ThemeLayoutEntry`, `LayoutContext` từ barrel files.
4. Giữ tất cả thay đổi ở mức type-only, không thêm logic trong [packages/core/src/hana-cms.ts](../../packages/core/src/hana-cms.ts) ở plan này.

> **Rendering decision:** `ThemeLayoutEntry.template` trỏ tới file `.eta` (Eta template engine). Core sẽ dùng Eta để render HTML từ template + data. Theme developer viết `.eta` files giống HTML thường, với syntax `<%= it.title %>` cho dynamic content. Client-side interactivity (Vue/React) không phải concern của theme — đó là việc của `plugin-vue`/`plugin-react`.

> **Lưu ý overlap với Plan 05:** Plan này chỉ thêm type signatures vào `HanaCMS` interface. Implementation thật (getTheme/hasTheme trên class) nằm ở plan 05. Nếu muốn tránh interface-class mismatch giữa 2 plan, có thể chỉ thêm getter vào interface tại plan 05 cùng lúc implement. Quyết định tuỳ lúc implement.

## Acceptance

- App code có thể compile với `createCMS({ theme })` ở level type.
- Chưa cần mount theme, nhưng contracts đã ổn định cho các plan sau.

## Out of scope

- Theme manifest.
- Theme persistence.
- Theme activation flow.

