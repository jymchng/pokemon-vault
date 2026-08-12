#!/usr/bin/env bash
# ============================================================================
# Disposable test PostgreSQL (§99) — NEVER touches the prod/dev database.
# Creates a dedicated `pokemon_vault_test` database (dropped first), applies
# migrations, and seeds. Used by CI (unit+integration) and local runs.
#
#   TEST_DATABASE_URL=postgresql://pokemon:pokemon@localhost:5432/pokemon_vault_test
#   ./infrastructure/db/setup-test-db.sh
# ============================================================================
set -euo pipefail

ADMIN_URL="${TEST_ADMIN_URL:-postgresql://pokemon:pokemon@localhost:5432/postgres}"
TEST_DB="${TEST_DB_NAME:-pokemon_vault_test}"
TEST_URL="${TEST_DATABASE_URL:-postgresql://pokemon:pokemon@localhost:5432/${TEST_DB}?schema=public}"

echo "[test-db] dropping ${TEST_DB} if present (disposable — never prod)"
psql "${ADMIN_URL}" -c "DROP DATABASE IF EXISTS \"${TEST_DB}\"" >/dev/null
psql "${ADMIN_URL}" -c "CREATE DATABASE \"${TEST_DB}\"" >/dev/null

echo "[test-db] applying migrations"
cd "$(git rev-parse --show-toplevel)/apps/api"
DATABASE_URL="${TEST_URL}" npx node@22 node_modules/prisma/build/index.js migrate deploy

echo "[test-db] seeding"
DATABASE_URL="${TEST_URL}" npx node@22 node_modules/tsx/dist/cli.mjs prisma/seed.ts >/dev/null

echo "[test-db] ready: ${TEST_URL}"
