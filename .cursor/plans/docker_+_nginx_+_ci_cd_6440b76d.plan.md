---
name: Docker + Nginx + CI/CD
overview: Containerize the Hana CMS monorepo, run 2 starter instances on separate ports, route by domain via Nginx, and add a GitHub Actions workflow with selective deploy support.
todos:
  - id: modify-port
    content: Modify apps/starter/src/index.ts to read PORT from env variable
    status: completed
  - id: dockerfile
    content: Create multi-stage Dockerfile at root using oven/bun:1-alpine
    status: completed
  - id: docker-compose
    content: Create docker-compose.yml with app1, app2, nginx services (no postgres — using DO managed DB)
    status: completed
  - id: nginx-conf
    content: Create nginx/nginx.conf with virtual host routing for domain1/domain2
    status: completed
  - id: env-examples
    content: Create .env.app1.example and .env.app2.example
    status: completed
  - id: github-actions
    content: Create .github/workflows/deploy.yml with workflow_dispatch and target choice (all/app1/app2)
    status: completed
  - id: db-migrate-workflow
    content: Create .github/workflows/db-migrate.yml — separate manual workflow to run drizzle-kit migrate safely
    status: completed
isProject: false
---

# Docker + Nginx + CI/CD Setup

## Base image recommendation

Use **`oven/bun:1-alpine`** - đây là official Bun image, Alpine-based, rất nhỏ (~90MB), Bun binary tự-contained nên không lo thiếu thư viện native. Debian-slim (~150MB) chỉ nên dùng nếu có native addon cần glibc.

## Files cần tạo/chỉnh sửa

### 1. Modify `apps/starter/src/index.ts`

Cần cho `PORT` configurable qua env variable:

```ts
export default {
  port: Number(process.env.PORT) || 3000,
  fetch: app.fetch,
}
```

### 2. `Dockerfile` (root)

Multi-stage build — 2 stages:
- `deps`: copy tất cả `package.json` của các workspace, chạy `bun install --frozen-lockfile`
- `runner`: copy source + node_modules, chạy app với `bun run apps/starter/src/index.ts`

```
oven/bun:1-alpine (deps)  →  oven/bun:1-alpine (runner)
```

Non-root user (`bunuser`) cho security. `PORT` env var expose ra ngoài.

### 3. `docker-compose.yml` (root)

3 services (không có postgres — dùng DO managed DB):

| Service | Image | Internal port | Exposed port |
|---------|-------|--------------|-------------|
| `app1` | build from Dockerfile | 3000 | 3001 (internal only) |
| `app2` | build from Dockerfile | 3000 | 3002 (internal only) |
| `nginx` | nginx:alpine | 80, 443 | 80, 443 |

- `app1` và `app2` dùng cùng image, khác nhau ở `PORT`, `DATABASE_URL`
- Mỗi app dùng `env_file: .env.app1` / `env_file: .env.app2`
- nginx depends on app1, app2; các app port **không** expose ra host, chỉ nginx mới public
- Cả 2 app mount volume `./ca-certificate.crt:/app/ca-certificate.crt:ro` để SSL cert sẵn trong container

### SSL Certificate với Digital Ocean

DO managed Postgres yêu cầu `sslmode=verify-full` với CA cert. Cần:

1. Download CA cert từ DO Control Panel → Database → Connection Details → **CA Certificate**
2. Đặt file `ca-certificate.crt` tại root project (thêm vào `.gitignore`)
3. Mount vào container qua docker-compose volume (read-only)
4. DATABASE_URL trong `.env` dùng path tuyệt đối bên trong container:

```
sslrootcert=/app/ca-certificate.crt
```

### 4. `nginx/nginx.conf`

Virtual host routing:

```
domain1.com  →  proxy_pass http://app1:3000
domain2.com  →  proxy_pass http://app2:3000
```

Include các header chuẩn: `X-Real-IP`, `X-Forwarded-For`, WebSocket upgrade support, `client_max_body_size`.

### 5. `.env.app1.example` + `.env.app2.example`

```env
PORT=3000
DATABASE_URL=postgresql://doadmin:YOUR_PASSWORD@private-dbaas-db-xxxx.h.db.ondigitalocean.com:25060/defaultdb?sslmode=verify-full&sslrootcert=/app/ca-certificate.crt
```

> Credentials thực tế không commit vào repo — chỉ commit `.example` files. File `.env.app1` / `.env.app2` thực phải có trên server.

### 6. `.github/workflows/deploy.yml`

`workflow_dispatch` với input:

```yaml
inputs:
  target:
    description: 'Deploy target'
    required: true
    default: 'all'
    type: choice
    options: [all, app1, app2]
```

Flow:

```mermaid
flowchart TD
    A[workflow_dispatch] --> B{target?}
    B -->|all| C["docker compose up -d --build app1 app2 nginx"]
    B -->|app1| D["docker compose up -d --build app1"]
    B -->|app2| E["docker compose up -d --build app2"]
    C --> F[SSH into server via appleboy/ssh-action]
    D --> F
    E --> F
```

**Secrets cần setup trên GitHub:**
- `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `SSH_PORT`
- Strategy: SSH vào server → `git pull` → `docker compose up -d --build <target>`

### 7. `.github/workflows/db-migrate.yml`

Workflow riêng để chạy migration an toàn — **không** tự động theo deploy:

```yaml
on:
  workflow_dispatch:  # chỉ chạy khi trigger tay
```

Flow:
1. SSH vào server
2. Chạy `docker compose run --rm app1 bun run db:migrate` (dùng app1 container làm runner)
3. Exit với error nếu migration fail — **không** tiếp tục deploy

**Quy trình đúng khi thay đổi schema:**

```mermaid
flowchart LR
    A["Sửa schema file"] --> B["bun run db:generate"]
    B --> C["Review SQL file trong drizzle/"]
    C --> D["git commit + push"]
    D --> E["Trigger db-migrate.yml thủ công"]
    E --> F["db:migrate chạy trên server"]
    F --> G["Trigger deploy.yml để deploy app mới"]
```

> `db:push` chỉ dùng local dev. `db:migrate` dùng cho production.

**Secrets bổ sung không cần thêm** — dùng chung `SSH_*` với deploy.yml.

## File structure sau khi xong

```
cms/
├── Dockerfile
├── docker-compose.yml
├── .env.app1.example
├── .env.app2.example
├── ca-certificate.crt          ← download từ DO, thêm vào .gitignore
├── nginx/
│   └── nginx.conf
├── .github/
│   └── workflows/
│       ├── deploy.yml          ← deploy app (chọn app1/app2/all)
│       └── db-migrate.yml      ← chạy migration tay khi đổi schema
└── apps/starter/src/index.ts   (modified — PORT từ env)
```
