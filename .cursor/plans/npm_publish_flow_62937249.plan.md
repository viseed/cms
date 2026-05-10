---
name: NPM Publish Flow
overview: Đổi scope toàn project từ `@viseed/` → `@viseed/`, sau đó tạo umbrella package `viseed` (re-export từ @viseed/* + admin dist), publish riêng từng `@viseed/*` core package, plugin `viseed-plugin-*`, và theme `viseed-theme-*`.
todos:
  - id: rename-scope
    content: Chạy PowerShell global find-replace @viseed/ → @viseed/ toàn project, sau đó bun install + verify build
    status: completed
  - id: create-viseed-cms-pkg
    content: Tạo packages/viseed/ với package.json, src/index.ts, src/cli.ts, bunup.config.ts, turbo.json
    status: completed
  - id: mark-private
    content: Thêm private:true vào @viseed/cli và @viseed/config
    status: completed
  - id: rename-plugins
    content: Đổi "name" field của 4 plugins từ @viseed/plugin-* → viseed-plugin-*
    status: completed
  - id: rename-themes
    content: Đổi "name" field của 2 themes từ @viseed/theme-* → viseed-theme-*
    status: completed
  - id: update-changeset-config
    content: Cập nhật .changeset/config.json — linked @viseed/* core, ignore cli/config/admin/docs/starter
    status: completed
  - id: update-turbo-root
    content: Thêm publish task vào turbo.json root, thêm packages/viseed-cms vào workspace
    status: completed
  - id: add-npmrc
    content: Tạo .npmrc với access=public
    status: completed
  - id: update-rules
    content: Cập nhật .cursor/rules/*.mdc — đổi @viseed/ → @viseed/ và thêm viseed-cms, viseed-plugin-*, viseed-theme-* vào package map
    status: completed
  - id: github-actions
    content: Tạo .github/workflows/publish.yml theo Changesets pattern
    status: completed
isProject: false
---

# NPM Publish Flow — Viseed CMS

## Prerequisite — Tạo npm org `@viseed`

Các core packages dùng scope `@viseed/`, cần tạo npm org trước:
1. Đăng nhập npmjs.com → "Create Organization" → tên `viseed`
2. Thêm `NPM_TOKEN` vào GitHub Secrets

---

## Mục tiêu

| Publish lên npm | Không publish |
|---|---|
| `viseed` (umbrella + admin dist) | `@viseed/cli`, `@viseed/config` (private) |
| `@viseed/core`, `@viseed/schema`, `@viseed/types`, `@viseed/validator`, `@viseed/ui`, `@viseed/registry` | `@viseed/admin`, `@viseed/docs`, `@viseed/starter` |
| `viseed-plugin-auth`, `viseed-plugin-blog`, `viseed-plugin-menu`, `viseed-plugin-pages` | |
| `viseed-theme-blog`, `viseed-theme-insurance` | |

---

## 1. Đổi scope toàn project `@viseed/` → `@viseed/`

Đây là bước đầu tiên, trước khi làm bất kỳ thứ gì khác.

**Approach:** PowerShell one-liner global find-replace trên toàn bộ text files (loại trừ `bun.lock`, `node_modules`, `dist`):

```powershell
Get-ChildItem -Path "d:\projects\cms" -Recurse `
  -Include "*.ts","*.vue","*.json","*.md","*.mdc","*.html","*.yaml","*.yml","*.toml" |
  Where-Object {
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -notmatch "\\dist\\" -and
    $_.FullName -notmatch "\\.turbo\\"
  } |
  ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    if ($content -match "@viseed/") {
      $newContent = $content -replace "@viseed/", "@viseed/"
      Set-Content $_.FullName $newContent -NoNewline -Encoding UTF8
    }
  }
```

Sau khi chạy:
- `bun install` — regenerate `bun.lock`
- `bun run build` — verify build không bị broken

**Tổng số files bị ảnh hưởng:** ~100 files, ~443 occurrences (không tính `bun.lock`).

---

## 2. Tạo `packages/viseed/` — umbrella package

`viseed` là entry point cho người dùng cuối: re-export từ `@viseed/*`, bao gồm admin dist, và expose CLI bin.

**`packages/viseed/package.json`**
```json
{
  "name": "viseed",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./admin": "./dist/admin/index.html",
    "./admin/*": "./dist/admin/*"
  },
  "bin": { "viseed": "./dist/cli.js" },
  "files": ["dist"],
  "dependencies": {
    "@viseed/core": "workspace:*",
    "@viseed/schema": "workspace:*",
    "@viseed/types": "workspace:*",
    "@viseed/validator": "workspace:*",
    "@viseed/ui": "workspace:*",
    "@viseed/registry": "workspace:*",
    "@viseed/cli": "workspace:*"
  }
}
```

**`packages/viseed/src/index.ts`**
```ts
export * from '@viseed/core'
export * from '@viseed/schema'
export * from '@viseed/types'
export * from '@viseed/validator'
export * from '@viseed/ui'
export * from '@viseed/registry'
```

**`packages/viseed/src/cli.ts`**
```ts
export * from '@viseed/cli'
```

**`packages/viseed/bunup.config.ts`**
```ts
import { cp } from 'node:fs/promises'
import { defineConfig } from 'bunup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    external: [/^@viseed\//, 'drizzle-orm', 'hono', 'eta', /^@tiptap\//],
    onSuccess: async () => {
      await cp('../core/dist/admin', 'dist/admin', { recursive: true })
    },
  },
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    dts: false,
    external: [/^@viseed\//, 'drizzle-orm', /^@drizzle-kit/],
  },
])
```

**`packages/viseed/turbo.json`**
```json
{
  "extends": ["//"],
  "tasks": {
    "build": {
      "dependsOn": ["@viseed/admin#build", "^build"]
    }
  }
}
```

---

## 3. Đánh dấu packages không publish là private

Chỉ đánh `"private": true` cho 2 packages:
- [`packages/cli/package.json`](packages/cli/package.json) — CLI expose qua `viseed` bin, không publish riêng
- [`packages/config/package.json`](packages/config/package.json) — chỉ chứa tsconfig

(`@viseed/admin`, `@viseed/docs`, `@viseed/starter` đã `private: true` rồi.)

Các packages còn lại (`@viseed/core`, `@viseed/schema`, `@viseed/types`, `@viseed/validator`, `@viseed/ui`, `@viseed/registry`) **vẫn publish** để plugins có thể depend vào.

---

## 4. Đổi tên plugins

Sau khi bước 1 (rename scope) chạy xong, workspace name của plugins là `@viseed/plugin-*`. Chỉ cần đổi thêm field `"name"` sang tên npm:

| Tên workspace (sau rename) | Tên publish lên npm |
|---|---|
| `@viseed/plugin-auth` | `viseed-plugin-auth` |
| `@viseed/plugin-blog` | `viseed-plugin-blog` |
| `@viseed/plugin-menu` | `viseed-plugin-menu` |
| `@viseed/plugin-pages` | `viseed-plugin-pages` |

Khi changesets publish, `workspace:*` deps (`@viseed/types`, `@viseed/validator`...) tự động resolve thành version thực trong published `package.json`.

---

## 5. Đổi tên themes

| Tên workspace (sau rename) | Tên publish lên npm |
|---|---|
| `@viseed/theme-blog` | `viseed-theme-blog` |
| `@viseed/theme-insurance` | `viseed-theme-insurance` |

---

## 5. Cập nhật Changesets config

[`.changeset/config.json`](.changeset/config.json):
```json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [
    ["@viseed/core", "@viseed/schema", "@viseed/types", "@viseed/validator", "@viseed/ui", "@viseed/registry"]
  ],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": [
    "@viseed/cli", "@viseed/config",
    "@viseed/admin", "@viseed/docs", "@viseed/starter"
  ]
}
```

- `linked`: các core packages versioned cùng nhau
- Packages có thể publish: `viseed`, `@viseed/core`, `@viseed/schema`, `@viseed/types`, `@viseed/validator`, `@viseed/ui`, `@viseed/registry`, `viseed-plugin-*`, `viseed-theme-*`

---

## 6. Thêm publish task vào `turbo.json` (root)

```json
{
  "tasks": {
    "publish": {
      "dependsOn": ["build"],
      "cache": false
    }
  }
}
```

---

## 7. Thêm `.npmrc`

```ini
# .npmrc
access=public
```

---

## 8. GitHub Actions — publish workflow

Tạo `.github/workflows/publish.yml` theo pattern Changesets:
- Trigger: push lên `main`
- Bước 1: `bun run build` (turbo, skip docs)
- Bước 2: Changesets action — tạo "Version Packages" PR hoặc publish trực tiếp nếu có changeset
- Cần secret `NPM_TOKEN` trong GitHub repo

---

## Luồng publish hoàn chỉnh

```mermaid
flowchart TD
    A[bun changeset] --> B[Tạo changeset file]
    B --> C[PR merge vào main]
    C --> D[GitHub Actions trigger]
    D --> E[bun run build]
    E --> F["Build @viseed/* packages"]
    F --> G["Build @viseed/admin → core/dist/admin/"]
    G --> H[Build viseed-cms bundle + copy admin]
    H --> I[Build plugins + themes]
    I --> J[changeset version]
    J --> K[changeset publish]
    K --> L[npm: viseed]
    K --> O["npm: @viseed/core, @viseed/types..."]
    K --> M["npm: viseed-plugin-*"]
    K --> N["npm: viseed-theme-*"]
```

---

## Lưu ý quan trọng

**Thứ tự thực hiện:**
1. Chạy PowerShell rename (bước 1) trước tất cả
2. `bun install` để regenerate lock file
3. Verify build: `bun run build`
4. Mới bắt đầu tạo `packages/viseed-cms/` và các bước còn lại

**Về npm org `@viseed`**: Cần tạo org `@viseed` trên npmjs.com (free) trước khi publish lần đầu.

**Changeset files cũ**: Nếu có file nào trong `.changeset/` tham chiếu `@viseed/*`, xóa và tạo lại sau khi rename.
