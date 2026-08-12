# Pokémon Vault

Modern Pokémon trading-card ecommerce + collection platform.

**Monorepo** (pnpm workspaces): web storefront, production API (NestJS + PostgreSQL),
background worker (BullMQ), shared packages, infrastructure (Docker/Terraform), CI/CD
(GitHub Actions), and documentation.

> **No crypto/Web3.** This is a conventional fiat ecommerce and collectibles platform.
> The "Collector XP" rewards system is an internal loyalty metric, not a token.

## Repository layout

```text
pokemon-vault/
├── apps/
│   ├── web/          # Next.js storefront (App Router)
│   ├── api/          # NestJS production API (PostgreSQL + Prisma)
│   └── worker/       # BullMQ background worker (Redis)
├── packages/
│   ├── types/        # shared TypeScript types (frontend/backend contract)
│   ├── config/       # shared configuration
│   ├── validation/   # shared Zod schemas
│   └── eslint-config # shared ESLint config
├── infrastructure/
│   ├── terraform/    # AWS IaC (dev/staging/production)
│   ├── docker/       # Dockerfiles
│   └── kubernetes/   # (only if an operational requirement appears)
├── scripts/          # repo-level tooling
├── docs/             # architecture, deployment, security, DR, operations…
└── .github/workflows # CI/CD
```

## Quickstart (local development)

Requirements: Node.js **>= 22.12**, pnpm **>= 9**.

```bash
git clone git@github.com:jymchng/pokemon-vault.git
cd pokemon-vault
pnpm install
cp .env.example .env          # (or apps/web/.env.example → apps/web/.env)
docker compose up -d          # postgres, redis, minio, mailpit
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Web: <http://localhost:3000>
- API: <http://localhost:3001> (OpenAPI at `/docs`)
- Worker: consumes BullMQ queues from Redis
- Mailpit: <http://localhost:8025> (captures outbound email locally)
- MinIO console: <http://localhost:9001>

> The storefront historically used SQLite via Prisma; it is being migrated to the
> PostgreSQL-backed API as the single source of truth (see `docs/architecture.md`).

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | run web + api + worker in watch mode |
| `pnpm build` | build all workspaces |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | repo-wide checks |
| `pnpm db:migrate` / `pnpm db:seed` | database migration + deterministic seed |
| `pnpm format` / `pnpm format:check` | Prettier |

## Documentation

`docs/` — architecture, local development, deployment, database, security,
disaster recovery, API reference, and operations runbooks.

## Production checklist

See `docs/operations.md` for the full production-readiness checklist (authentication,
ecommerce, collection, rewards, security, DevOps).
