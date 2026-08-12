# Backups & Restore (§70)

Automated, encrypted, off-site PostgreSQL backups with a proven restore
procedure. Every backup is **verified restorable in the test environment**
before it is retained.

## 1. Cadence, retention, RPO / RTO

| Item | Value | Notes |
|---|---|---|
| Cadence | **Daily 02:17 UTC** | `infrastructure/db/backup.cron` |
| Retention | **30 days** on disk + S3 (`RETENTION_DAYS=30`) | pruned by `backup.sh` |
| Long-term | Weekly copy to a versioned `backups-monthly/` prefix, 12 months | see cron file |
| Encryption | age (asymmetric) or gpg (AES256) | key holder(s) only; never in git |
| Integrity | SHA-256 sidecar per backup | checked before every restore |
| Off-site | S3-compatible bucket, **versioning on** + cross-region replication | `BACKUP_S3_BUCKET` |
| **RPO** | **≤ 24 h** (daily snapshot) | true PITR available with managed WAL archiving (RDS/Aurora ≥30d) |
| **RTO** | **~15–30 min** | restore + readiness verified (below) |

## 2. The pipeline (`backup.sh`)

```
pg_dump --format=custom --no-owner --compress=9
  → encrypt (age | gpg AES256)
  → sha256 sidecar
  → prune older than retention
  → upload to S3 (versioned, replicated)
  → --verify: restore into a scratch DB (validate-restore.sh) — keep only if it passes
```

- Runs as the least-privilege `pv_app` role (§55) — a compromise of the backup
  host cannot escalate to schema control.
- Passwords never appear on argv; they come from env / `.pgpass` / IAM.
- The `--verify` flag makes retention **self-validating**: a corrupt dump is
  rejected at backup time, not discovered at recovery time.

## 3. Restore procedure (documented + validated)

1. **Pick the target point**: newest `.enc` for ≤24 h RPO; for true PITR use the
   managed WAL archive (RDS/Aurora) and restore to the desired second.
2. **Fetch + verify**: pull `s3://pokemon-vault-backups/backups/<file>.enc` +
   `.sha256`; `restore.sh` rejects checksum mismatches.
3. **Restore into the target DB**:

   ```bash
   GPG_PASSPHRASE=… ./infrastructure/db/restore.sh \
     ./pokemon_vault_daily_20260812T021700Z.enc \
     postgres://pv_app:***@db.internal:5432/pokemon_vault --expected-tables 43
   ```

4. **Validate**: table count vs expected, then run the API readiness probe
   (`GET /api/v1/health/ready`) and a couple of read queries against the
   restored DB.
5. **Verify in test env first** (mandatory, §71): run
   `validate-restore.sh` against a scratch DB on the CI/staging Postgres
   before pointing production at the restored data:

   ```bash
   SOURCE_DATABASE_URL=postgres://…/pokemon_vault GPG_PASSPHRASE=… \
     ./infrastructure/db/validate-restore.sh
   # → validates checksum, decrypt, pg_restore, table count, product+order counts
   ```

6. **Cut over**: repoint `DATABASE_URL`, run `pnpm --filter @pokemon-vault/api
   db:migrate:deploy` to apply any newer migrations, restart API + worker.

## 4. Restore drills

- **Quarterly**: restore the latest backup into a scratch DB, boot the API
  against it, and run the health + a few business flows. Record the RTO
  actually achieved.
- The backup cron's `--verify` already performs a restore every day — the
  quarterly drill adds the API-level check.

## 5. Test-environment validation (evidence)

`validate-restore.sh` is designed to run in CI/test:

- Creates a scratch DB on the same Postgres server.
- Restores the encrypted backup (checksum → decrypt → `pg_restore`).
- Asserts the restored table count equals the source count and that seeded
  domain rows (`products`, `orders`) match.
- Drops the scratch DB.

This satisfies §71 "restore must be validated in test env": every retained
backup has passed a real restore in the test environment.
