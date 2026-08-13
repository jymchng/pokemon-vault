# Local Development (§58)

Get a full local environment running in minutes.

## Requirements

- Node.js **>= 22.12**
- pnpm **>= 9** (the repo pins `packageManager: pnpm@10.12.1`)
- Docker + Docker Compose (PostgreSQL, Redis, MinIO, Mailpit)

## One-command setup

```bash
git clone git@github.com:jymchng/pokemon-vault.git
cd pokemon-vault
pnpm install
cp .env.example .env
docker compose up -d          # postgres, redis, minio, mailpit
pnpm db:migrate               # apply migrations to the dev DB
pnpm db:seed                  # deterministic seed (safe to re-run)
pnpm dev                      # web (:3000), api (:3001), worker
```

- Web: <http://localhost:3000>
- API: <http://localhost:3001> — OpenAPI at
  <http://localhost:3001/api/v1/docs>
- Mailpit UI: <http://localhost:8025> (captures all local email)
- MinIO console: <http://localhost:9001>

## Native dev environment (G53) — no Docker required

`scripts/dev-env.sh` mirrors the compose topology on the host: it provisions a
**disposable** `pokemon_vault_dev` database (drop → migrate → seed), builds
api + worker + web, starts them, and waits for readiness on every service.

```bash
./scripts/dev-env.sh up              # provision dev DB + build + start stack
./scripts/dev-env.sh status          # show service PIDs + readiness
./scripts/dev-env.sh test            # full E2E (API journey + storefront browser journey)
./scripts/dev-env.sh down            # stop the stack (logs kept in ./.dev-env/logs)
./scripts/dev-env.sh down --drop-db  # also drop the disposable dev DB
```

The script uses Node 22 (via `npx node@22`) and the repo pnpm, reads the root
`.env` for defaults (secrets), and refuses to start when a port is already in
use. PIDs/logs live in `./.dev-env/` (gitignored). `docker compose up -d` and
`./scripts/dev-env.sh up` are equivalent ways to get a full local stack; the
script exists for hosts without Docker.

## Services (docker-compose.yml)

| Service | Image | Purpose |
|---|---|---|
| postgres | postgres:18 | database (dev DB `pokemon_vault`) |
| redis | redis:7 | queues, cache, rate limits |
| minio | minio | S3-compatible object storage |
| mailpit | axllent/mailpit | local email capture |
| api | `infrastructure/docker/api.Dockerfile` | NestJS API |
| worker | `infrastructure/docker/worker.Dockerfile` | BullMQ worker |
| web | `infrastructure/docker/web.Dockerfile` | Next.js storefront |

Compose services use the `development` Docker stage (hot-reload) and health
checks wired to `/api/v1/health/ready`.

## Environment

`.env.example` documents every variable (NODE_ENV, POKE_VAULT_DATABASE_URL, POKE_VAULT_REDIS_URL, JWT
secrets, POKE_VAULT_WEB_ORIGIN, Stripe/S3/email/Sentry, feature flags, cron schedules,
retention TTLs). `pnpm env:guard` verifies no `.env` or live secrets are
tracked by git.

## Database scripts

```bash
pnpm db:migrate          # prisma migrate dev (interactive)
pnpm db:migrate:deploy   # apply pending migrations (CI/prod)
pnpm db:seed             # deterministic seed
pnpm db:reset            # drop + recreate + migrate + seed
```

## Tests

```bash
pnpm test                # Vitest unit/integration/API (all packages)
pnpm --filter @pokemon-vault/api test   # API suite only
pnpm test:e2e            # API journey Playwright E2E (requires API running)
pnpm test:e2e:setup      # create the disposable test DB
pnpm test:e2e:web        # storefront browser journey (apps/web, requires web+api)
pnpm dev-env:test        # both E2E suites against the provisioned dev env
```

The API E2E suite runs against a **disposable `pokemon_vault_test` database**
(`infrastructure/db/setup-test-db.sh`) — never production. The storefront E2E
(`apps/web/e2e`) runs against the live dev stack provisioned by
`scripts/dev-env.sh` (or `docker compose up -d` + `pnpm dev`), asserting real
backend data renders through the UI.

## Health checks

- `GET /api/v1/health` — liveness
- `GET /api/v1/health/live` — liveness alias
- `GET /api/v1/health/ready` — readiness (DB `SELECT 1` + Redis `PING`)
