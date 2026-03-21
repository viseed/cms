---
name: Theme Admin Catalog Read
overview: Thêm read-only catalog cho themes trong admin API và admin app trước khi hỗ trợ install hay activate.
isProject: false
---

# Theme Admin Catalog Read

## Goal

Cho admin nhìn thấy danh sách themes đã cài và theme khả dụng mà chưa thêm các action mutating như install hoặc activate.

## Depends on

- [theme_03_manifest_registry_contract.plan.md](theme_03_manifest_registry_contract.plan.md)
- [theme_05_runtime_mounting.plan.md](theme_05_runtime_mounting.plan.md)
- [theme_06_layout_contract.plan.md](theme_06_layout_contract.plan.md)

## Scope

- Admin API read-only cho themes.
- Admin route/view riêng cho catalog themes.
- Không thêm install/uninstall buttons trong plan này.

## Files

- Modify: [packages/core/src/hana-cms.ts](../../packages/core/src/hana-cms.ts)
- Create: [apps/admin/src/views/ThemesView.vue](../../apps/admin/src/views/ThemesView.vue)
- Modify: [apps/admin/src/main.ts](../../apps/admin/src/main.ts)
- Optional modify: [apps/admin/src/layouts/AdminLayout.vue](../../apps/admin/src/layouts/AdminLayout.vue)

## Tasks

1. Thêm endpoint read-only, ví dụ:
   - `GET /api/admin/themes`
   - `GET /api/admin/themes/active`
2. Tạo `ThemesView.vue` song song với [apps/admin/src/views/PluginsView.vue](../../apps/admin/src/views/PluginsView.vue), nhưng chỉ đọc dữ liệu.
3. Thêm route `/themes` vào router admin.
4. Nếu nav admin cần, thêm menu item mới nhưng giữ UI tối giản.
5. Trả về đủ fields để UI hiển thị:
   - name
   - version
   - description
   - installed
   - active
   - missingRequiredLayouts

## Acceptance

- Admin đã có “Theme catalog” riêng, tách biệt khỏi “Plugin Marketplace”.
- Chưa có action mutating nên rủi ro rollout thấp.

## Out of scope

- Install/uninstall.
- Activate/deactivate.
- Settings editor.
