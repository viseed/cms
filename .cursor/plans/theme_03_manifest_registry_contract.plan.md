---
name: Theme Manifest Registry Contract
overview: Định nghĩa manifest và registry response cho Theme, song song với plugin manifest hiện có.
todos: []
isProject: false
---

# Theme Manifest Registry Contract

## Goal

Thiết kế contract để theme có thể được discover, verify compatibility, và xuất hiện trong admin catalog mà không trộn với plugin manifest.

## Depends on

- [theme_02_core_types.plan.md](theme_02_core_types.plan.md)

## Scope

- Tạo type riêng cho theme manifest.
- Tạo registry entry/response riêng cho themes.
- Mở đường cho registry client sau này, nhưng chưa sửa runtime install logic.

## Files

- Create: [packages/types/src/theme-manifest.ts](../../packages/types/src/theme-manifest.ts)
- Modify: [packages/types/src/index.ts](../../packages/types/src/index.ts)

> **Note:** Không sửa `packages/types/src/manifest.ts` — plugin manifest giữ nguyên. Theme manifest là file riêng.

## Tasks

1. Tạo `ThemeManifest` type riêng thay vì reuse `PluginManifest`.
2. Chốt fields cho MVP:
  - `name`, `version`, `description`, `author`
  - `bundleUrl`, `integrity`
  - `requiredLayouts`
  - `screenshots?`, `homepage?`, `repository?`, `tags?`
  - `minCmsVersion?`, `requiredPlugins?`, `compatiblePlugins?`
3. Tạo `ThemeRegistryEntry` và `ThemeRegistryResponse`.
4. Giữ [packages/types/src/manifest.ts](../../packages/types/src/manifest.ts) backward-compatible cho plugin types hiện tại.
5. Export theme manifest types từ barrel để admin/core/registry có thể dùng sau này.

## Acceptance

- Theme registry contract tách biệt rõ khỏi plugin registry contract.
- Không thay đổi API install plugin hiện tại trong [packages/registry/src/registry-client.ts](../../packages/registry/src/registry-client.ts).

## Out of scope

- Fetch themes từ registry.
- Verify bundle theme.
- Cài theme thật.

