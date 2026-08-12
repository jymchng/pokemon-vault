# Database Security (§55)

Production posture for the Pokémon Vault PostgreSQL database — private
networking, encrypted transport + storage, least privilege, no public port,
and backups with PITR. Local development is unaffected (localhost Postgres,
`DATABASE_SSLMODE` unset ⇒ `disable`).

## 1. Private networking — no public port

- The database lives inside the application VPC (private subnets only).
- **No public endpoint.** `publicly_accessible = false` (RDS) / no public IP.
  Only the API, worker, and a bastion/jump host (or CI runner inside the VPC)
  can reach it.
- A strict security group allows **only** the app/worker SG on port 5432 —
  no `0.0.0.0/0` ingress, ever. Redis (6379) is likewise private.
- Reference: `infrastructure/terraform/` (network + database modules, G34).

## 2. Encrypted connections (TLS)

- Production **requires** TLS: `DATABASE_SSLMODE=require` (default in prod).
  Strict environments set `verify-full` + `DATABASE_SSL_CA` (RDS CA bundle).
- Enforced in code: `apps/api/src/security/db-security.ts`
  - `resolveDbSslMode()` — prod defaults to `require`; explicit env wins.
  - `buildDbSslOptions()` — fed into the Prisma `pg` adapter (`ssl` pool config).
  - `assertSecureDbConfig()` — fail-closed at startup in production
    (missing `DATABASE_URL`, `sslmode=disable`, non-postgres protocol, or
    credential-less URL all abort boot).
- Local dev: no TLS to `localhost:5432`; nothing to configure.

## 3. Encryption at rest

- RDS/Aurora: enable storage encryption (`storage_encrypted = true`) with a
  customer-managed KMS key; snapshots inherit encryption.
- Backups are additionally encrypted client-side (age/gpg) before leaving the
  host — see `infrastructure/db/backup.sh`.

## 4. Least privilege

- The app/worker connect as **`pv_app`** — a LOGIN-only role with
  SELECT/INSERT/UPDATE/DELETE on tables and USAGE on sequences; **no DDL, no
  CREATE on `public`, no SUPERUSER/CREATEDB/CREATEROLE, no BYPASSRLS**.
- Migrations run as the schema owner/admin role, never as the app role.
- Provisioning SQL: `infrastructure/db/roles.sql` (idempotent, with the
  public-schema `REVOKE CREATE` hardening).
- `assertSecureDbConfig()` also rejects production `DATABASE_URL`s without
  credentials, so a superuser default is not silently used.

## 5. Backups + PITR

- **Daily encrypted dumps**: `infrastructure/db/backup.sh` — `pg_dump`
  custom-format → age/gpg encryption → retention pruning (default 14 days).
  Never logs credentials; `DATABASE_URL` comes from env/`.pgpass`, not argv.
- **True PITR**: managed RDS/Aurora automated backups (retention ≥ 30 days)
  with WAL archiving restore the database to any second within the window.
  Alternative self-managed options: Barman or pgBackRest with WAL shipping.
- **Restore drill**: quarterly restore into a scratch DB, then run the API
  readiness probe + a few read queries against it.
- Cross-region: copy snapshots to a DR region (see G34 Terraform + G33
  backups/DR).

## 6. Verified by

- `apps/api/src/security/db-security.spec.ts` — mode resolution, TLS options,
  fail-closed production assertions.
- `pnpm env:guard` — no `.env` tracked, no live secrets in git.
