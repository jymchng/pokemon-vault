# syntax=docker/dockerfile:1.7

# ============================================================================
# Pokémon Vault — worker image (G29 §61)
#
# The worker consumes BullMQ queues. Its compiled dist imports the Prisma
# client from the API's generated path (../../../apps/api/src/generated/...),
# so the production image preserves the workspace-relative layout and ships
# the generated client alongside the pruned prod dependencies.
#
# Stages: base → dependencies → development | build → production
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
RUN apk add --no-cache python3 make g++  # native modules (if any)
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
# Worker's runtime imports the API-generated Prisma client.
RUN pnpm --filter @pokemon-vault/api db:generate
CMD ["sh", "-c", "pnpm --filter @pokemon-vault/api db:generate && pnpm --filter @pokemon-vault/worker dev"]

# ── build ────────────────────────────────────────────────────────────────────
FROM dependencies AS build
COPY apps/ apps/
RUN pnpm --filter @pokemon-vault/api db:generate \
    && pnpm --filter @pokemon-vault/worker build

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
# Prod-only worker deps (--legacy: workspace is not inject-workspace-packages).
RUN pnpm --filter @pokemon-vault/worker deploy --legacy --prod /app/worker-out \
    && mkdir -p /app/apps/worker \
    && cp -r /app/worker-out/. /app/apps/worker/ \
    && rm -rf /app/worker-out /app/apps/worker/src
# The generated Prisma client lives at /app/apps/api/src/generated and resolves
# @prisma/* from a node_modules on its ancestor path; expose the worker's
# pruned node_modules at /app/node_modules (mirrors the dev-tree hoisting).
RUN ln -sfn /app/apps/worker/node_modules /app/node_modules
# Compiled worker + the API-generated Prisma client at the exact relative
# path the compiled import expects (../../../apps/api/src/generated/...).
COPY --from=build /app/apps/worker/dist /app/apps/worker/dist
COPY --from=build /app/apps/api/src/generated /app/apps/api/src/generated
RUN chown -R node:node /app/apps/worker /app/apps/api/src/generated
USER node
WORKDIR /app/apps/worker
CMD ["node", "dist/main.js"]
