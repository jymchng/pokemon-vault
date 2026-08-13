# Disaster Recovery (§71)

Runbook for recovering the Pokémon Vault platform from component, regional, or
deployment failures. **Always prefer the documented runbook over improvisation;
rehearse quarterly.**

Scope covered per the spec: database, Redis, object storage, application,
region, credentials, and bad deployments.

## 0. Before the incident

- **Backups**: daily encrypted off-site (`docs/operations/backups-dr.md`),
  verified restorable every run; RPO ≤ 24 h, RTO ~15–30 min.
- **Infrastructure as code**: everything in `infrastructure/terraform/` —
  recreate a region from `terraform apply` against the state in the DR bucket.
- **Credentials**: IAM roles + Secrets Manager (§56) with rotation; the DR
  region has a replica of every secret. Never rely on a single region's console
  credentials.
- **Runbook test**: quarterly restore drill + a full failover rehearsal to the
  DR region.

## 1. Database failure / data loss

| Symptom | Action |
|---|---|
| DB down | Check instance health (§ alerting DbDown); restart; verify `/health/ready` |
| Data corruption / loss | Restore latest backup (`restore.sh`) into the test env FIRST (§71), then cut over |
| Regional DB loss | Fail over to the DR-region RDS replica (multi-AZ / cross-region read replica → promote) |
| RPO < 24 h needed | Use managed WAL/PITR restore to the target second (RDS/Aurora ≥30 d window) |

Steps: restore (see `backups-dr.md` §3) → `db:migrate:deploy` → restart API +
worker → verify readiness + smoke flows.

## 2. Redis failure

- Redis powers BullMQ queues and rate limiting. Its loss **degrades but does
  not hard-crash**: BullMQ retries stalled jobs; the throttler falls back.
- **Action**: `redis-cli ping`; check memory/evictions; restart Redis. BullMQ
  reconnects and the stalled-job sweep re-queues active jobs (§64).
- **Data loss**: queue state (waiting/delayed) may be lost; jobs already
  consumed and acknowledged are gone. Re-run idempotent producers (email,
  notifications, order-processing) — all handlers are idempotent (§45).
- **DR**: enable AOF persistence (`--appendonly yes`, already in compose) and,
  for prod, a managed Redis with automatic failover.

## 3. Object storage (MinIO/S3) failure

- Media assets (`media_assets` rows → S3 objects) are referenced by key; the
  DB holds metadata, S3 holds bytes.
- **Action**: check bucket health; if objects are lost, restore from bucket
  versioning or cross-region replication; re-upload from the source of truth
  (product/card imagery pipelines) if needed.
- **DR**: enable versioning + cross-region replication on the media bucket;
  keep `POKE_VAULT_S3_ENDPOINT` behind a DNS name so failover is a config change.

## 4. Application failure (API / worker)

| Symptom | Action |
|---|---|
| Crash loop | Check startup logs + Sentry; validate `NODE_ENV`/secrets; fix and roll out |
| 5xx spike | Alert Api5xxSpike runbook (`docs/observability/alerting.md` §2); roll back if a deploy correlates |
| Worker not consuming | Alert WorkerDown; restart the ECS task/deployment; check queue depth |

## 5. Regional failure

1. **Promote DR**: run `terraform apply` in the DR region (state in the DR S3
   bucket), promote the DB replica, repoint DNS (`POKE_VAULT_WEB_ORIGIN`/`POKE_VAULT_DATABASE_URL`
   via Secrets Manager replica).
2. **Verify**: `/health/ready` 200, `/metrics` scraped, checkout smoke test.
3. **Record**: RTO measured; feed back into the quarterly rehearsal.

## 6. Credential compromise

- **Rotate immediately**: Stripe keys, JWT secrets, DB password, SMTP/email
  key, S3 keys (§56 rotation). Revoke the leaked credential first.
- **Invalidate sessions**: bump `POKE_VAULT_JWT_SECRET`/`POKE_VAULT_JWT_REFRESH_SECRET` and clear
  `sessions` (forces re-login); review auth logs for the leaked window.
- **DB**: rotate the `pv_app` password and redeploy; the least-privilege role
  bounds blast radius (§55).
- **Check**: `pnpm env:guard` (no `.env` tracked, no live secrets in git);
  rotate anything that ever touched a commit or log.

## 7. Bad deployment

1. **Roll back** the image tag to the last known-good git SHA (images are
   tagged with SHA, never `latest`-only).
2. **Migrations**: only roll back code; a deployed migration is forward-only.
   If the bad deploy ran a migration, fix forward (new migration) rather than
   reverting schema.
3. **Verify**: readiness + metrics + a smoke order after rollback (§80-82
   deploy safety covers the gates).

## 8. Recovery checklist (print this)

- [ ] Alert acknowledged; incident owner named
- [ ] `/health/ready` target known-good baseline
- [ ] Backups: latest verified restore exists (off-site)
- [ ] Restore validated in test env before production cutover (§71)
- [ ] Secrets available in the target region (Secrets Manager replica)
- [ ] DNS/config repointed; `POKE_VAULT_WEB_ORIGIN`/`POKE_VAULT_DATABASE_URL` correct
- [ ] API + worker restarted, queues draining
- [ ] Metrics + logs confirm recovery; Sentry clean of new errors
- [ ] Postmortem drafted: timeline, impact, preventions
