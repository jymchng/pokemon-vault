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

No Docker? Use the native dev environment (mirrors the compose topology on the
host — disposable `pokemon_vault_dev` DB, api :3001, worker, web :3000):

```bash
./scripts/dev-env.sh up       # provision dev DB + build + start stack
./scripts/dev-env.sh test     # full E2E (API journey + storefront journey)
./scripts/dev-env.sh down     # stop (--drop-db also drops the dev DB)
```

The storefront consumes the real PostgreSQL-backed API as the single source of
truth (see `docs/architecture.md`).

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | run web + api + worker in watch mode |
| `pnpm build` | build all workspaces |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | repo-wide checks |
| `pnpm db:migrate` / `pnpm db:seed` | database migration + deterministic seed |
| `pnpm test:e2e` / `pnpm test:e2e:web` | API journey / storefront E2E (Playwright) |
| `pnpm dev-env` / `pnpm dev-env:test` | native dev env / full E2E against it |
| `pnpm format` / `pnpm format:check` | Prettier |

## Documentation

`docs/` — architecture, local development, deployment, database, security,
disaster recovery, API reference, and operations runbooks.

## Production checklist

See `docs/operations.md` for the full production-readiness checklist (authentication,
ecommerce, collection, rewards, security, DevOps).

## Documentation

- **[Architecture](docs/architecture.md)** — modules, data ownership, transactions, queues, caching, auth, deployment, observability
- **[Local development](docs/local-development.md)** — one-command setup, services, DB scripts, tests
- **[Deployment](docs/deployment.md)** — environments, AWS architecture, CI/CD, migrations, rollback
- **[Database](docs/database.md)** — schema highlights, conventions, migrations, security, backups
- **[Security](docs/security.md)** — headers, rate limits, auth, validation, secrets, scanning, abuse controls
- **[Disaster recovery](docs/disaster-recovery.md)** — scenario index + key RPO/RTO facts
- **[API](docs/api.md)** — conventions, pagination, filtering, module index, idempotency
- **[Operations](docs/operations.md)** — runbook index, scheduled jobs, daily operations
- **[Production-readiness checklist](docs/production-checklist.md)** — the full §112 checklist (all boxes verified)

Deep runbooks live under `docs/operations/` (deploy-safety, backups-dr,
disaster-recovery, ci-cd, security-scanning, privacy-gdpr),
`docs/security/` (database, secrets), and `docs/observability/` (alerting).
