# Production-Readiness Checklist (§112)

Every item below is implemented and verified in the repository. A new
deployment should re-verify each box before cutting over.

## Application

- [x] API starts successfully (health `/api/v1/health` 200)
- [x] Worker starts successfully (consumes 9 BullMQ queues)
- [x] Database migrations work (`pnpm db:migrate:deploy`; CI migrate-before-traffic)
- [x] Seed works locally (`pnpm db:seed`, safe to re-run)
- [x] API documentation exists (`/api/v1/docs` OpenAPI/Swagger)
- [x] Health checks work (`/health`, `/health/live`, `/health/ready`)

## Authentication

- [x] Passwords hashed (Argon2id)
- [x] Refresh tokens protected (rotating, revocable, HTTP-only Secure cookie)
- [x] Sessions revocable (AuthSession + refresh-token revocation)
- [x] Rate limiting enabled (Redis-backed, per-endpoint overrides → 429)
- [x] Email verification supported (`/auth/verify-email`, expiring token)
- [x] Password reset secure (expiring single-use token, no account enumeration)

## Ecommerce

- [x] Cart works (user + anonymous session; server-priced)
- [x] Prices calculated server-side (never trust the client, §27)
- [x] Inventory reservations work (FOR UPDATE locks, 15-min TTL, release job)
- [x] Checkout is idempotent (Idempotency-Key, §91)
- [x] Payments are verified (provider abstraction + confirm, §24)
- [x] Webhooks are verified (HMAC signature, idempotent events, §25)
- [x] Orders are immutable/auditable (snapshots + audit log)
- [x] Refunds supported (`POST /admin/refunds`, audited)

## Collection

- [x] Collection ownership works (CollectionItem, per-user)
- [x] Multiple quantities supported (quantity field, upsert merge)
- [x] Activity tracked (immutable CollectionActivity stream)
- [x] Set progress works (`/collection/sets(/:setId)`, N+1-safe)
- [x] Pack opening is server-controlled (client sends only idempotencyKey)
- [x] Pack opening is idempotent (unique idempotencyKey, replay same opening)

## Rewards

- [x] XP ledger exists (RewardTransaction; cached balance derived)
- [x] Reward redemption is transactional (single $transaction, guarded updates)
- [x] Duplicate redemption prevented (@@unique([accountId, rewardId]) → 409)
- [x] Reward configuration is server-controlled (STAFF CRUD, configurable tiers)

## Security

- [x] Secrets removed from source (`guard-env.sh`; no `.env` tracked)
- [x] CORS restricted (`POKE_VAULT_WEB_ORIGIN` allow-list, no wildcard)
- [x] Rate limits configured (global + sensitive endpoints)
- [x] Security headers enabled (Helmet CSP/HSTS/nosniff/Referrer-Policy)
- [x] Input validation enabled (Zod on every controller)
- [x] Admin RBAC enabled (CUSTOMER/STAFF/ADMIN/SUPER_ADMIN, DB source of truth)
- [x] Audit logs enabled (AuditLog for every admin mutation)
- [x] Dependency scanning enabled (pnpm audit high/critical gate, §83)
- [x] Container scanning enabled (Trivy image, CRITICAL/HIGH gate)
- [x] Abuse protections (login/pack-opening sliding windows, §90)
- [x] Idempotency for payment/refund/pack/reward/order (§91)

## DevOps

- [x] Docker builds (multi-stage api/worker/web, non-root, prod-only deps, §61)
- [x] Docker Compose works (postgres/redis/minio/mailpit/api/worker/web + health)
- [x] CI works (install→lint→typecheck→test→build→security, §77)
- [x] CD works (SHA images→staging→smoke→approval→prod→health→monitor, §78)
- [x] Staging environment exists (Terraform env, smoke-tested)
- [x] Production environment documented (deployment.md, tfvars examples)
- [x] Terraform works (11 modules, 3 envs, remote state, validate clean)
- [x] Backups configured (daily encrypted off-site, --verify, §70)
- [x] Restore procedure documented (backups-dr.md, validated in test env)
- [x] Monitoring configured (Prometheus /metrics, dashboards)
- [x] Alerts configured (5xx/latency/DB/Redis/queue/inventory rules + runbook)
- [x] Rollback documented (deploy-safety.md §5; auto-rollback wired)

## Cross-cutting

- [x] Startup validation (validate env → logging → DB → Redis → init → ready, §109)
- [x] Config fails fast on missing prod vars (§108)
- [x] Structured JSON logs + request correlation (§65-66)
- [x] GDPR-ready (export/erasure/consent + retention doc, §103-105)
- [x] Test pyramid (Vitest unit/integration/API 224 tests + Playwright E2E 7/7 on disposable test DB, §98-100)
- [x] Contract shared (packages/types, frontend↔backend, §100)
- [x] No crypto/Web3 anywhere (fiat ecommerce only)
