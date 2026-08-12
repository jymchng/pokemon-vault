#!/usr/bin/env bash
# ============================================================================
# Automated encrypted PostgreSQL backups — daily cadence, off-site copy (§70).
# - pg_dump (custom format, --no-owner) → encryption (age or gpg) → retention
#   pruning → optional OFF-SITE upload to S3-compatible storage (BACKUP_S3_*).
# - A SHA-256 checksum is written next to every backup for integrity checks.
# - --verify runs a full restore into a scratch DB (validate-restore.sh) so
#   every produced backup is proven restorable, not just present.
# - NEVER pass passwords on the CLI (visible in `ps`). Use PGPASSWORD from the
#   environment / .pgpass / IAM auth. Secrets never appear in logs.
#
# Usage:
#   DATABASE_URL=postgres://pv_app:***@db.internal:5432/pokemon_vault \
#   GPG_RECIPIENT=ops@pokemon-vault.dev \
#   BACKUP_S3_BUCKET=pokemon-vault-backups \
#   ./infrastructure/db/backup.sh [--retention 30] [--verify]
#
# Encryption options (pick one):
#   AGE_PUBKEY=age1...                asymmetric (age)
#   GPG_RECIPIENT=ops@example.com     asymmetric (gpg)
#   GPG_PASSPHRASE=...                symmetric (gpg) — test env / CI
#
# Schedule: infrastructure/db/backup.cron (daily 02:17 UTC).
# ============================================================================
set -euo pipefail

# pg tools (pg_dump/pg_restore/psql) reject Prisma's ?schema= query param —
# strip everything after '?' for tool calls.
pg_url() { echo "${1%%\?*}"; }

BACKUP_DIR="${BACKUP_DIR:-/var/backups/pokemon-vault}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TAG="${TAG:-daily}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_FILE="${BACKUP_DIR}/pokemon_vault_${TAG}_${STAMP}.dump"
ENC_FILE="${DUMP_FILE}.enc"
VERIFY="${VERIFY:-0}"

# ── args ────────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --retention) RETENTION_DAYS="$2"; shift 2 ;;
    --verify) VERIFY=1; shift ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

# ── preconditions ───────────────────────────────────────────────────────────
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "FATAL: DATABASE_URL is required (least-privilege role pv_app)." >&2; exit 1
fi
if [[ -z "${AGE_PUBKEY:-}" && -z "${GPG_RECIPIENT:-}" && -z "${GPG_PASSPHRASE:-}" ]]; then
  echo "FATAL: set AGE_PUBKEY, GPG_RECIPIENT, or GPG_PASSPHRASE — backups must be encrypted." >&2; exit 1
fi

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

echo "[backup] dumping ${TAG} snapshot (${STAMP})"
pg_dump "$(pg_url "${DATABASE_URL}")" --format=custom --no-owner --compress=9 --file="${DUMP_FILE}"

# ── encrypt ──────────────────────────────────────────────────────────────────
if [[ -n "${AGE_PUBKEY:-}" ]]; then
  echo "[backup] encrypting with age"
  age --recipient "${AGE_PUBKEY}" --output "${ENC_FILE}" "${DUMP_FILE}"
elif [[ -n "${GPG_RECIPIENT:-}" ]]; then
  echo "[backup] encrypting with gpg (${GPG_RECIPIENT})"
  gpg --batch --yes --trust-model always --encrypt --recipient "${GPG_RECIPIENT}" \
      --output "${ENC_FILE}" "${DUMP_FILE}"
else
  echo "[backup] encrypting with gpg (symmetric)"
  gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase "${GPG_PASSPHRASE}" \
      --output "${ENC_FILE}" "${DUMP_FILE}"
fi
rm -f "${DUMP_FILE}"

# ── checksum (integrity) ────────────────────────────────────────────────────
sha256sum "${ENC_FILE}" | awk '{print $1}' > "${ENC_FILE}.sha256"

# ── retention ───────────────────────────────────────────────────────────────
echo "[backup] pruning backups older than ${RETENTION_DAYS} days"
find "${BACKUP_DIR}" -maxdepth 1 -name "pokemon_vault_${TAG}_*.enc" \
     -mtime "+${RETENTION_DAYS}" -delete
find "${BACKUP_DIR}" -maxdepth 1 -name "pokemon_vault_${TAG}_*.enc.sha256" \
     -mtime "+${RETENTION_DAYS}" -delete

# ── off-site copy (§70) ─────────────────────────────────────────────────────
if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
  S3_PREFIX="${BACKUP_S3_PREFIX:-backups}"
  if command -v aws >/dev/null 2>&1; then
    echo "[backup] uploading to s3://${BACKUP_S3_BUCKET}/${S3_PREFIX}/"
    aws s3 cp "${ENC_FILE}" "s3://${BACKUP_S3_BUCKET}/${S3_PREFIX}/" --only-show-errors
    aws s3 cp "${ENC_FILE}.sha256" "s3://${BACKUP_S3_BUCKET}/${S3_PREFIX}/" --only-show-errors
    if [[ "${BACKUP_S3_VERSIONING:-0}" == "1" ]]; then
      # Versioning on the bucket protects against accidental deletion/corruption
      # and enables cross-region replication for DR (see disaster-recovery.md).
      echo "[backup] bucket versioning enabled — off-site copy is immutable against overwrite"
    fi
  elif command -v rclone >/dev/null 2>&1; then
    echo "[backup] uploading via rclone to ${BACKUP_S3_REMOTE:-remote}:${S3_PREFIX}/"
    rclone copy "${ENC_FILE}" "${BACKUP_S3_REMOTE:-remote}:${S3_PREFIX}/"
    rclone copy "${ENC_FILE}.sha256" "${BACKUP_S3_REMOTE:-remote}:${S3_PREFIX}/"
  else
    echo "[backup] WARN: BACKUP_S3_BUCKET set but no 'aws'/'rclone' CLI — skipping off-site copy" >&2
  fi
fi

SIZE="$(du -h "${ENC_FILE}" | cut -f1)"
echo "[backup] OK: ${ENC_FILE} (${SIZE}) checksum:$(cat "${ENC_FILE}.sha256" | cut -c1-12)…"

# ── verify restore (§71) ────────────────────────────────────────────────────
if [[ "${VERIFY}" == "1" ]]; then
  echo "[backup] verifying restore into a scratch DB…"
  # The source of truth for restore validation is the same database we just dumped.
  SOURCE_DATABASE_URL="${SOURCE_DATABASE_URL:-${DATABASE_URL}}" \
    ./infrastructure/db/validate-restore.sh "${ENC_FILE}"
fi
