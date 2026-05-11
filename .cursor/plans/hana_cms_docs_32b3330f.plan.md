---
name: Viseed CMS Docs
overview: Mở rộng VitePress site tại `apps/docs` thành tài liệu core guide cho external developer — getting started, cấu hình, database, plugins (tổng quan), themes, CLI, media và deployment.
todos:
  - id: audit-existing
    content: Đọc và audit nội dung các file docs hiện có để giữ lại phần đúng
    status: completed
  - id: update-getting-started
    content: Viết/update guide/getting-started.md — viseedbi init flow + manual install
    status: completed
  - id: update-configuration
    content: Viết/update guide/configuration.md — CMSConfig đầy đủ + env vars
    status: completed
  - id: update-database
    content: Viết/update guide/database.md — db push vs generate/migrate, schema merging
    status: completed
  - id: update-plugins-guide
    content: Viết/update guide/plugins.md — cms.use() API, plugin lifecycle, danh sách built-in plugins
    status: completed
  - id: new-themes-guide
    content: Viết mới guide/themes.md — CMSTheme interface, multi-theme, hot-swap
    status: completed
  - id: new-cli
    content: Viết mới guide/cli.md — tất cả viseedbi commands
    status: completed
  - id: new-media
    content: Viết mới guide/media.md — media upload config và API
    status: completed
  - id: new-deployment
    content: Viết mới guide/deployment.md — Docker, env vars, nginx
    status: completed
  - id: update-homepage
    content: Update index.md — homepage hero + feature highlights
    status: completed
  - id: update-vitepress-config
    content: Update .vitepress/config.ts — sidebar/nav cho cấu trúc mới
    status: completed
isProject: false
---

# Viseed CMS Developer Docs Plan

## Phạm vi

Mở rộng [`apps/docs/`](apps/docs/) — VitePress site hiện có. Không tạo site mới.

Target: external developer muốn dùng Viseed CMS cho project của họ.

---

## Kiến trúc hiện tại (cần giữ lại hoặc update)

Đã có sẵn:
- `apps/docs/index.md` — homepage
- `apps/docs/guide/getting-started.md`
- `apps/docs/guide/configuration.md`
- `apps/docs/guide/plugins.md`
- `apps/docs/guide/database.md`
- `apps/docs/plugins/overview.md`
- `apps/docs/.vitepress/config.ts` — sidebar/nav config

---

## Cấu trúc docs mới

```
apps/docs/
├── index.md                      UPDATE — homepage hero + feature list
├── guide/
│   ├── getting-started.md        UPDATE — quick start via viseedbi init
│   ├── configuration.md          UPDATE — CMSConfig đầy đủ
│   ├── database.md               UPDATE — db push vs generate/migrate
│   ├── plugins.md                UPDATE — cms.use() API, lifecycle, danh sách built-in
│   ├── themes.md                 NEW — CMSTheme + multi-theme hot-swap
│   ├── media.md                  NEW — upload dir, maxFileSizeMb, API
│   ├── cli.md                    NEW — viseedbi init/db/plugin/theme
│   └── deployment.md             NEW — Docker + env vars production
└── plugins/
    └── overview.md               UPDATE — tổng quan (giữ lại, cập nhật nếu lệch)
```

`plugins/auth.md`, `plugins/blog.md`, `plugins/menu.md`, `plugins/pages.md`, `themes/` — **không làm**.

---

## Chi tiết từng file quan trọng

### `guide/getting-started.md` (UPDATE)
Dựa trên `viseedbi init` flow từ [`packages/cli/src/commands/init.ts`](packages/cli/src/commands/init.ts):

```bash
# Prerequisites: Bun >= 1.3, PostgreSQL
bunx viseedbi init my-site
cd my-site
bun install
export DATABASE_URL="postgresql://user:pass@localhost:5432/hana"
bunx viseedbi db push
bun run dev
# Admin: http://localhost:3000/admin
# Default credentials: admin@local.dev / 12345678
```

Hoặc manual (không CLI):
```bash
bun add @viseed/core @viseed/plugin-auth @viseed/plugin-blog
```

### `guide/configuration.md` (UPDATE)
Từ `CMSConfig` trong [`packages/types/src/cms.ts`](packages/types/src/cms.ts):
- `db` — `driver: 'postgres'`, `url`
- `admin` — `path?`, `enabled?`, `bootstrapAdmin?` (email/password/name)
- `plugins` — array `CMSPlugin`
- `themes` + `defaultTheme` — multi-theme
- `server` — `port`, `hostname`
- `media` — `uploadDir`, `maxFileSizeMb`
- Env vars: `DATABASE_URL`, `PORT`, `HANA_ADMIN_EMAIL`, `HANA_ADMIN_PASSWORD`, `HANA_ADMIN_NAME`

### `guide/themes.md` (NEW)
Từ [`packages/types/src/theme.ts`](packages/types/src/theme.ts) và [`apps/starter/src/index.ts`](apps/starter/src/index.ts):
- `CMSTheme` interface (name, version, templateRoot, staticRoot, layouts, menuZones, settingsSchema)
- Multi-theme: `themes: [blogTheme(), insuranceTheme()]`, `defaultTheme: 'blog'`
- Hot-swap qua admin panel
- Companion plugin concept

### `guide/cli.md` (NEW)
Từ [`packages/cli/src/index.ts`](packages/cli/src/index.ts):

| Command | Mô tả |
|---------|--------|
| `viseedbi init <name>` | Scaffold project mới |
| `viseedbi db push` | Dev: push schema trực tiếp |
| `viseedbi db generate` | Prod: gen SQL migrations |
| `viseedbi db migrate` | Prod: apply migrations |
| `viseedbi plugin install/uninstall <pkg>` | Quản lý plugins |
| `viseedbi theme install/uninstall <pkg>` | Quản lý themes |

### `guide/deployment.md` (NEW)
Từ [`Dockerfile`](Dockerfile) và [`docker-compose.yml`](docker-compose.yml):
- Build image: `docker build -t viseed-cms .`
- Env vars bắt buộc: `DATABASE_URL`, `PORT`
- SSL cert: `NODE_EXTRA_CA_CERTS`, mount `ca-certificate.crt`
- Upload persistence: mount `/app/uploads`
- Nginx reverse proxy pattern

---

## Update `.vitepress/config.ts`

Thêm vào sidebar: các guide mới (`themes`, `media`, `cli`, `deployment`). Giữ lại section `plugins/` với `overview.md`. Bỏ links tới các file plugin/theme riêng lẻ nếu đã có.

---

## Thứ tự thực hiện

1. Audit các file hiện có → giữ lại phần đúng, bổ sung phần thiếu
2. Viết/update guide: getting-started → configuration → database → plugins → themes → media → cli → deployment
3. Update `plugins/overview.md`
4. Update homepage `index.md`
5. Update `.vitepress/config.ts`