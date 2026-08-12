# Disaster Recovery (§71)

How Pokémon Vault recovers from outages. The full runbook lives in
docs/operations/disaster-recovery.md; this page is the index + quick answers.

## Scenarios covered

1. **Database failure / data loss** — restore the verified encrypted backup
   (docs/operations/backups-dr.md) into a fresh RDS instance; PITR via RDS
   (≥30-day window) for point-in-time recovery; run corrective/forward-only
   migrations to restore compatibility.
2. **Redis failure** — API degrades (rate limits fall back in-memory, cache
   misses hit the DB); BullMQ stalled-job sweep re-queues; restart/replace the
   ElastiCache node.
3. **Object storage (MinIO/S3) failure** — media URLs fail fast; re-upload from
   MediaAsset metadata; S3 cross-region replication protects the backup bucket.
4. **Application failure (API/worker)** — ECS auto-restarts; rolling deploy
   rolls back on failed readiness; worker reconnect + stalled-job sweep.
5. **Regional failure** — deploy the Terraform stack to a secondary region with
   the S3-replicated backup; update Route53 failover.
6. **Credential compromise** — rotate immediately (Secrets Manager/Doppler +
   DB passwords + JWT secrets), revoke sessions, scrub git history, run
   `guard-env.sh`.
7. **Bad deployment** — auto-rollback on 5xx spike (cd.yml) or redeploy the
   previous immutable SHA; DB is forward-only (corrective migration, never
   destructive rollback).

## Recovery checklist

See docs/operations/disaster-recovery.md §8 (printable) — it covers
assessing blast radius, restoring backups, verifying with
`/api/v1/health/ready`, smoke-testing core flows, and declaring all-clear.

## Key facts

- **RPO ≤ 24h** (daily encrypted backup), **RTO ~15-30 min** (restore +
  readiness).
- Backups are **verified restorable** before retention (--verify scratch-DB
  restore).
- Off-site storage: S3 bucket with versioning + cross-region replication.
