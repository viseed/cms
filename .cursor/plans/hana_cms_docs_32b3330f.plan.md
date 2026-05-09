---
name: Hana CMS Docs
overview: Mở rộng VitePress site tại `apps/docs` thành tài liệu core guide cho external developer — getting started, cấu hình, database, plugins (tổng quan), themes, CLI, media và deployment.
todos:
  - id: audit-existing
    content: Đọc và audit nội dung các file docs hiện có để giữ lại phần đúng
    status: pending
  - id: update-getting-started
    content: Viết/update guide/getting-started.md — hanabi init flow + manual install
    status: pending
  - id: update-configuration
    content: Viết/update guide/configuration.md — CMSConfig đầy đủ + env vars
    status: pending
  - id: update-database
    content: Viết/update guide/database.md — db push vs generate/migrate, schema merging
    status: pending
  - id: update-plugins-guide
    content: Viết/update guide/plugins.md — cms.use() API, plugin lifecycle, danh sách built-in plugins
    status: pending
  - id: new-themes-guide
    content: Viết mới guide/themes.md — CMSTheme interface, multi-theme, hot-swap
    status: pending
  - id: new-cli
    content: Viết mới guide/cli.md — tất cả hanabi commands
    status: pending
  - id: new-media
    content: Viết mới guide/media.md — media upload config và API
    status: pending
  - id: new-deployment
    content: Viết mới guide/deployment.md — Docker, env vars, nginx
    status: pending
  - id: update-homepage
    content: Update index.md — homepage hero + feature highlights
    status: pending
  - id: update-vitepress-config
    content: Update .vitepress/config.ts — sidebar/nav cho cấu trúc mới
    status: pending
isProject: false
---

# Hana CMS Developer Docs Plan

## Phạm vi

Mở rộng [`apps/docs/`](apps/docs/) — VitePress site hiện có. Không tạo site mới.

Target: external developer muốn dùng Hana CMS cho project của họ.

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
│   ├── getting-started.md        UPDATE — quick start via hanabi init
│   ├── configuration.md          UPDATE — CMSConfig đầy đủ
│   ├── database.md               UPDATE — db push vs generate/migrate
│   ├── plugins.md                UPDATE — cms.use() API, lifecycle, danh sách built-in
│   ├── themes.md                 NEW — CMSTheme + multi-theme hot-swap
│   ├── media.md                  NEW — upload dir, maxFileSizeMb, API
│   ├── cli.md                    NEW — hanabi init/db/plugin/theme
│   └── deployment.md             NEW — Docker + env vars production
└── plugins/
    └── overview.md               UPDATE — tổng quan (giữ lại, cập nhật nếu lệch)
```

`plugins/auth.md`, `plugins/blog.md`, `plugins/menu.md`, `plugins/pages.md`, `themes/` — **không làm**.

---

## Chi tiết từng file quan trọng

### `guide/getting-started.md` (UPDATE)
Dựa trên `hanabi init` flow từ [`packages/cli/src/commands/init.ts`](packages/cli/src/commands/init.ts):

```bash
# Prerequisites: Bun >= 1.3, PostgreSQL
bunx hanabi init my-site
cd my-site
bun install
export DATABASE_URL="postgresql://user:pass@localhost:5432/hana"
bunx hanabi db push
bun run dev
# Admin: http://localhost:3000/admin
# Default credentials: admin@local.dev / 12345678
```

Hoặc manual (không CLI):
```bash
bun add @hana/core @hana/plugin-auth @hana/plugin-blog
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
| `hanabi init <name>` | Scaffold project mới |
| `hanabi db push` | Dev: push schema trực tiếp |
| `hanabi db generate` | Prod: gen SQL migrations |
| `hanabi db migrate` | Prod: apply migrations |
| `hanabi plugin install/uninstall <pkg>` | Quản lý plugins |
| `hanabi theme install/uninstall <pkg>` | Quản lý themes |

### `guide/deployment.md` (NEW)
Từ [`Dockerfile`](Dockerfile) và [`docker-compose.yml`](docker-compose.yml):
- Build image: `docker build -t hana-cms .`
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