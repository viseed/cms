# Deployment

This guide covers deploying a Viseed CMS application to a production server using Docker.

---

## Prerequisites

- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- A container registry (Docker Hub, GHCR, or similar)
- A PostgreSQL database accessible from the server
- A domain name (optional, for Nginx setup)

---

## Dockerfile

Add a `Dockerfile` to the root of your project. A recommended two-stage build using Bun Alpine:

```dockerfile
# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM oven/bun:1-alpine AS deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ── Stage 2: Runner ────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS runner

RUN apk add --no-cache tzdata

# Non-root user — explicit UID/GID so host volume ownership is predictable
RUN addgroup -S -g 1001 appgroup && adduser -S -u 1001 -G appgroup appuser

WORKDIR /app
RUN chown appuser:appgroup /app

COPY --chown=appuser:appgroup --from=deps /app/node_modules ./node_modules
COPY --chown=appuser:appgroup . .

USER appuser

ENV PORT=3000
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
```

Also create a `.dockerignore` to keep the image lean:

```
node_modules
.env*
uploads
*.md
```

---

## Environment Variables

Create an `.env` file on your server with the following variables:

```bash
# Required
DATABASE_URL=postgresql://user:password@host:5432/db

# Optional — HTTP port (default 3000)
PORT=3000
```

For managed databases with SSL certificates (e.g. DigitalOcean, AWS RDS), add:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=verify-full&sslrootcert=./ca-certificate.crt
NODE_EXTRA_CA_CERTS=/app/ca-certificate.crt
```

Place the CA certificate file at the root of your deployment directory (next to `docker-compose.yml`).

---

## Build & Push to Registry

Build for `linux/amd64` and push to your container registry:

```bash
# Tag with a version and latest
docker build --platform linux/amd64 \
  -t your-registry/your-image:1.0.0 \
  -t your-registry/your-image:latest \
  .

docker push your-registry/your-image:1.0.0
docker push your-registry/your-image:latest
```

Replace `your-registry/your-image` with your actual registry path, e.g. `ghcr.io/your-org/cms` or `yourname/cms` on Docker Hub.

---

## Docker Compose

Create a `docker-compose.yml` on the server. The server pulls the pre-built image — no build step required.

```yaml
name: my-cms

x-logging: &default-logging
  driver: json-file
  options:
    max-size: "10m"
    max-file: "5"

services:
  app:
    image: your-registry/your-image:${IMAGE_TAG:-latest}
    env_file: .env
    environment:
      - NODE_EXTRA_CA_CERTS=/app/ca-certificate.crt  # remove if not using SSL cert
    volumes:
      - ./ca-certificate.crt:/app/ca-certificate.crt:ro  # remove if not using SSL cert
      - ./uploads:/app/uploads:rw
    restart: unless-stopped
    logging: *default-logging
    networks:
      - cms-network
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
    depends_on:
      app:
        condition: service_healthy
    restart: unless-stopped
    logging: *default-logging
    networks:
      - cms-network

networks:
  cms-network:
    driver: bridge
```

### Apply migrations before first start

```bash
docker compose run --rm app bun run db:migrate
```

Or from your local machine with `DATABASE_URL` pointing to production:

```bash
DATABASE_URL="postgresql://user:pass@prod-host:5432/db" bun run db:migrate
```

### Start services

```bash
docker compose up -d
```

### Deploy a new version

After pushing a new image to the registry:

```bash
IMAGE_TAG=1.0.0 docker compose pull && docker compose up -d
```

### View logs

```bash
docker compose logs -f app
```

---

## Nginx Configuration

Create `nginx/conf.d/default.conf` in your deployment directory:

```nginx
proxy_http_version  1.1;
proxy_set_header    Host              $host;
proxy_set_header    X-Real-IP         $remote_addr;
proxy_set_header    X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header    X-Forwarded-Proto $scheme;
proxy_set_header    Upgrade           $http_upgrade;
proxy_set_header    Connection        "upgrade";

client_max_body_size 50m;   # must be >= media.maxFileSizeMb

upstream app {
    server app:3000;
}

server {
    listen      80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://app;
    }
}
```

::: tip HTTPS
For TLS termination, use [Certbot](https://certbot.eff.org/) to provision Let's Encrypt certificates and update the Nginx config to listen on port 443.
:::

---

## Volumes to Persist

| Path            | Description          |
|-----------------|----------------------|
| `/app/uploads`  | Uploaded media files |

---

## Graceful Shutdown

Viseed CMS handles `SIGTERM` and `SIGINT` signals — it stops accepting new connections, waits for in-flight requests to complete, then closes the database connection cleanly. Docker's default `stop_grace_period` of 10 seconds is sufficient for most workloads.

---

## Health Check

The server exposes `GET /health` which returns `200 OK` when the CMS is running. This endpoint is used by Docker Compose and load balancers to determine container readiness.
