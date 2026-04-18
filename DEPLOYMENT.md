# Deployment Guide

Hướng dẫn setup từ đầu để chạy Hana CMS trên VPS với Docker + Nginx + GitHub Actions.

---

## Mục lục

1. [Chuẩn bị VPS](#1-chuẩn-bị-vps)
2. [Cài Docker trên VPS](#2-cài-docker-trên-vps)
3. [Clone repo và cấu hình](#3-clone-repo-và-cấu-hình)
4. [Cấu hình DNS domain](#4-cấu-hình-dns-domain)
5. [Chạy lần đầu](#5-chạy-lần-đầu)
6. [Setup GitHub Actions](#6-setup-github-actions)
7. [Quy trình deploy hàng ngày](#7-quy-trình-deploy-hàng-ngày)
8. [Quy trình migrate schema](#8-quy-trình-migrate-schema)
9. [Xem log](#9-xem-log)

---

## 1. Chuẩn bị VPS

Yêu cầu tối thiểu: **Ubuntu 22.04 LTS**, 1 vCPU, 1 GB RAM.

SSH vào VPS:

```bash
ssh your-user@your-vps-ip
```

Tạo user riêng để deploy (khuyến nghị, không dùng root):

```bash
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy   # thêm sau khi cài Docker
```

---

## 2. Cài Docker trên VPS

```bash
# Cài Docker
curl -fsSL https://get.docker.com | sh

# Kiểm tra
docker --version
docker compose version

# Cho phép user hiện tại dùng Docker không cần sudo
sudo usermod -aG docker $USER
newgrp docker
```

---

## 3. Clone repo và cấu hình

### 3.1 Clone repo

```bash
# Tạo thư mục project (có thể đổi path tuỳ ý)
mkdir -p /opt/cms
cd /opt/cms

# Clone repo (dùng SSH key hoặc HTTPS)
git clone git@github.com:your-org/cms.git .
```

### 3.2 Đặt CA Certificate của Digital Ocean

Vào **DO Control Panel → Databases → chọn DB → Connection Details → Download CA Certificate**.

Upload file lên VPS:

```bash
# Chạy lệnh này trên máy local của bạn
scp ca-certificate.crt your-user@your-vps-ip:/opt/cms/ca-certificate.crt
```

Hoặc copy nội dung file rồi paste trực tiếp trên VPS:

```bash
nano /opt/cms/ca-certificate.crt
# Paste nội dung cert vào, Ctrl+X → Y → Enter để lưu
```

### 3.3 Tạo file .env cho từng app

```bash
cd /opt/cms

cp .env.app1.example .env.app1
cp .env.app2.example .env.app2
```

Chỉnh sửa `.env.app1`:

```bash
nano .env.app1
```

Điền thông tin thực tế:

```env
PORT=3000
DATABASE_URL=postgresql://doadmin:YOUR_ACTUAL_PASSWORD@private-dbaas-db-xxxx.h.db.ondigitalocean.com:25060/defaultdb?sslmode=verify-full&sslrootcert=/app/ca-certificate.crt
```

Làm tương tự với `.env.app2` (có thể dùng cùng DATABASE_URL hoặc DB riêng tuỳ Sếp).

### 3.4 Chỉnh domain trong nginx.conf

```bash
nano /opt/cms/nginx/nginx.conf
```

Thay `site1.example.com` và `site2.example.com` bằng domain thật:

```nginx
server {
    listen      80;
    server_name your-domain-1.com;   # ← sửa ở đây
    ...
}

server {
    listen      80;
    server_name your-domain-2.com;   # ← sửa ở đây
    ...
}
```

---

## 4. Cấu hình DNS domain

Trỏ **A record** của cả 2 domain về IP của VPS:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` hoặc `your-domain-1.com` | `<VPS IP>` | 3600 |
| A | `@` hoặc `your-domain-2.com` | `<VPS IP>` | 3600 |

Kiểm tra DNS đã propagate chưa:

```bash
nslookup your-domain-1.com
# hoặc
dig your-domain-1.com
```

---

## 5. Chạy lần đầu

### 5.1 Chạy migration DB trước

```bash
cd /opt/cms

# Migrate schema lên Digital Ocean DB
docker compose run --rm app1 bun run db:migrate
```

### 5.2 Start toàn bộ stack

```bash
docker compose up -d --build
```

### 5.3 Kiểm tra trạng thái

```bash
# Xem các container đang chạy
docker compose ps

# Xem log realtime
docker compose logs -f

# Xem log từng app riêng
docker compose logs -f app1
docker compose logs -f app2
docker compose logs -f nginx
```

Truy cập thử trên browser: `http://your-domain-1.com`

---

## 6. Setup GitHub Actions

### 6.1 Tạo SSH key riêng cho GitHub Actions

Chạy trên **máy local** (không cần passphrase):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy
```

Sẽ tạo ra 2 file:
- `~/.ssh/github_actions_deploy` — **private key** (dán vào GitHub Secret)
- `~/.ssh/github_actions_deploy.pub` — **public key** (đặt lên VPS)

### 6.2 Đặt public key lên VPS

```bash
# Chạy trên máy local
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub your-user@your-vps-ip

# Hoặc thủ công: copy nội dung file .pub rồi chạy trên VPS
echo "nội-dung-public-key" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 6.3 Thêm Secrets vào GitHub repo

Vào **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**.

Thêm lần lượt 5 secrets sau:

| Secret name | Giá trị |
|-------------|---------|
| `SSH_HOST` | IP VPS của bạn, ví dụ `123.456.789.0` |
| `SSH_USER` | User SSH, ví dụ `deploy` hoặc `ubuntu` |
| `SSH_PRIVATE_KEY` | Toàn bộ nội dung file `~/.ssh/github_actions_deploy` (bao gồm cả dòng `-----BEGIN...` và `-----END...`) |
| `SSH_PORT` | `22` (hoặc port SSH bạn đang dùng) |
| `PROJECT_DIR` | Path project trên VPS, ví dụ `/opt/cms` |

Cách lấy nội dung private key:

```bash
cat ~/.ssh/github_actions_deploy
# Copy toàn bộ output từ -----BEGIN đến -----END-----
```

### 6.4 Kiểm tra workflows đã có

Trong repo sẽ có 2 workflow:

```
.github/workflows/
├── deploy.yml       ← deploy app
└── db-migrate.yml   ← chạy migration
```

---

## 7. Quy trình deploy hàng ngày

Khi có code mới muốn deploy:

1. Merge code vào branch `main`
2. Vào **GitHub repo → Actions → Deploy**
3. Click **"Run workflow"**
4. Chọn target:
   - `all` — restart cả app1 + app2 + nginx
   - `app1` — chỉ restart app1
   - `app2` — chỉ restart app2
5. Click **"Run workflow"** màu xanh

GitHub sẽ SSH vào VPS, `git pull`, rồi `docker compose up -d --build` cho service được chọn.

---

## 8. Quy trình migrate schema

Khi thay đổi schema (thêm/sửa/xóa table, column):

```bash
# Bước 1 — Sửa schema file trong packages/schema/ hoặc plugins/*/src/schema.ts

# Bước 2 — Generate file SQL migration (chạy local)
bun run db:generate

# Bước 3 — Xem file vừa generate trong drizzle/ để review
# Đảm bảo không có DROP lỡ tay

# Bước 4 — Commit và push
git add drizzle/
git commit -m "chore: add migration <tên thay đổi>"
git push origin main
```

Sau đó trên GitHub:

1. Vào **Actions → DB Migrate**
2. Click **"Run workflow"** → **"Run workflow"**
3. Chờ migration xong (xem log trong Actions)
4. Sau khi migration thành công → deploy app như bình thường

> **Lưu ý:** Chạy migration **trước** khi deploy app mới nếu app mới yêu cầu schema mới.

---

## 9. Xem log

```bash
# SSH vào VPS trước
ssh your-user@your-vps-ip
cd /opt/cms

# Xem log realtime tất cả services
docker compose logs -f

# Xem log theo từng service
docker compose logs -f app1
docker compose logs -f app2
docker compose logs -f nginx

# Xem 200 dòng cuối rồi follow
docker compose logs -f --tail 200 app1

# Xem log trong 1 giờ qua
docker compose logs --since 1h app1

# Xem trạng thái tất cả container
docker compose ps
```

---

## Một số lệnh hữu ích khác

```bash
# Restart một service không rebuild
docker compose restart app1

# Dừng toàn bộ stack
docker compose down

# Dừng và xóa volumes (cẩn thận)
docker compose down -v

# Xem disk usage của Docker
docker system df

# Dọn dẹp image cũ
docker image prune -f
```
