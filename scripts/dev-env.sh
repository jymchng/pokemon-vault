#!/usr/bin/env bash
# ============================================================================
# Pokémon Vault — native dev environment (G53)
#
# Mirrors the docker-compose.yml topology on the host (no Docker required):
#   postgres + redis  →  api :3001  →  worker  →  web :3000
#
# Usage:
#   ./scripts/dev-env.sh up          provision disposable dev DB + start stack
#   ./scripts/dev-env.sh status      show running services + readiness
#   ./scripts/dev-env.sh test        run the full E2E suite (API journey +
#                                    storefront browser journey) against the
#                                    running stack
#   ./scripts/dev-env.sh down        stop the stack (add --drop-db to also drop
#                                    the disposable dev database)
#   ./scripts/dev-env.sh down --drop-db
#
# State (PIDs/logs) lives in ./.dev-env/ (gitignored). The dev database is
# `pokemon_vault_dev` — disposable, never production.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STATE_DIR="$ROOT/.dev-env"
LOG_DIR="$STATE_DIR/logs"
mkdir -p "$LOG_DIR"

API_PORT="${POKE_VAULT_API_PORT:-3001}"
WEB_PORT="${POKE_VAULT_WEB_PORT:-3000}"
DEV_DB="${POKE_VAULT_DEV_DB_NAME:-pokemon_vault_dev}"
ADMIN_PG_URL="${POKE_VAULT_DEV_ENV_ADMIN_PG_URL:-postgresql://pokemon:pokemon@localhost:5432/postgres}"
DEV_DB_URL="postgresql://pokemon:pokemon@localhost:5432/${DEV_DB}?schema=public"
WEB_URL="http://localhost:${WEB_PORT}"

# ---------------------------------------------------------------------------
# Toolchain — the repo requires Node >= 22.12; the host may ship an older
# default node, so resolve a Node 22 binary via npx once and reuse it.
# ---------------------------------------------------------------------------
NODE22_BIN="$(command npx --yes node@22 -e 'console.log(process.execPath)')"

PNPM_PATH="$(command -v pnpm || true)"
if [[ -z "${PNPM_PATH}" ]]; then
  echo "[dev-env] error: pnpm not found on PATH" >&2
  exit 1
fi
run_pnpm() { "${NODE22_BIN}" "${PNPM_PATH}" "$@"; }

