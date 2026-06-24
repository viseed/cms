# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM oven/bun:1-alpine AS deps

WORKDIR /app

# Copy lockfile and root manifest first for better layer caching
COPY package.json bun.lock turbo.json ./

# Copy all workspace package.json files (needed for bun to resolve workspaces)
COPY apps/starter/package.json          ./apps/starter/package.json
COPY apps/admin/package.json            ./apps/admin/package.json
COPY packages/cli/package.json          ./packages/cli/package.json
COPY packages/config/package.json       ./packages/config/package.json
COPY packages/core/package.json         ./packages/core/package.json
COPY packages/registry/package.json     ./packages/registry/package.json
COPY packages/schema/package.json       ./packages/schema/package.json
COPY packages/types/package.json        ./packages/types/package.json
COPY packages/ui/package.json           ./packages/ui/package.json
COPY packages/viseed/package.json       ./packages/viseed/package.json
COPY packages/validator/package.json    ./packages/validator/package.json
COPY plugins/plugin-common-widgets/package.json   ./plugins/plugin-common-widgets/package.json
COPY plugins/plugin-auth/package.json   ./plugins/plugin-auth/package.json
COPY plugins/plugin-blog/package.json   ./plugins/plugin-blog/package.json
COPY plugins/plugin-menu/package.json   ./plugins/plugin-menu/package.json
COPY plugins/plugin-pages/package.json  ./plugins/plugin-pages/package.json
COPY plugins/plugin-s3/package.json     ./plugins/plugin-s3/package.json
COPY plugins/plugin-r2/package.json     ./plugins/plugin-r2/package.json
COPY themes/theme-blog/package.json     ./themes/theme-blog/package.json
COPY themes/theme-insurance/package.json ./themes/theme-insurance/package.json

RUN bun install 

# ─── Stage 2: Runner ──────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS runner
RUN apk add --no-cache tzdata

# Non-root user for security — explicit UID/GID 1001 so host volume ownership is predictable
RUN addgroup -S -g 1001 appgroup && adduser -S -u 1001 -G appgroup appuser

WORKDIR /app

# Give appuser ownership of /app so it can create subdirs at runtime (e.g. uploads/)
RUN chown appuser:appgroup /app

# Copy installed node_modules (includes workspace symlinks) from deps stage
COPY --chown=appuser:appgroup --from=deps /app .

# Copy full source (node_modules excluded via .dockerignore)
COPY --chown=appuser:appgroup . .

RUN bun run build

USER appuser

ENV PORT=3000
EXPOSE 3000

CMD ["bun", "run", "apps/starter/src/index.ts"]
