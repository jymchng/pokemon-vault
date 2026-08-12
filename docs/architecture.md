# Architecture (§111)

How Pokémon Vault is built: a **modular monolith** — one NestJS API process with
strong domain boundaries, a separate background worker, PostgreSQL as the system
of record, Redis for queues/cache/rate-limits, and S3-compatible object storage.

```
Frontend (Next.js, apps/web)
        │  HTTPS /api/v1 (REST, { data, meta } | { error:{ code, message } })
        ▼
   ┌─────────────────────────┐        ┌──────────────────────────┐
   │  API (NestJS, apps/api) │        │  Worker (BullMQ, apps/worker)
   │  modular monolith       │        │  consumes 9 queues:
   │  auth users products    │        │  email, notifications,
   │  cards sets inventory   │  jobs  │  order-processing, inventory,
   │  cart checkout orders   │ ─────► │  shipping, rewards,
   │  payments shipping      │        │  search-indexing,
   │  collection wishlist    │        │  image-processing, analytics
   │  packs rewards notif.   │        └──────────┬───────────────┘
   │  search media admin     │                   │
   │  audit privacy health   │                   ▼
   └─────────┬───────────────┘        ┌──────────────────────────┐
             │                        │  Redis (queues + cache +  │
             ▼                        │  rate-limit storage)      │
   ┌─────────────────────────┐        └──────────────────────────┘
   │  PostgreSQL (Prisma 7,  │
   │  driver adapter pg)     │   S3/MinIO (media assets)
   └─────────────────────────┘
```

## Domain modules & data ownership (§93)

Each module owns its tables; other modules reach them only through services
(no cross-module SQL). Clear sources of truth:

| Data | Source of truth |
|---|---|
| Product price | `Product.price` (client can never supply totals — §27) |
| Inventory | `InventoryItem` + `InventoryReservation` + `InventoryMovement` |
| Order state | `Order.status` state machine (PENDING→…→DELIVERED/REFUNDED) |
| Payment | provider reference + `Payment` record (never card numbers) |
| Collection ownership | `CollectionItem` (quantity, condition, grade, source) |
| Rewards balance | `RewardTransaction` ledger (cached `RewardAccount.xp` is derived) |
| Auth | `User` (Argon2id hash) + `AuthSession`/`RefreshToken` |
| Audit | `AuditLog` (actor, action, resource, before/after, ip, ua) |

## Transactions (§92)

Multi-entity writes are wrapped in Prisma `$transaction` so partial failure can
never leave inconsistent state: order completion (order + items + inventory
reservations with `SELECT … FOR UPDATE` locks + payment), pack opening
(`PackOpening` + `PackCard.createMany`), reward XP/redemption (ledger + balance
+ redemption), admin inventory adjust, cart adoption, privacy erasure.

## Queues (§45)

`QueueService` produces BullMQ jobs with idempotency keys (jobId) and
exponential-backoff retries; the worker consumes all nine queues, records
failures, dead-letters to `dlq_<queue>`, and is idempotent (dedupe hashes).
Correlation context (`request_id`/`user_id`, §66) is attached to every job so a
user action is traceable API → queue → worker.

## Caching (§94)

`CacheService` (Redis, keys `pv:<scope>:<key>`, JSON, TTLs) is used for hot
products (TTL 60s, invalidated on product mutations). Rate limits use Redis
storage (multi-instance). The cache is an optimization — **never a source of
truth**.

## Authentication (§8-11)

Short-lived JWT access tokens + rotating, revocable refresh tokens
(HTTP-only Secure SameSite=Lax cookies); Argon2id password hashing; per-IP
login abuse protection (§90); server-side RBAC (CUSTOMER/STAFF/ADMIN/SUPER_ADMIN)
with the DB as the source of truth.

## Deployment (§72-82)

AWS: Route53 → CloudFront → WAF → ALB → ECS/Fargate (separate api + worker
services) → RDS PostgreSQL / ElastiCache / S3. Terraform modules with remote
state; CI/CD builds immutable git-SHA images, migrates the DB before traffic,
smoke-tests staging, gates production behind manual approval, monitors 5xx and
auto-rolls back (§80-82). No Kubernetes.

## Observability (§67-69)

Prometheus metrics (`/metrics`, no PII), structured JSON logs with correlation,
OpenTelemetry tracing (lazy OTLP), Sentry (lazy DSN), alerting rules + runbook
(docs/observability/alerting.md), health endpoints (/health, /health/live,
/health/ready).

## API conventions (§49-51)

- Versioned prefix `/api/v1`; success `{ data, meta? }`; errors
  `{ error:{ code, message, details? } }` (§50, §102).
- Zod validation on every controller (body/query/params); cursor pagination for
  high-volume catalog, offset for admin (§86); whitelisted filters/sorts (§87).
- OpenAPI/Swagger at `/api/v1/docs` (dev/staging; prod token-gated) (§85).
