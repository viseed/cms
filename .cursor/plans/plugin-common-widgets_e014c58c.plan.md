---
name: plugin-common-widgets
overview: Tạo plugin `@viseed/plugin-common-widgets` cung cấp 2 widget cơ bản (Tabs, Q&A) hỗ trợ rich content; tách RichTextEditor ra `@viseed/ui` để các plugin tương lai dùng chung; fix luôn TipTap preview đang truyền config rỗng.
todos:
  - id: shared-rte
    content: Add RichTextEditor.vue + barrel to packages/ui/src/vue/, update @viseed/ui package.json (export ./vue + tiptap deps)
    status: completed
  - id: scaffold-plugin
    content: Scaffold plugins/plugin-common-widgets/ (package.json, tsconfig, bunup.config, build-admin.ts, build-public.ts, src/index.ts factory)
    status: completed
  - id: tabs-widget
    content: Implement TabsConfigForm.vue (repeater + RichTextEditor for each tab) + TabsRenderer.vue (vertical/horizontal layout)
    status: completed
  - id: qa-widget
    content: Implement QaConfigForm.vue (repeater + RichTextEditor for each answer) + QaRenderer.vue (single-open accordion)
    status: completed
  - id: fix-preview
    content: Fix apps/admin/src/components/editor/WidgetEmbedView.vue to pass real config to previewComponent
    status: completed
  - id: wire-starter
    content: Add cms.use(commonWidgetsPlugin()) in apps/starter/src/index.ts; verify root workspace picks up new plugin
    status: completed
  - id: update-rules
    content: Update .cursor/rules/03-package-map.mdc, 04-dependency-rules.mdc, 05-plugin-api-contract.mdc per meta-rule (last updated + new entries)
    status: completed
isProject: false
---

# Plugin common-widgets — Tabs & Q&A widgets

## Mục tiêu

- Plugin npm `@viseed/plugin-common-widgets` đăng ký 2 widget types: `common-widgets/tabs`, `common-widgets/qa`.
- Tabs hỗ trợ vertical/horizontal, Q&A là single-open accordion (yêu cầu của anh).
- Tab content + Q&A answer là rich content (HTML từ TipTap).
- Tách `RichTextEditor` thành shared component trong `@viseed/ui` để các plugin rich-content tương lai dùng chung.
- Fix `WidgetEmbedView.vue` để TipTap preview nhận config thật.

## Cơ chế widget hiện tại đã hỗ trợ

- `widgets.config` là `jsonb` → nested arrays (`tabs[]`, `items[]`) lưu trực tiếp, không cần đổi schema (`[packages/schema/src/tables/widgets.ts](packages/schema/src/tables/widgets.ts)`).
- Form admin là Vue component thuần với props `modelValue`/emit `update:modelValue` → tự do thiết kế repeater UI.
- Build pipeline đã chuẩn: `bunup` cho server entry + Vite lib mode cho `dist/admin/index.js` và `dist/public/index.js` (xem `[plugins/plugin-blog/build-admin.ts](plugins/plugin-blog/build-admin.ts)`, `[plugins/plugin-blog/build-public.ts](plugins/plugin-blog/build-public.ts)`).

→ Không cần thay đổi core widget contract. Chỉ thêm shared editor + scaffold plugin mới + fix preview.

## Quyết định kiến trúc

### 1. Shared `RichTextEditor` trong `@viseed/ui`

- Thêm Vue source files vào `packages/ui/src/vue/`. Export qua subpath `"@viseed/ui/vue"` map thẳng đến source `.ts`/`.vue` (consumer Vite tự compile qua `@vitejs/plugin-vue`).
- API tối giản: `defineProps<{ modelValue: string; placeholder?: string }>()`, `defineEmits<{ 'update:modelValue': [string] }>()`. Lưu HTML (qua `editor.getHTML()`) thay vì JSON → public renderer chỉ cần `v-html`.
- TipTap extensions cốt lõi: `StarterKit`, `Link`, `Image`, `TextAlign`, `Underline`. (Subset của admin `[apps/admin/src/components/ContentEditor.vue](apps/admin/src/components/ContentEditor.vue)`, không có Table/Color/Widget-embed cho lần đầu — đủ cho tab/Q&A content.)
- Image picker: dùng URL prompt đơn giản (`window.prompt`). Tương lai có thể nhận `mediaPicker` callback prop.
- Plugin admin bundle externalize `vue`, `vue-router` nhưng KHÔNG external `@tiptap/*` → mỗi plugin admin bundle inline TipTap (~150KB). Đơn giản, không động vào admin import map. Nếu sau này có nhiều plugin rich-content thì optimize bằng cách thêm tiptap vào vendor entries (out of scope).
- `@viseed/ui/package.json` thêm `@tiptap/*` vào `dependencies` để plugins resolve được khi build.

### 2. Storage format cho widget config

