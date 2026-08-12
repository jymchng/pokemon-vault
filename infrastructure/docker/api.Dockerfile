# syntax=docker/dockerfile:1.7

# ============================================================================
# Pokémon Vault — API image (G29 §61)
#
# Stages (in order): base → dependencies → development | build → production
#   - base/dependencies: install toolchain + all deps (frozen lockfile)
#   - development:       compose `target: development` — hot-reload dev runtime
#   - build:             prisma generate + tsc compile
#   - production:        pruned prod deps only (pnpm deploy --prod), compiled
#                        dist, non-root `node` user — NO dev deps, NO sources
# ============================================================================

# ── base ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH="/pnpm:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate \
    && apk add --no-cache openssl  # Prisma pg adapter TLS

# ── dependencies ────────────────────────────────────────────────────────────
FROM base AS dependencies
# Native modules (argon2) compile on musl — build tools stay out of prod image.
RUN apk add --no-cache python3 make g++
WORKDIR /app
# Manifests first so dependency layers cache unless the lockfile changes.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/ packages/
RUN pnpm install --frozen-lockfile

# ── development (compose target: development) ───────────────────────────────
FROM dependencies AS development
COPY apps/ apps/
# Generated Prisma client is gitignored — materialize it inside the image.
RUN pnpm --filter @pokemon-vault/api db:generate
CMD ["sh", "-c", "pnpm --filter @pokemon-vault/api db:generate && pnpm --filter @pokemon-vault/api dev"]

# ── build ────────────────────────────────────────────────────────────────────
FROM dependencies AS build
COPY apps/ apps/
RUN pnpm --filter @pokemon-vault/api db:generate \
    && pnpm --filter @pokemon-vault/api build

# ── production ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS production
ENV NODE_ENV=production \
    PNPM_HOME=/pnpm \
    PATH="/pnpm:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate \
    && apk add --no-cache openssl
WORKDIR /app
# Workspace manifests + lockfile (needed by `pnpm deploy`).
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/ packages/
# Prod-only, self-contained dependency tree — no devDependencies.
# --legacy: this workspace does not set inject-workspace-packages (pnpm ≥10
# default deploy requires it), so use the legacy deploy algorithm.
RUN pnpm --filter @pokemon-vault/api deploy --legacy --prod /app/out \
    && rm -rf /app/out/src /app/out/prisma
# Compiled app + generated Prisma client (dist already contains src/generated).
COPY --from=build /app/apps/api/dist /app/out/dist
RUN chown -R node:node /app/out
USER node
WORKDIR /app/out
EXPOSE 3001
CMD ["node", "dist/src/main.js"]
