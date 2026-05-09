# Deployment

This guide covers deploying Hana CMS to a production server using Docker.

---

## Prerequisites

- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- A PostgreSQL database accessible from the server
- A domain name (optional, for Nginx setup)

---

## Environment Variables

Create a `.env` file (or equivalent secret store) with the following variables:

```bash
# Required
DATABASE_URL=postgresql://user:password@host:5432/db

# Optional — HTTP port (default 3000)
PORT=3000

# Optional — initial admin account (created on first run only)
HANA_ADMIN_EMAIL=admin@yourdomain.com
HANA_ADMIN_PASSWORD=change-me-in-production
HANA_ADMIN_NAME=Administrator
```

For managed databases with SSL certificates (e.g. DigitalOcean, AWS RDS), add:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=verify-full&sslrootcert=./ca-certificate.crt
NODE_EXTRA_CA_CERTS=/app/ca-certificate.crt
```

---

## Docker Setup

The repository includes a production-ready `Dockerfile` (multi-stage Bun Alpine build).

### Build and run

```bash
docker build -t hanano-cms .
docker run -d \
  --name hanano-cms \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/uploads:/app/uploads \
  hanano-cms
```

### Apply migrations before first start

Run migrations against your production database before starting the container:

```bash
docker run --rm \
  --env-file .env \
  hanano-cms \
  bun run packages/cli/src/index.ts db migrate
```

Or from your local machine with `DATABASE_URL` pointing to production:

```bash
export DATABASE_URL="postgresql://user:pass@prod-host:5432/db"
bunx hanabi db migrate
```

---

## Docker Compose

A `docker-compose.yml` is included for running the CMS behind an Nginx reverse proxy.

### Basic structure

```yaml
services:
  app:
    build: .
    env_file: .env
    environment:
      - NODE_EXTRA_CA_CERTS=/app/ca-certificate.crt  # if using SSL certs
    volumes:
      - ./ca-certificate.crt:/app/ca-certificate.crt:ro  # SSL cert (if needed)
      - ./uploads:/app/uploads:rw
    restart: unless-stopped
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
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - cms-network

networks:
  cms-network:
    driver: bridge
```

### Start services

```bash
docker compose up -d
```

### View logs

```bash
docker compose logs -f app
```

---

## Nginx Configuration

A minimal Nginx config for proxying to Hana CMS:

```nginx
events {
    worker_connections 1024;
}

http {
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
}
```

::: tip HTTPS
For TLS termination, use [Certbot](https://certbot.eff.org/) to provision Let's Encrypt certificates and update the Nginx config to listen on port 443.
:::

---

## Volumes to Persist

| Path            | Description                                     |
|-----------------|-------------------------------------------------|
| `/app/uploads`  | Uploaded media files                            |
| `/app/.turbo`   | Turborepo build cache (speeds up restarts)      |

---

## Graceful Shutdown

The starter template handles `SIGTERM` and `SIGINT` signals — it stops accepting new connections, waits for in-flight requests to complete, then closes the database connection cleanly. Docker's `stop_grace_period` (default 10 seconds) is sufficient for most workloads.

---

## Health Check

The server exposes `GET /health` which returns `200 OK` when the CMS is running. This is used by Docker Compose and load balancers to determine container readiness.
