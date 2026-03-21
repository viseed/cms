---
name: Theme Admin Install Uninstall
overview: Bổ sung install và uninstall flows cho Theme, tách riêng khỏi activate flow.
isProject: false
---

# Theme Admin Install Uninstall

## Goal

Cho phép cài và gỡ theme khỏi hệ thống mà chưa chạm tới chuyện switch active theme.

## Depends on

- [theme_04_persistence.plan.md](theme_04_persistence.plan.md)
- [theme_07_admin_catalog_read.plan.md](theme_07_admin_catalog_read.plan.md)

## Scope

- Admin API cho install/uninstall theme.
- Registry/client contract để sau này fetch manifest bundle theme.
- CLI parity tối thiểu cho manual code-based theme install.

## Files

- Modify: [packages/core/src/hana-cms.ts](../../packages/core/src/hana-cms.ts)
- Modify: [packages/registry/src/registry-client.ts](../../packages/registry/src/registry-client.ts)
- Modify: [packages/registry/src/index.ts](../../packages/registry/src/index.ts)
- Modify: [packages/cli/src/commands/plugin.ts](../../packages/cli/src/commands/plugin.ts)
- Create: [packages/cli/src/commands/theme.ts](../../packages/cli/src/commands/theme.ts)
- Modify: [apps/admin/src/views/ThemesView.vue](../../apps/admin/src/views/ThemesView.vue)
- Modify: [packages/schema/src/tables/installed-themes.ts](../../packages/schema/src/tables/installed-themes.ts)

## Tasks

1. Thêm registry client methods riêng cho theme:
   - fetch available themes
   - fetch theme manifest
   - verify/load theme bundle
2. Thêm admin endpoints:
   - `POST /api/admin/themes/:name/install`
   - `POST /api/admin/themes/:name/uninstall`
3. Persist installed theme metadata vào bảng themes.
4. Tạo CLI command theme tương tự plugin command để hỗ trợ “cài thủ công nếu có code”.
5. Chỉ cho uninstall khi theme đó không active, hoặc trả lỗi rõ ràng.

## Acceptance

- Theme install/uninstall có đường đi riêng, không dựa vào plugin endpoints hiện có.
- Manual code-based theme workflow có CLI surface tối thiểu.

## Out of scope

- Activate theme.
- Preview theme.
- Theme settings.
