#!/usr/bin/env bash
# ============================================================================
# Restore an encrypted PostgreSQL backup into a target database (§70-71).
#
# Usage:
#   restore.sh <backup.enc> <TARGET_DATABASE_URL>
#     [--decryption-key-file <file>]   # age identity file
#     [--expected-tables <n>]          # fail if restored table count differs
#
#   TARGET_DATABASE_URL=postgres://user:pass@host:5432/db \
#   GPG_PASSPHRASE=... ./infrastructure/db/restore.sh /backups/x.enc
#
# Decryption: gpg symmetric (GPG_PASSPHRASE), gpg asymmetric (GPG_RECIPIENT),
# or age (--decryption-key-file). The dump is custom-format; restore uses
# --clean --if-exists (idempotent) and --no-owner (least-privilege pv_app).
# ============================================================================
set -euo pipefail

# pg tools (pg_dump/pg_restore/psql) reject Prisma's ?schema= query param —
# strip everything after '?' for tool calls.
pg_url() { echo "${1%%\?*}"; }

BACKUP_FILE="${1:?usage: restore.sh <backup.enc> <TARGET_DATABASE_URL> [--decryption-key-file f] [--expected-tables n]}"
TARGET_URL="${2:?usage: restore.sh <backup.enc> <TARGET_DATABASE_URL> [--decryption-key-file f] [--expected-tables n]}"
KEY_FILE=""
EXPECTED_TABLES=""

shift 2
while [[ $# -gt 0 ]]; do
  case "$1" in
    --decryption-key-file) KEY_FILE="$2"; shift 2 ;;
    --expected-tables) EXPECTED_TABLES="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

[[ -f "${BACKUP_FILE}" ]] || { echo "FATAL: backup not found: ${BACKUP_FILE}" >&2; exit 1; }

# integrity: verify against the sidecar checksum when present
if [[ -f "${BACKUP_FILE}.sha256" ]]; then
  EXPECTED="$(cat "${BACKUP_FILE}.sha256")"
  ACTUAL="$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')"
  if [[ "${EXPECTED}" != "${ACTUAL}" ]]; then
    echo "FATAL: checksum mismatch for ${BACKUP_FILE}" >&2; exit 1
  fi
  echo "[restore] checksum OK"
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "${WORKDIR}"' EXIT
DUMP="${WORKDIR}/restore.dump"

# ── decrypt ─────────────────────────────────────────────────────────────────
if [[ -n "${KEY_FILE:-}" ]]; then
  echo "[restore] decrypting with age"
  age --decrypt --identity "${KEY_FILE}" --output "${DUMP}" "${BACKUP_FILE}"
elif [[ -n "${GPG_RECIPIENT:-}" ]]; then
  echo "[restore] decrypting (gpg recipient ${GPG_RECIPIENT})"
  gpg --batch --yes --decrypt --output "${DUMP}" "${BACKUP_FILE}"
elif [[ -n "${GPG_PASSPHRASE:-}" ]]; then
  echo "[restore] decrypting (gpg symmetric)"
  gpg --batch --yes --decrypt --passphrase "${GPG_PASSPHRASE}" \
      --output "${DUMP}" "${BACKUP_FILE}"
else
  echo "FATAL: no decryption method — set GPG_PASSPHRASE, GPG_RECIPIENT, or pass --decryption-key-file" >&2
  exit 1
fi

# ── restore ─────────────────────────────────────────────────────────────────
echo "[restore] pg_restore → ${TARGET_URL//:\/\/[^@]*@/:\/\/****@}"
pg_restore --dbname="$(pg_url "${TARGET_URL}")" --clean --if-exists --no-owner --jobs 4 "${DUMP}"

# ── validate ────────────────────────────────────────────────────────────────
COUNT="$(psql "$(pg_url "${TARGET_URL}")" -tAc \
  "select count(*) from information_schema.tables where table_schema='public'")"
echo "[restore] restored ${COUNT} tables"
if [[ -n "${EXPECTED_TABLES:-}" ]] && [[ "${COUNT}" != "${EXPECTED_TABLES}" ]]; then
  echo "FATAL: restored ${COUNT} tables, expected ${EXPECTED_TABLES}" >&2; exit 1
fi
echo "[restore] done"
