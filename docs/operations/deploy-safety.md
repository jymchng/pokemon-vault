# Deploy Safety (§80-82)

How Pokémon Vault deploys without downtime: rolling updates gated on
readiness, verified migrations, error monitoring, and documented rollback
paths for every component.

## 1. Deployment strategy — rolling (blue-green equivalent on Fargate)

ECS/Fargate runs **rolling deployments** with:

- `deployment_minimum_healthy_percent = 100` — at least the current capacity
  stays healthy throughout the rollout (no capacity dip).
- `deployment_maximum_percent = 200` — the new task set is brought up
  alongside the old one (effectively blue-green: old + new coexist, then old
  drains).
- `health_check_grace_period_seconds = 60` — the API task gets 60s to start
  before the ALB health check counts against it.
- `wait_for_steady_state = true` — the service does not report "stable" until
  the new task set passes the ALB `/api/v1/health/ready` check.

**Readiness before traffic**: the ALB target group health check is
`GET /api/v1/health/ready` (DB + Redis probed, 200 = healthy, `matcher 200`).
A new task is added to the target group **only after** it returns 200;
unhealthy new tasks are rolled back by ECS automatically.

## 2. Pipeline order (cd.yml)

```
build-images (immutable SHA) → migrate-db (staging, BEFORE traffic)
  → deploy-staging (Terraform apply, ECS stable, smoke /health/ready)
  → [manual approval: environment production]
  → deploy-prod: migrate prod DB → Terraform apply → ECS stable
                 → health check → post-deploy CloudWatch 5xx monitor
```

- Migrations run **before** the new tasks receive traffic, so the schema is
  already compatible when the new code starts.
- Errors are monitored during and after rollout (`docs/observability/
  alerting.md`): 5xx spike, latency, DB/Redis/queue alarms. A regression that
  trips `Api5xxSpike` triggers the rollback procedure.

## 3. Backward-compatible migrations (expand → migrate → contract)

All DB changes follow the three-phase pattern so old and new code coexist:

1. **Expand** (release N): add the new column/table/index — additive only;
   old code ignores it. `prisma migrate deploy` adds it without touching
   existing columns.
2. **Migrate** (release N+1): backfill/copy data in the new structure; both
   code versions can read/write.
3. **Contract** (release N+2): drop the old column/table once no running
   version references it.

**Rules**:
- Never delete or rename a column in the same deploy that stops using it.
- A deployed migration is **forward-only** — never edit an applied migration
  (`prisma migrate resolve` only for manual repair; fix forward with a new
  migration).
- `db:migrate:deploy` in CI/CD applies only un-applied migrations, so a
  partial deploy is safe to re-run.

## 4. Monitor + auto-rollback

- **Auto**: ECS rolling deploys auto-rollback a task set that fails the ALB
  readiness check (the old task set stays serving). `wait_for_steady_state`
  fails the Terraform apply if the new set never stabilizes.
- **Post-deploy monitor**: the CD pipeline reads ALB `HTTPCode_Target_5XX_Count`
  in the minutes after deploy; sustained 5xx → operator executes the rollback
  below.
- **Sentry** (`docs/observability/alerting.md` §69) surfaces new error groups
  introduced by the deploy.

## 5. Rollback documentation (per component)

### App (API)
- **Rollback** = redeploy the previous **immutable SHA** image via Terraform
  (image tags are git SHAs, never `latest`): set `image_api`/`image_worker`
  back in the tfvars, `terraform apply`. Or use the `rollback` job in
  `cd.yml` (`workflow_dispatch` with `rollback=true`).
- **Verify**: readiness 200, 5xx rate < 1% for 15 min, Sentry clean.

### Worker
- Same image-SHA rollback as the API (separate ECS service — rolling
  `minimum_healthy_percent = 100`). Confirm workers reconnect to queues and
  drain (`queue_depth` returns to normal; BullMQ stalled-job sweep re-queues
  jobs that were mid-flight, §45/§64).

### DB migration
- **Forward-only**: never roll back a migration by editing history. If a
  migration is defective, apply a **new corrective migration** (expand → fix
  → contract).
- True data rollback = restore from the verified encrypted backup
  (`docs/operations/backups-dr.md` §3) into the test env first, then cut over.
  PITR (RDS ≥30-day window) for point-in-time recovery.
- **Critical**: run the old code against the restored schema only after the
  corrective migration restores compatibility — old code + new schema is the
  common failure.

### Infra
- Terraform state is versioned in S3; `terraform apply` with the previous
  commit's tfvars (or `terraform state rm` for a targeted undo) reverts infra
  changes. Keep the state bucket versioning on — a bad `apply` can be
  reverted by restoring the prior state file and re-planning.
- CloudFront/WAF/DNS changes roll back by reverting the module inputs and
  re-applying; no data risk.

## 6. No laptop deploys

All deployments happen in CI/CD with OIDC roles (§78-79). The only manual
step is the **approval** (reviewer on the `production` environment) — the
deploy itself is always the pipeline.

## 7. Checklist before a production deploy

- [ ] PR pipeline green (lint/typecheck/tests/build/security)
- [ ] Migrations reviewed as expand→migrate→contract (no destructive step in
      the same release)
- [ ] Staging smoke passed (`/api/v1/health/ready` ok)
- [ ] Immutable SHA image tagged in GHCR
- [ ] Approver reviewed the diff + migration plan
- [ ] Rollback SHA recorded (previous release tag)
- [ ] Alerts + Sentry reachable; on-call aware
