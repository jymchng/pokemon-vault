# Security (§52-57, §90-91)

Pokémon Vault's security posture — transport, headers, rate limits, auth,
secrets, dependency hygiene, and abuse controls.

## Defense in depth

| Layer | Mechanism |
|---|---|
| Transport | HTTPS everywhere; prod DB connections encrypted (sslmode require/verify-full) |
| Headers | Helmet: CSP + HSTS (prod), X-Content-Type-Options: nosniff, X-Frame-Options, Referrer-Policy; X-Powered-By off |
| CORS | Restricted to `POKE_VAULT_WEB_ORIGIN` allow-list (wildcard rejected) |
| Rate limiting | Redis-backed global 60 req/min/IP + per-endpoint overrides (login/register 5, password-reset 3, checkout/payment/pack-open 10) → 429 |
| Abuse controls | Sliding-window abuse counters (login per-IP, pack-opening per-user) with extension points (§90) |
| Auth | Argon2id password hashing; short-lived JWT access + rotating revocable refresh tokens; HTTP-only Secure SameSite=Lax cookies; per-request CSRF origin assertion |
| RBAC | Server-side CUSTOMER/STAFF/ADMIN/SUPER_ADMIN; DB is the source of truth (§11, §93) |
| Validation | Zod on every controller (body/query/params); whitelisted sorts/filters; no SQL interpolation (§51, §87) |
| Secrets | Env locally; AWS Secrets Manager / Doppler in prod; never in git/images/logs; `maskConnectionString` + redaction (§56, §65) |
| Idempotency | Idempotency-Key protocol — SUCCESS replay, 409 on hash mismatch, concurrent IN_PROGRESS 409, FAILED retry (§91) |

## Error handling

Every error becomes `{ error: { code, message, details? } }` (§50/§102);
production sanitizes unknown errors (no stack/SQL/secrets/paths). Stable
machine-readable codes for the frontend (AUTH_INVALID_CREDENTIALS,
PRODUCT_NOT_FOUND, …).

## Logging

Structured JSON with `request_id`/`user_id` correlation; deep redaction of
passwords/tokens/card data/secrets (§65-66).

## Scanning & dependencies

CI runs Gitleaks, CodeQL, Trivy (fs + image), `pnpm audit --prod
--audit-level high`, and `guard-env.sh` (§83). Dependabot is weekly with
semver-major ignored (no blind upgrades, §84). See
docs/operations/security-scanning.md.

## Database security

docs/security/database.md — prod TLS, private networking, least-privilege
role, backups/PITR, fail-closed startup validation.

## Secrets management

docs/security/secrets.md — provider abstraction (env/Doppler/AWS),
name-only error wrapping, connection-string masking.

## Alerts

docs/observability/alerting.md — rules for 5xx spikes, latency, DB/Redis down,
queue depth/failures, inventory failures + response procedure.

## DR

docs/operations/disaster-recovery.md — DB/Redis/object-store/app/region/
credentials/bad-deployment.