# ---------------------------------------------------------------------------
# Logging helpers
# ---------------------------------------------------------------------------
info()  { echo "[dev-env] $*"; }
warn()  { echo "[dev-env] WARN: $*" >&2; }
die()   { echo "[dev-env] ERROR: $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Dependencies — Postgres + Redis (start best-effort, then wait for readiness)
# ---------------------------------------------------------------------------
require_postgres() {
  command -v pg_isready >/dev/null 2>&1 || die "psql/pg_isready not installed (apt install postgresql-client)"
  if ! pg_isready -q; then
    warn "PostgreSQL not accepting connections — attempting to start it"
    if command -v pg_ctlcluster >/dev/null 2>&1; then
      pg_lsclusters 2>/dev/null | awk 'NR>1 && $4!="online" {print $1, $2}' \
        | while read -r ver cl; do pg_ctlcluster "$ver" "$cl" start || true; done
    elif command -v service >/dev/null 2>&1 && service postgresql status >/dev/null 2>&1; then
      service postgresql start || true
    fi
    for _ in $(seq 1 30); do pg_isready -q && break; sleep 1; done
  fi
  pg_isready -q || die "PostgreSQL is not reachable"
}

require_redis() {
  if ! command -v redis-cli >/dev/null 2>&1; then
    warn "redis-cli not installed — assuming Redis is provided externally"
  fi
  if ! redis-cli ping >/dev/null 2>&1; then
    warn "Redis not responding — attempting to start it"
    if command -v service >/dev/null 2>&1 && service redis-server status >/dev/null 2>&1; then
      service redis-server start || true
    fi
    for _ in $(seq 1 30); do redis-cli ping >/dev/null 2>&1 && break; sleep 1; done
  fi
  redis-cli ping >/dev/null 2>&1 || die "Redis is not reachable"
}

# ---------------------------------------------------------------------------
# Load root .env (secrets + defaults) without overriding pre-exported vars.
# dotenv-style parsing: KEY=value lines, quotes stripped, # comments skipped.
# ---------------------------------------------------------------------------
load_root_env() {
  [[ -f "$ROOT/.env" ]] || { warn "no .env at repo root — using defaults"; return 0; }
  local k v
  while IFS='=' read -r k v; do
    [[ -z "$k" || "$k" == \#* ]] && continue
    v="${v%\"}"; v="${v#\"}"
    export "$k=$v"
  done < "$ROOT/.env"
}

# ---------------------------------------------------------------------------
# DB — drop/create disposable dev DB, apply migrations, seed (idempotent seed)
# ---------------------------------------------------------------------------
reset_dev_db() {
  require_postgres
  info "provisioning disposable dev DB '${DEV_DB}' (never prod)"
  psql "$ADMIN_PG_URL" -q -c "DROP DATABASE IF EXISTS \"${DEV_DB}\""
  psql "$ADMIN_PG_URL" -q -c "CREATE DATABASE \"${DEV_DB}\""
  info "applying migrations to ${DEV_DB}"
  ( cd apps/api \
      && POKE_VAULT_DATABASE_URL="$DEV_DB_URL" "${NODE22_BIN}" node_modules/prisma/build/index.js migrate deploy )
  info "seeding ${DEV_DB}"
  ( cd apps/api \
      && POKE_VAULT_DATABASE_URL="$DEV_DB_URL" "${NODE22_BIN}" node_modules/tsx/dist/cli.mjs prisma/seed.ts >/dev/null )
  info "dev DB ready: ${DEV_DB}"
}

# ---------------------------------------------------------------------------
# Build — api (tsc) + worker (tsc) + web (next build, inlines NEXT_PUBLIC_*)
# ---------------------------------------------------------------------------
build_all() {
  info "building api + worker + web (this can take a minute)..."
  ( cd apps/api && "${NODE22_BIN}" node_modules/typescript/bin/tsc -p tsconfig.json )
  ( cd apps/api && "${NODE22_BIN}" -e "require('fs').cpSync('src/generated','dist/src/generated',{recursive:true})" )
  ( cd apps/worker && "${NODE22_BIN}" node_modules/typescript/bin/tsc -p tsconfig.json )
  (
    cd apps/web \
      && POKE_VAULT_NEXT_PUBLIC_API_URL="http://localhost:${API_PORT}" \
         "${NODE22_BIN}" node_modules/next/dist/bin/next build
  )
  info "build complete"
}

# ---------------------------------------------------------------------------
# Ports — refuse to double-start when a service is already listening
# ---------------------------------------------------------------------------
port_busy() { ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${1}$"; }

# ---------------------------------------------------------------------------
# Start — api, worker, web with the disposable dev DB
# ---------------------------------------------------------------------------
start_stack() {
  load_root_env
  export NODE_ENV=development
  export POKE_VAULT_DATABASE_URL="$DEV_DB_URL"
  export POKE_VAULT_REDIS_URL="${POKE_VAULT_REDIS_URL:-redis://localhost:6379}"
  # Dev/E2E: the storefront + API journeys register several users in <60s,
  # so raise the per-endpoint auth throttle (default 5/60s) for the dev stack.
  export POKE_VAULT_AUTH_REGISTER_RATE_LIMIT=100
  export POKE_VAULT_AUTH_LOGIN_RATE_LIMIT=100
  export API_PORT WEB_PORT

  require_postgres
  require_redis

  [[ -d apps/api/dist/src && -f apps/api/dist/src/main.js ]] || die "api dist missing — run '$0 up' from a clean build (build_all)"
  [[ -f apps/worker/dist/main.js ]] || die "worker dist missing — run build_all first"
  [[ -d apps/web/.next ]] || die "web .next missing — run build_all first"

  # --- API ---
  if port_busy "$API_PORT"; then
    if [[ -f "$STATE_DIR/api.pid" ]] && kill -0 "$(cat "$STATE_DIR/api.pid")" 2>/dev/null; then
      info "api already running (pid $(cat "$STATE_DIR/api.pid"))"
    else
      die "port ${API_PORT} is busy by another process — free it or stop the previous stack"
    fi
  else
    info "starting api on :${API_PORT} → ${DEV_DB}"
    ( cd apps/api && exec "${NODE22_BIN}" dist/src/main.js ) >>"$LOG_DIR/api.log" 2>&1 &
    echo $! > "$STATE_DIR/api.pid"
  fi

  # --- Worker ---
  if [[ -f "$STATE_DIR/worker.pid" ]] && kill -0 "$(cat "$STATE_DIR/worker.pid")" 2>/dev/null; then
    info "worker already running (pid $(cat "$STATE_DIR/worker.pid"))"
  else
    info "starting worker"
    ( cd apps/worker && exec "${NODE22_BIN}" dist/main.js ) >>"$LOG_DIR/worker.log" 2>&1 &
    echo $! > "$STATE_DIR/worker.pid"
  fi

  # --- Web ---
  if port_busy "$WEB_PORT"; then
    if [[ -f "$STATE_DIR/web.pid" ]] && kill -0 "$(cat "$STATE_DIR/web.pid")" 2>/dev/null; then
      info "web already running (pid $(cat "$STATE_DIR/web.pid"))"
    else
      die "port ${WEB_PORT} is busy by another process — free it or stop the previous stack"
    fi
  else
    info "starting web on :${WEB_PORT} (proxying /api/v1 → :${API_PORT})"
    ( cd apps/web && exec "${NODE22_BIN}" node_modules/next/dist/bin/next start -p "$WEB_PORT" ) >>"$LOG_DIR/web.log" 2>&1 &
    echo $! > "$STATE_DIR/web.pid"
  fi

  wait_ready
}

# ---------------------------------------------------------------------------
# Readiness — poll health/ready + web root + worker log marker
# ---------------------------------------------------------------------------
wait_ready() {
  info "waiting for api readiness (health/ready)..."
  local ok=1 i
  for i in $(seq 1 90); do
    if curl -sf "http://localhost:${API_PORT}/api/v1/health/ready" >/dev/null 2>&1; then ok=0; break; fi
    sleep 1
  done
  [[ $ok -eq 0 ]] || die "api did not become ready in 90s — see $LOG_DIR/api.log"

  info "waiting for web readiness..."
  ok=1
  for i in $(seq 1 60); do
    if curl -sf "$WEB_URL/" >/dev/null 2>&1; then ok=0; break; fi
    sleep 1
  done
  [[ $ok -eq 0 ]] || die "web did not become ready in 60s — see $LOG_DIR/web.log"

  info "waiting for worker readiness..."
  ok=1
  for i in $(seq 1 60); do
    if grep -q "Worker ready" "$LOG_DIR/worker.log" 2>/dev/null; then ok=0; break; fi
    sleep 1
  done
  [[ $ok -eq 0 ]] || die "worker did not become ready in 60s — see $LOG_DIR/worker.log"

  info "stack is up: api :${API_PORT} · web :${WEB_PORT} · worker · db ${DEV_DB}"
}

# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------
cmd_status() {
  local p
  for p in api worker web; do
    if [[ -f "$STATE_DIR/$p.pid" ]] && kill -0 "$(cat "$STATE_DIR/$p.pid")" 2>/dev/null; then
      echo "[dev-env] $p: running (pid $(cat "$STATE_DIR/$p.pid"))"
    else
      echo "[dev-env] $p: not running"
    fi
  done
  curl -sf "http://localhost:${API_PORT}/api/v1/health/ready" >/dev/null 2>&1 \
    && echo "[dev-env] api readiness: OK" || echo "[dev-env] api readiness: DOWN"
  curl -sf "$WEB_URL/" >/dev/null 2>&1 \
    && echo "[dev-env] web: OK" || echo "[dev-env] web: DOWN"
  echo "[dev-env] dev db: ${DEV_DB}"
}

# ---------------------------------------------------------------------------
# Down — kill recorded PIDs (exact, never pkill -f), optionally drop the DB
# ---------------------------------------------------------------------------
cmd_down() {
  local drop_db=0
  [[ "${1:-}" == "--drop-db" ]] && drop_db=1
  local p pid
  for p in web api worker; do
    if [[ -f "$STATE_DIR/$p.pid" ]]; then
      pid="$(cat "$STATE_DIR/$p.pid")"
      kill "$pid" 2>/dev/null || true
      rm -f "$STATE_DIR/$p.pid"
    fi
  done
  sleep 2
  # Fallback: the recorded pid may have been a wrapper (subshell) whose child
  # (`next start` / node) survived. If our ports are still busy, kill the
  # listeners — this stack owns them (dev env only, never production).
  if port_busy "$WEB_PORT"; then fuser -k "$WEB_PORT"/tcp >/dev/null 2>&1 || true; fi
  if port_busy "$API_PORT"; then fuser -k "$API_PORT"/tcp >/dev/null 2>&1 || true; fi
  sleep 1
  if [[ $drop_db -eq 1 ]]; then
    require_postgres
    psql "$ADMIN_PG_URL" -q -c "DROP DATABASE IF EXISTS \"${DEV_DB}\""
    info "dropped dev DB ${DEV_DB}"
  fi
  info "stack stopped (logs kept in $LOG_DIR)"
}

# ---------------------------------------------------------------------------
# Test — API journey spec + storefront browser journey against the stack
# ---------------------------------------------------------------------------
# Resolve the Playwright JS CLI (the .bin wrapper is a shell script and cannot
# be run under `node`; @playwright/test is a direct dep of both apps).
pw_cli() {
  ( cd "$ROOT/$1" && "${NODE22_BIN}" -e "console.log(require.resolve('@playwright/test/cli'))" )
}

cmd_test() {
  cmd_status
  # The disposable dev env's Redis is shared with the running API. Rate-limit
  # counters (§52) keyed by IP would otherwise bleed between E2E runs (a single
  # journey run makes ~7 login/register calls vs the 5-per-60s cap). Flushing
  # Redis before the suite keeps E2E deterministic; the dev env is disposable.
  if command -v redis-cli >/dev/null 2>&1 && redis-cli ping >/dev/null 2>&1; then
    info "flushing dev Redis (rate-limit/queue state) for deterministic E2E"
    redis-cli FLUSHDB >/dev/null
  fi
  info "E2E 1/2 — API journey spec (apps/api)..."
  (
    cd "$ROOT/apps/api" \
      && POKE_VAULT_E2E_API_URL="http://localhost:${API_PORT}" \
         "${NODE22_BIN}" "$(pw_cli apps/api)" test --config=playwright.config.ts
  )
  info "E2E 2/2 — storefront browser journey (apps/web)..."
  (
    cd "$ROOT/apps/web" \
      && POKE_VAULT_E2E_WEB_URL="$WEB_URL" \
         "${NODE22_BIN}" "$(pw_cli apps/web)" test --config=playwright.config.ts
  )
  info "E2E suite passed against the running dev environment"
}

# ---------------------------------------------------------------------------
# Docs — serve ./docs as a browsable static site (scripts/docs-server.cjs)
# ---------------------------------------------------------------------------
cmd_docs() {
  if command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | grep -qE "[:.]${DOCS_PORT:-8080}$"; then
    info "docs server already running on :${DOCS_PORT:-8080} → http://localhost:${DOCS_PORT:-8080}"
  else
    info "starting docs server on :${DOCS_PORT:-8080} → http://localhost:${DOCS_PORT:-8080}"
    ( cd "$ROOT" && exec "${NODE22_BIN}" scripts/docs-server.cjs ) >>"$LOG_DIR/docs.log" 2>&1 &
    echo $! > "$STATE_DIR/docs.pid"
    sleep 1
    curl -sf "http://localhost:${DOCS_PORT:-8080}/" >/dev/null 2>&1 \
      && info "docs ready: http://localhost:${DOCS_PORT:-8080}" \
      || warn "docs server may not be ready yet — see $LOG_DIR/docs.log"
  fi
}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
case "${1:-}" in
  up)
    reset_dev_db
    build_all
    start_stack
    ;;
  start)          # re-start without rebuilding/re-provisioning
    start_stack
    ;;
  status)
    cmd_status
    ;;
  test)
    cmd_test
    ;;
  docs)
    cmd_docs
    ;;
  down)
    cmd_down "${2:-}"
    ;;
  *)
    echo "usage: $0 {up|start|status|test|docs|down [--drop-db]}" >&2
    exit 1
    ;;
esac
