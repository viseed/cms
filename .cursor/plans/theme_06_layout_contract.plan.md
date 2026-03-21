---
name: Theme Layout Contract
overview: Định nghĩa required layouts và shape dữ liệu tối thiểu cho Theme layouts.
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
- Modify: [`.cursor/rules/08-theme-api-contract.mdc`](../rules/08-theme-api-contract.mdc)

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
3. Cập nhật `CMSTheme.layouts` để không còn là `unknown` map chung chung.
4. Chốt convention cho future variants, ví dụ:
   - `post.default`
   - `post.fullWidth`
5. Ghi rõ trong rule file rằng required layouts là contract bắt buộc của mọi theme official/community.

## Acceptance

- Types thể hiện rõ theme nào “đủ chuẩn MVP” và theme nào chưa đủ layouts.
- Các plan admin/settings/activation có thể validate trên cùng một contract.

## Out of scope

- Render data cho từng layout.
- Visual builder.
- Slot/block registration.
