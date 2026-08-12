#!/usr/bin/env bash
# ============================================================================
# Guard: .env must never be committed, and no live secrets may enter git (§55-57).
# Runs in CI and locally via `pnpm env:guard`.
# ============================================================================
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "${ROOT}"

fail() { echo "FATAL: $*" >&2; exit 1; }

# 1. No .env file may be tracked by git.
TRACKED_ENV="$(git ls-files | grep -E '(^|/)\.env$' || true)"
if [[ -n "${TRACKED_ENV}" ]]; then
  echo "${TRACKED_ENV}"
  fail "a .env file is tracked by git — remove it (git rm --cached) and rotate any leaked secrets."
fi

# 2. .gitignore must block .env but keep .env.example.
grep -qE '^\.env\*$' .gitignore || fail ".gitignore is missing the '.env*' rule"
grep -qE '^!\.env\.example$' .gitignore || fail ".gitignore is missing the '!.env.example' exception"

# 3. No high-entropy/live secret material in tracked files (outside .env.example).
#    Patterns: Stripe live keys, AWS access keys, PEM private keys, Doppler/AWS tokens.
BLOB_MATCHES="$(grep -rInE --include='*' \
  'sk_live_[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|dp\.(pt|st)\.[A-Za-z0-9]{20,}' \
  . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
  --exclude='*.example' --exclude-dir=.agenthicc 2>/dev/null || true)"
if [[ -n "${BLOB_MATCHES}" ]]; then
  echo "${BLOB_MATCHES}"
  fail "possible live secret committed — scrub the file and rotate the credential."
fi

echo "OK: no .env tracked; .gitignore blocks .env; no obvious live secrets in tracked files."
