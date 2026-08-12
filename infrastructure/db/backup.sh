#!/usr/bin/env bash
# ============================================================================
# Automated encrypted PostgreSQL backups (§55).
# - pg_dump (custom format) -> encryption (age or gpg) -> retention pruning.
# - PITR: use managed RDS/Aurora automated backups (retention >= 30d, WAL
#   archiving) or Barman/pgBackRest; see docs/security/database.md.
# - NEVER pass passwords on the CLI (visible in `ps`). Use PGPASSWORD from the
#   environment / .pgpass / IAM auth. Secrets never appear in logs.
#
# Usage:
#   DATABASE_URL=postgres://pv_app:***@db.internal:5432/pokemon_vault \
#   AGE_PUBKEY=age1... ./infrastructure/db/backup.sh [--retention 14]
#
# Requires: pg_dump (matching server major version), age or gpg.
# ============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/pokemon-vault}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TAG="${TAG:-daily}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_FILE="${BACKUP_DIR}/pokemon_vault_${TAG}_${STAMP}.dump"
ENC_FILE="${DUMP_FILE}.age"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "FATAL: DATABASE_URL is required (least-privilege role pv_app)." >&2
  exit 1
fi
if [[ -z "${AGE_PUBKEY:-}" && -z "${GPG_RECIPIENT:-}" ]]; then
  echo "FATAL: set AGE_PUBKEY or GPG_RECIPIENT — backups must be encrypted at rest." >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

echo "[backup] dumping ${TAG} snapshot to ${DUMP_FILE}"
# --no-owner: restore into any DB; --format=custom: restores + selective use.
pg_dump "${DATABASE_URL}" --format=custom --no-owner --compress=9 --file="${DUMP_FILE}"

if [[ -n "${AGE_PUBKEY:-}" ]]; then
  echo "[backup] encrypting with age"
  age --recipient "${AGE_PUBKEY}" --output "${ENC_FILE}" "${DUMP_FILE}"
elif [[ -n "${GPG_RECIPIENT:-}" ]]; then
  echo "[backup] encrypting with gpg (${GPG_RECIPIENT})"
  gpg --batch --yes --trust-model always --encrypt --recipient "${GPG_RECIPIENT}" \
      --output "${ENC_FILE}" "${DUMP_FILE}"
fi
rm -f "${DUMP_FILE}"

echo "[backup] pruning backups older than ${RETENTION_DAYS} days"
find "${BACKUP_DIR}" -maxdepth 1 -name "pokemon_vault_${TAG}_*.age" \
     -mtime "+${RETENTION_DAYS}" -delete

# Never log secrets: print the count/size only.
SIZE="$(du -h "${ENC_FILE}" | cut -f1)"
echo "[backup] OK: ${ENC_FILE} (${SIZE})"

cat <<'NOTES'

PITR / restore (see docs/security/database.md):
- Daily encrypted dumps cover point-in-time restore of the snapshot itself.
- For true PITR (restore to any second) use managed automated backups with WAL
  archiving (RDS/Aurora: automated backups + 30-day retention) or Barman.
- Restore drill: restore the latest dump into a scratch DB quarterly and run
  the health/readiness checks against it.
NOTES
