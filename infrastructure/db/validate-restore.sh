#!/usr/bin/env bash
# ============================================================================
# Restore validation (§71) — proves a backup is actually restorable, not just
# present. Runs in the TEST environment (CI or local): restores the given
# encrypted backup into a scratch database on the same Postgres server, then
# checks:
#   1. table count matches the source database
#   2. seeded domain data survives (sample row counts)
# The scratch DB is dropped afterwards. Backup --verify uses this.
#
# Usage:
#   SOURCE_DATABASE_URL=postgres://user:pass@host:5432/pokemon_vault \
#   GPG_PASSPHRASE=... ./infrastructure/db/validate-restore.sh [backup.enc]
#   (backup.enc defaults to the newest pokemon_vault_daily_*.enc in BACKUP_DIR)
# ============================================================================
set -euo pipefail

# pg tools (pg_dump/pg_restore/psql) reject Prisma's ?schema= query param —
# strip everything after '?' for tool calls.
pg_url() { echo "${1%%\?*}"; }

BACKUP_FILE="${1:-}"
if [[ -z "${BACKUP_FILE}" ]]; then
  BACKUP_FILE="$(ls -t "${BACKUP_DIR:-/var/backups/pokemon-vault}"/pokemon_vault_daily_*.enc 2>/dev/null | head -1 || true)"
fi
[[ -n "${BACKUP_FILE}" && -f "${BACKUP_FILE}" ]] || { echo "FATAL: no backup to validate" >&2; exit 1; }

SOURCE_URL="${SOURCE_DATABASE_URL:?SOURCE_DATABASE_URL is required (source of truth for counts)}"
PG_SRC="$(pg_url "${SOURCE_URL}")"  # no ?schema= for pg tools

# Parse the source host/port/db so we can create a scratch DB on the same server.
# URL: postgres://user:pass@host:5432/db?schema=public
HOST="$(echo "${PG_SRC}" | sed -E 's#^postgres(ql)?://[^@]*@([^:/]+).*#\2#')"
PORT="$(echo "${PG_SRC}" | sed -E 's#^postgres(ql)?://[^@]*@[^:]+:([0-9]+)/.*#\2#')"
DB="$(echo "${PG_SRC}" | sed -E 's#^postgres(ql)?://[^@]*@[^/]+/([^?]+).*#\2#')"
USERINFO="$(echo "${PG_SRC}" | sed -E 's#^postgres(ql)?://([^@]*)@.*#\2#')"
PORT="${PORT:-5432}"

SCRATCH="pokemon_vault_restore_test_$(date -u +%Y%m%d%H%M%S)"
SCRATCH_URL="postgresql://${USERINFO}@${HOST}:${PORT}/${SCRATCH}?schema=public"

echo "[validate] validating ${BACKUP_FILE##*/} → scratch db ${SCRATCH}"
trap 'psql "$(pg_url "${SOURCE_URL}")" -c "DROP DATABASE IF EXISTS \"${SCRATCH}\" CONNECTION LIMIT 0" >/dev/null 2>&1 || true' EXIT

psql "$(pg_url "${SOURCE_URL}")" -tAc "CREATE DATABASE \"${SCRATCH}\"" >/dev/null

# Restore (checksum + decrypt + pg_restore) with an expected table count from source.
SRC_TABLES="$(psql "${PG_SRC}" -tAc \
  "select count(*) from information_schema.tables where table_schema='public'")"
GPG_PASSPHRASE="${GPG_PASSPHRASE:-}" ./infrastructure/db/restore.sh \
  "${BACKUP_FILE}" "$(pg_url "${SCRATCH_URL}")" --expected-tables "${SRC_TABLES}"

# Domain sanity: seeded products + orders survive the round trip.
PRODUCTS_SRC="$(psql "${PG_SRC}" -tAc 'select count(*) from "Product"')"
PRODUCTS_RST="$(psql "$(pg_url "${SCRATCH_URL}")" -tAc 'select count(*) from "Product"')"
echo "[validate] products source=${PRODUCTS_SRC} restored=${PRODUCTS_RST}"
[[ "${PRODUCTS_SRC}" == "${PRODUCTS_RST}" ]] || { echo "FATAL: product count mismatch" >&2; exit 1; }

ORDERS_SRC="$(psql "${PG_SRC}" -tAc 'select count(*) from "Order"')"
ORDERS_RST="$(psql "$(pg_url "${SCRATCH_URL}")" -tAc 'select count(*) from "Order"')"
echo "[validate] orders source=${ORDERS_SRC} restored=${ORDERS_RST}"
[[ "${ORDERS_SRC}" == "${ORDERS_RST}" ]] || { echo "FATAL: order count mismatch" >&2; exit 1; }

echo "[validate] OK — backup restores cleanly with ${SRC_TABLES} tables"

