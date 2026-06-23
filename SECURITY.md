# Security Policy

## Supported Versions

Only the latest published version of each `@viseed/*` package receives security updates.
Older versions are **not** actively patched.

| Version | Supported |
| ------- | --------- |
| Latest  | ✅ Yes    |
| < Latest | ❌ No    |

## Reporting a Vulnerability

If you discover a security vulnerability, **do not open a public GitHub issue**.
Instead, please email the maintainers directly at the contact listed in the npm package registry.

We aim to respond within **72 hours** and to release a patch within **14 days** for confirmed critical issues.

---

## Disclaimer — Please Read Before Using

Viseed CMS is provided **"as is"**, without warranty of any kind, under the terms of the [MIT License](./LICENSE).

The following sections describe known security responsibilities that **fall entirely on the operator** (the person or team deploying Viseed CMS in a production environment). The Viseed CMS authors and contributors are **not liable** for any breach, data loss, or damage resulting from failure to address these concerns.

---

### 1. Authentication & Session Management

Viseed CMS ships a **plugin-auth** package for authentication. However:

- The default configuration uses **short-lived JWT tokens stored in-memory**. You are responsible for configuring token expiry, rotation, and revocation appropriate for your risk profile.
- Session invalidation (e.g., on logout or password change) is your responsibility to implement if you require it.
- Multi-factor authentication (MFA) is **not included** by default. Operators deploying to environments with sensitive data should implement MFA at the application or infrastructure level.
- Rate-limiting on login endpoints is **not built in**. You must add it via a reverse proxy (e.g., Nginx, Caddy, Cloudflare) or a custom Hono middleware.

### 2. Database Credentials & Secrets

- Database connection strings (e.g., `DATABASE_URL`) and any secret keys **must never be committed to source control**.
- Use environment variables and a secrets manager (e.g., Doppler, AWS Secrets Manager, Vault) in production.
- The `@viseed/cms` packages do not read secrets from source files — it is the operator's responsibility to inject them securely at runtime.

### 3. File Upload & Media Handling

- `plugin-media` / `LocalStorageAdapter` stores files on the local filesystem by default. There is **no automatic virus scanning**, **no file-type validation beyond MIME type**, and **no storage quota enforcement** built in.
- Operators must:
  - Restrict allowed MIME types to what the application genuinely needs.
  - Implement server-side file size limits.
  - Serve uploaded files from a separate domain or CDN with `Content-Disposition: attachment` where appropriate to prevent stored XSS via uploaded HTML/SVG files.
  - Consider replacing `LocalStorageAdapter` with an object storage backend (S3, R2, GCS) with access control for production deployments.

### 4. Admin UI Access Control

- The admin dashboard (`/admin`) is protected by authentication middleware from `plugin-auth`. If you choose to **not** install `plugin-auth`, the admin UI will be **publicly accessible**.
- Do not expose the admin port directly to the internet without authentication in front of it.
- The default admin route prefix is `/admin`. You should consider changing it to reduce automated scanning.

### 5. Plugin Integrity & Third-Party Plugins

- Official plugins distributed via the Viseed plugin registry include **SHA-256 integrity verification** (`@viseed/registry`).
- Community plugins loaded outside the official registry bypass this check. Loading untrusted third-party plugins is equivalent to executing arbitrary code on your server. **Only install plugins from sources you trust.**
- Plugin bundles loaded dynamically at runtime have access to the full Hono context and database instance. Review plugin code before installation.

### 6. Dependency Supply-Chain

- Viseed CMS is an open-source project with transitive npm dependencies. You are responsible for auditing your dependency tree with `bun audit` or equivalent before deploying to production.
- Pin dependency versions in production environments and subscribe to security advisories for key dependencies (Hono, Drizzle ORM, Bun runtime).

### 7. CORS & HTTP Headers

- Viseed CMS does **not** configure CORS headers or security-related HTTP headers (CSP, HSTS, X-Frame-Options, etc.) by default.
- Set these headers in your reverse proxy or by adding a Hono middleware before the Viseed CMS app is mounted.

### 8. SQL Injection

- All database access goes through **Drizzle ORM** with parameterized queries. Direct string interpolation into SQL is strongly discouraged and not part of the core API.
- If you extend the CMS with custom raw SQL queries using `db.execute()`, you are responsible for ensuring inputs are sanitized.

### 9. Environment Hardening

- Run the Bun process as a **non-root user** in production.
- Use a process supervisor (e.g., Docker, systemd) with resource limits.
- Disable debug/verbose logging in production; logs may contain sensitive request data.

### 10. HTTPS / TLS

- Viseed CMS itself does **not** terminate TLS. You must place it behind a reverse proxy (Nginx, Caddy, Cloudflare Tunnel, etc.) that enforces HTTPS in production.
- Do not run Viseed CMS directly on a public port over plain HTTP.

---

## No Warranty

The authors and contributors of Viseed CMS expressly disclaim all warranties, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. The entire risk as to the quality, security, and performance of the software is with you.

See the full warranty disclaimer in the [MIT License](./LICENSE).
