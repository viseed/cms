# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM oven/bun:1-alpine AS deps

WORKDIR /app

# Copy lockfile and root manifest first for better layer caching
COPY package.json bun.lock turbo.json ./

# Copy all workspace package.json files (needed for bun to resolve workspaces)
COPY apps/starter/package.json          ./apps/starter/package.json
COPY packages/cli/package.json          ./packages/cli/package.json
COPY packages/config/package.json       ./packages/config/package.json
COPY packages/core/package.json         ./packages/core/package.json
COPY packages/registry/package.json     ./packages/registry/package.json
COPY packages/schema/package.json       ./packages/schema/package.json
COPY packages/types/package.json        ./packages/types/package.json
COPY packages/ui/package.json           ./packages/ui/package.json
COPY packages/validator/package.json    ./packages/validator/package.json
COPY plugins/plugin-auth/package.json   ./plugins/plugin-auth/package.json
COPY plugins/plugin-blog/package.json   ./plugins/plugin-blog/package.json
COPY plugins/plugin-menu/package.json   ./plugins/plugin-menu/package.json
COPY plugins/plugin-pages/package.json  ./plugins/plugin-pages/package.json
COPY themes/theme-blog/package.json     ./themes/theme-blog/package.json
COPY themes/theme-insurance/package.json ./themes/theme-insurance/package.json

RUN bun install --frozen-lockfile

# ─── Stage 2: Runner ──────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Copy installed node_modules (includes workspace symlinks) from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy full source (node_modules excluded via .dockerignore)
COPY . .

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

ENV PORT=3000
EXPOSE 3000

CMD ["bun", "run", "apps/starter/src/index.ts"]
