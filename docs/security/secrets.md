# Secrets Management (§56)

**Rule: secrets live in environment variables locally, and in a secrets
manager (AWS Secrets Manager or Doppler) in production. Never in git, never in
container images, never in logs.**

## 1. Where secrets live

| Environment | Source | How |
|---|---|---|
| Local dev | `.env` (repo root) | `cp .env.example .env`, fill in values |
| CI | GitHub Actions secrets | injected into job env |
| Staging/Prod | AWS Secrets Manager **or** Doppler | resolved at startup by `POKE_VAULT_SECRETS_PROVIDER` |

`.env` is ignored by git (`.gitignore`: `.env*`, `!.env.example`) and `pnpm
env:guard` fails CI if a `.env` is ever tracked or a live secret pattern
appears in a tracked file.

## 2. Provider abstraction

`apps/api/src/security/secrets.ts` exposes a single `SecretProvider` interface
selected by `POKE_VAULT_SECRETS_PROVIDER`:

| Provider | When | Resolution |
|---|---|---|
| `env` (default) | local/dev/CI | `process.env[name]` |
| `doppler` | prod (Doppler) | `GET api.doppler.com/v3/configs/config/secrets/download?format=json` with `Bearer POKE_VAULT_DOPPLER_TOKEN`, fetched once + cached |
| `aws` | prod (AWS Secrets Manager) | `GetSecretValue` on `POKE_VAULT_SECRETS_ARN` (region `POKE_VAULT_AWS_REGION`), parses the JSON `SecretString`, cached |

- `getRequiredSecret(provider, name)` fails startup with **the variable name
  only** — never the value.
- AWS SDK is lazily imported so local dev never pays for it:
  `pnpm --filter @pokemon-vault/api add @aws-sdk/client-secrets-manager`.

### AWS Secrets Manager (prod)

- One secret JSON document, e.g. `pokemon-vault/prod`:

  ```json
  {
    "POKE_VAULT_DATABASE_URL": "postgres://pv_app:...@db.internal:5432/pokemon_vault",
    "POKE_VAULT_JWT_SECRET": "...",
    "POKE_VAULT_JWT_REFRESH_SECRET": "...",
    "POKE_VAULT_STRIPE_SECRET_KEY": "...",
    "POKE_VAULT_STRIPE_WEBHOOK_SECRET": "..."
  }
  ```

- `POKE_VAULT_SECRETS_PROVIDER=aws`, `POKE_VAULT_SECRETS_ARN=arn:aws:secretsmanager:...`, `POKE_VAULT_AWS_REGION=...`.
- Access via IAM role (ECS task role / K8s IRSA) — **no long-lived access keys
  in the environment**.
- Enable **automatic rotation** (Lambda) for database credentials and Stripe keys.
- The `POKE_VAULT_DATABASE_URL` returned uses the least-privilege `pv_app` role (§55).

### Doppler (prod)

- `POKE_VAULT_SECRETS_PROVIDER=doppler`, `POKE_VAULT_DOPPLER_TOKEN=dp.pt.<service-token>`,
  optional `POKE_VAULT_DOPPLER_PROJECT` / `POKE_VAULT_DOPPLER_CONFIG` (default config `prd`).
- Use a **service token scoped to one project/config** with least access.

## 3. Hard rules

1. **Never commit `.env`** — `pnpm env:guard` enforces it (gitignore rule +
   tracked-file scan for `sk_live_*`, `AKIA*`, `BEGIN *PRIVATE KEY`,
   `dp.pt.*`/`dp.st.*`).
2. **Never bake secrets into images** — no `ENV` with values in Dockerfiles,
   no `.env` copied at build; compose injects from the host env.
3. **Never log secrets** — `maskConnectionString()` redacts passwords in
   connection strings; `assertSecureDbConfig()` errors name the variable only;
   error envelopes (`{error:{code,message}}`, §50) never echo request bodies.
4. **Rotate on any leak** — revoke the credential, rotate via the provider,
   update `POKE_VAULT_SECRETS_ARN`/Doppler config.

## 4. Variables

`NODE_ENV`, `POKE_VAULT_DATABASE_URL`, `POKE_VAULT_REDIS_URL`, `POKE_VAULT_JWT_SECRET`, `POKE_VAULT_JWT_REFRESH_SECRET`,
`POKE_VAULT_WEB_ORIGIN`, `POKE_VAULT_STRIPE_SECRET_KEY`, `POKE_VAULT_STRIPE_WEBHOOK_SECRET`, S3 keys,
`POKE_VAULT_EMAIL_API_KEY`, `POKE_VAULT_SENTRY_DSN`, `POKE_VAULT_DATABASE_SSLMODE`, `POKE_VAULT_SECRETS_PROVIDER`,
`POKE_VAULT_SECRETS_ARN`, `POKE_VAULT_AWS_REGION`, `POKE_VAULT_DOPPLER_TOKEN` — all documented in
`.env.example` with `openssl rand -hex 64` guidance for JWT secrets.

## 5. Verified by

- `apps/api/src/security/secrets.spec.ts` — env/doppler/aws providers, caching,
  selection, error naming, `maskConnectionString`.
- `pnpm env:guard` — git/secret hygiene in CI.
