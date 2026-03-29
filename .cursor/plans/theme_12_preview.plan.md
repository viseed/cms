---
name: Theme Preview
overview: Preview theme theo đường dẫn thư mục (vd themes/dark/preview) khi render — không ghi đè theme active; rollback không cần vì có thể kích hoạt lại theme cũ.
todos: []
isProject: false
---

# Theme Preview (path-based)

## Goal

Cho phép xem trước bất kỳ bản theme nào qua **đường dẫn thư mục** (ví dụ `themes/dark/preview`). Khi request đang ở chế độ preview, **resolve template/assets theo path đó** thay vì theme đang active. Theme active trong DB không đổi — muốn về giao diện cũ chỉ cần tắt preview hoặc activate lại theme trước đó qua flow hiện có (plan 11).

## Depends on

- [theme_11_activation_lifecycle.plan.md](theme_11_activation_lifecycle.plan.md)

## Scope

- Cơ chế preview: một giá trị preview path (hoặc theme id + convention `…/preview`) được đọc khi render.
- Core: nhánh resolve theme — nếu có preview hợp lệ thì dùng path đó, ngược lại dùng theme active như hiện tại.
- Admin: bật/tắt preview (và hiển thị trạng thái rõ ràng).

## Không làm (out of this plan)

- **Rollback** dạng lưu `previousThemeName` / API rollback — không cần; activation lifecycle đã đủ để đổi lại theme.
- Undo stack nhiều tầng.

## Files

- Modify: [packages/schema/src/tables/theme-state.ts](../../packages/schema/src/tables/theme-state.ts) — chỉ field liên quan preview path (hoặc session-only nếu chốt không persist).
- Modify: [packages/core/src/hana-cms.ts](../../packages/core/src/hana-cms.ts) — resolve theme cho render theo preview path khi có.
- Modify: [apps/admin/src/views/ThemesView.vue](../../apps/admin/src/views/ThemesView.vue)
- Optional: [apps/admin/src/composables/useThemePreview.ts](../../apps/admin/src/composables/useThemePreview.ts)

## Tasks

1. Chốt nơi lưu preview context: DB (`previewThemePath` hoặc tương đương) vs cookie/session chỉ cho admin — phải validate path nằm dưới root theme cho phép, chống path traversal.
2. Endpoint ví dụ: `POST /api/admin/themes/preview` (body: path hoặc `{ name, subdir: 'preview' }` → resolve thành `themes/dark/preview`), `DELETE` hoặc `POST …/preview/clear` để tắt.
3. **Render path:** mọi chỗ load theme cho front (Eta templates, static assets theme) gọi chung một helper: `effectiveThemeRoot = previewPath ?? activeThemeRoot`.
4. Chốt preview chỉ áp dụng cho **admin** hoặc có flag/query — tránh site public vô tình thấy preview nếu không mong muốn.
5. UI: badge/trạng thái `previewing` + đường dẫn đang xem; nút tắt preview.

## Acceptance

- Bật preview → render dùng đúng thư mục chỉ định (vd `themes/dark/preview`); tắt preview → về theme active.
- Không có API/state rollback riêng; tài liệu plan nêu rõ lý do (reactivate theme đủ).

## Out of scope

- Multi-environment preview.
- Shareable preview links công khai.
- Visual diff testing.
