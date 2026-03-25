---
name: Theme Layout Contract
overview: Định nghĩa required layouts và shape dữ liệu tối thiểu cho Theme layouts.
todos: []
isProject: false
---

# Theme Layout Contract

## Goal

Chốt contract để mọi theme đều phải cung cấp các layout cốt lõi như `home`, `post`, `category`, `page`, `404`.

## Depends on

- [theme_05_runtime_mounting.plan.md](theme_05_runtime_mounting.plan.md)

## Scope

- Tạo type cho layout keys.
- Định nghĩa required layout set cho MVP.
- Chừa extension point cho optional layouts và variants.

## Files

- Create: [packages/types/src/theme-layout.ts](../../packages/types/src/theme-layout.ts)
- Modify: [packages/types/src/theme.ts](../../packages/types/src/theme.ts)
- Modify: [packages/types/src/index.ts](../../packages/types/src/index.ts)
- Modify: `[.cursor/rules/08-theme-api-contract.mdc](../rules/08-theme-api-contract.mdc)`

## Tasks

1. Tạo `ThemeLayoutKey` union cho required keys:
  - `home`
  - `post`
  - `category`
  - `page`
  - `404`
2. Tạo type cho optional keys:
  - `tag`
  - `author`
  - `search`
  - `archive`
3. Cập nhật `CMSTheme.layouts` từ `Record<string, unknown>` thành typed map sử dụng `ThemeLayoutEntry`.
4. Tạo typed data contracts cho mỗi required layout — core dùng các types này để fetch đúng data:
  - `HomeLayoutData` — `{ posts, categories }`
  - `PostLayoutData` — `{ post, relatedPosts, comments? }`
  - `CategoryLayoutData` — `{ category, posts }`
  - `PageLayoutData` — `{ page }`
  - `NotFoundLayoutData` — `{}`
5. Tạo `ThemeMenuZone` type cho navigation contract tối thiểu:
  - `primary` — main navigation
  - `footer` — footer links
  - `mobile?` — optional mobile-specific menu
6. Tạo `ThemeMenuItem` interface:
  - `label`, `url`, `target?`, `children?`
7. Chốt rằng theme **chỉ khai báo menu zones** — dữ liệu menu items thật do admin/plugin cung cấp.
8. Chừa convention cho future layout variants (ví dụ `post.default`, `post.fullWidth`) nhưng **không implement variants ở plan này** — variants thuộc plan 14.
9. Ghi rõ trong rule file rằng required layouts, menu zones, và layout data contracts là bắt buộc cho mọi theme official/community.

## Acceptance

- Types thể hiện rõ theme nào “đủ chuẩn MVP” và theme nào chưa đủ layouts.
- Các plan admin/settings/activation có thể validate trên cùng một contract.

## Rendering Mechanism — Đã chốt

> **Eta templates + render function pattern.**
>
> - Mỗi layout entry = path tới file `.eta` + optional `data()` hook.
> - Core đăng ký Hono routes, fetch default data theo layout key, gọi `data()` nếu có, render Eta → trả HTML.
> - Client-side interactivity (Vue/React) là plugin concern (`plugin-vue`, `plugin-react`), không phải theme responsibility.
> - Xem type shapes tại plan 02 (`ThemeLayoutEntry`, `LayoutContext`).

## Out of scope

- Render logic/engine implementation.
- Visual builder.
- Slot/block registration.