```ts
// common-widgets/tabs
interface TabsConfig {
  orientation: 'vertical' | 'horizontal'
  tabs: Array<{ id: string; title: string; content: string /* HTML */ }>
}

// common-widgets/qa
interface QaConfig {
  items: Array<{ id: string; question: string; answer: string /* HTML */ }>
}
```

`id` random qua `crypto.randomUUID()` để Vue `:key` ổn định khi reorder.

### 3. Sơ đồ data flow

```mermaid
flowchart LR
  Admin[WidgetsView form] -- v-model --> Form[TabsConfigForm or QaConfigForm]
  Form -- HTML string --> RTE[RichTextEditor uses TipTap]
  Form -- POST/PUT --> API[/api/admin/widgets]
  API -- jsonb --> DB[(widgets table)]
  Public[Theme page placeholder] -- fetch --> Hydration[/api/widgets/:id]
  Hydration -- config --> Renderer[TabsRenderer or QaRenderer]
  Renderer -- v-html --> DOM
```

## Cấu trúc thư mục mới

```
plugins/plugin-common-widgets/
├── package.json
├── tsconfig.json
├── bunup.config.ts
├── build-admin.ts
├── build-public.ts
└── src/
    ├── index.ts                       # commonWidgetsPlugin() factory
    ├── admin/
    │   ├── index.ts                   # barrel
    │   ├── TabsConfigForm.vue
    │   └── QaConfigForm.vue
    └── public/
        ├── index.ts                   # barrel
        ├── TabsRenderer.vue
        └── QaRenderer.vue

packages/ui/src/vue/
├── index.ts                           # export RichTextEditor
└── RichTextEditor.vue
```

## Thay đổi ngoài plugin

- `[packages/ui/package.json](packages/ui/package.json)`: thêm export `"./vue"` → `"./src/vue/index.ts"`; thêm dependencies `@tiptap/core`, `@tiptap/vue-3`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/extension-text-align`, `@tiptap/extension-underline`.
- `[apps/admin/src/components/editor/WidgetEmbedView.vue](apps/admin/src/components/editor/WidgetEmbedView.vue)`: extend `WidgetSummary` thêm `config: Record<string, unknown>`, sửa template `<component :is="previewComponent" :config="widgetInfo?.config ?? {}" />`. Endpoint `GET /api/admin/widgets/:id` đã trả về `config` nên không cần thay đổi backend.
- `[apps/starter/src/index.ts](apps/starter/src/index.ts)`: thêm `cms.use(commonWidgetsPlugin())` để demo.

## Convention preview

Mirror plugin-blog: admin barrel re-export public renderer làm `previewComponent` (anh xem `[plugins/plugin-blog/src/admin/index.ts](plugins/plugin-blog/src/admin/index.ts)`). Khi nhúng widget vào ContentEditor, người dùng thấy preview thật (sau khi fix bước trên).

## Public renderer behavior

- **TabsRenderer**: state `activeId = ref(tabs[0].id)`. Vertical mode: flex-row với sidebar trái. Horizontal mode: flex-col với tab strip trên. Tab nội dung render bằng `v-html`.
- **QaRenderer**: state `openId = ref(null)`. Click question: nếu trùng `openId` → đóng (set null), khác → set thành id mới (đóng cái cũ). Đảm bảo "Mỗi lúc chỉ xem được 1 câu trả lời".

## Update rules (theo meta-rule)

- `[.cursor/rules/03-package-map.mdc](.cursor/rules/03-package-map.mdc)`: thêm row `plugins/plugin-common-widgets` vào bảng Plugins; cập nhật `Last updated`.
- `[.cursor/rules/04-dependency-rules.mdc](.cursor/rules/04-dependency-rules.mdc)`: ghi nhận `@viseed/ui` giờ có Vue source export `./vue` (consumer chịu trách nhiệm bundle); cập nhật `Last updated`.
- `[.cursor/rules/05-plugin-api-contract.mdc](.cursor/rules/05-plugin-api-contract.mdc)`: ghi chú "preview component giờ nhận `config` thật" + cập nhật `Last updated`.

## Out of scope (lần này)

- Không thêm TipTap vào admin import map (Approach B); để optimization sau.
- Không build `@viseed/ui/vue` thành dist/JS (consumer plugin Vite tự compile từ source).
- Không thêm media picker callback vào RichTextEditor.
- Không thay đổi widget CRUD API hay schema.
- Không tạo theme nào dùng widget — anh tự nhúng vào theme insurance/blog hoặc qua ContentEditor sau.

## Test scope

- Build plugin chạy được (`bun run build` trong plugin folder ra đủ `dist/index.js`, `dist/admin/index.js`, `dist/public/index.js`).
- Chạy `apps/starter`, đăng nhập admin, mở Widgets, tạo Tabs widget với 3 tabs có rich content + Q&A widget với 5 câu, lưu thành công.
- Nhúng vào ContentEditor (Pages/Posts), thấy preview thật.
- Public site: hydrate và tương tác (chuyển tab, mở/đóng câu hỏi).
