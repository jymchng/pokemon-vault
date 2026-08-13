# syntax=docker/dockerfile:1.7

# ============================================================================
# Pokémon Vault — web image (G29 §61)
#
# Next.js storefront. Stages: base → dependencies → development | build →
# production. Production image keeps .next + public + prod deps only
# (pnpm deploy --prod), runs as non-root `node`, and serves via `next start`.
# ============================================================================

# ── base ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH="/pnpm:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate \
    && apk add --no-cache openssl

# ── dependencies ────────────────────────────────────────────────────────────
FROM base AS dependencies
# better-sqlite3 (web's local dev DB) + next build compile on musl.
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/ packages/
RUN pnpm install --frozen-lockfile

# ── development (compose target: development) ───────────────────────────────
FROM dependencies AS development
COPY apps/ apps/
CMD ["sh", "-c", "pnpm --filter @pokemon-vault/web dev"]

# ── build ────────────────────────────────────────────────────────────────────
FROM dependencies AS build
COPY apps/ apps/
RUN pnpm --filter @pokemon-vault/web build

# ── production ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS production
ENV NODE_ENV=production \
    PNPM_HOME=/pnpm \
    PATH="/pnpm:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate \
    && apk add --no-cache openssl
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/ packages/
# Prod-only web deps (next, react, ...) — --legacy deploy (no injected workspace).
RUN pnpm --filter @pokemon-vault/web deploy --legacy --prod /app/out \
    && rm -rf /app/out/src /app/out/prisma
# Built app + static assets.
COPY --from=build /app/apps/web/.next /app/out/.next
COPY --from=build /app/apps/web/public /app/out/public
RUN chown -R node:node /app/out
USER node
WORKDIR /app/out
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
