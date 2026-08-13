# Operations

Operational runbooks for Pokémon Vault. The `docs/operations/` directory holds
the detailed documents; this page indexes them and summarizes the daily
operations.

## Index

| Document | Covers |
|---|---|
| `docs/operations/deploy-safety.md` | rolling/blue-green deploys, readiness gating, verified migrations, auto-rollback, per-component rollback, pre-deploy checklist |
| `docs/operations/backups-dr.md` | encrypted off-site backups, retention, RPO/RTO, restore procedure (validated) |
| `docs/operations/disaster-recovery.md` | DB/Redis/object-store/app/region/credentials/bad-deployment recovery + checklist |
| `docs/operations/ci-cd.md` | CI/CD pipelines, immutable SHA images, environments |
| `docs/operations/security-scanning.md` | Gitleaks/Trivy/CodeQL/audit/guard-env + remediation flow |
| `docs/operations/privacy-gdpr.md` | GDPR-ready design, data export/erasure/consent, retention windows |
| `docs/observability/alerting.md` | Prometheus alert rules + response procedure |
| `docs/security/database.md` | DB security (TLS, least-privilege, backups) |
| `docs/security/secrets.md` | secrets management (env/Doppler/AWS) |

## Scheduled jobs (§106)

The API runs cron-driven maintenance jobs (CRON_* env): release expired
inventory reservations (every minute), purge abandoned carts (30d), expire
rewards, purge stale sessions, purge email logs (90d), aggregate daily
analytics, and VACUUM ANALYZE hot tables. Logs are structured JSON.

## Daily operations

1. **Check CI/CD**: merge to main → images built/tested → staging → approval →
   prod. Watch the post-deploy 5xx monitor + auto-rollback.
2. **Verify backups**: `infrastructure/db/backup.sh --verify` restores each
   backup into a scratch DB before retention (RPO ≤24h, RTO ~15-30min).
3. **Watch alerts**: Api5xxSpike, ApiHighLatency, DbDown, RedisDown,
   QueueDepthHigh, QueueFailedSpike, InventoryReservationFailed
   (docs/observability/alerting.md).
4. **Dependency hygiene**: weekly Dependabot (semver-major ignored);
   `pnpm audit --prod --audit-level high` must stay clean (§83-84).
5. **Retention**: privacy-gdpr.md windows (orders 10y, audit 7y, notifications
   2y, email logs 90d, carts 30d) — enforced by the scheduled cleanup jobs.

## Secrets & env

`POKE_VAULT_SECRETS_PROVIDER` (env | doppler | aws); production resolves secrets from the
provider; `guard-env.sh` blocks `.env`/live secrets from git. Rotate
immediately on any suspected compromise.

## Support procedures

- Unknown 5xx → check Sentry (`POKE_VAULT_SENTRY_DSN`), structured logs with
  `request_id`, Prometheus dashboards.
- DB slowness → check `db_query_duration_seconds`, VACUUM ANALYZE job, slow-query
  analysis (§95).
- Queue backlog → `queue_depth` gauge; worker dead-letter (`dlq_<queue>`)
  inspection + retry.
