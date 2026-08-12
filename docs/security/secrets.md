# Secrets Management (§56)

**Rule: secrets live in environment variables locally, and in a secrets
manager (AWS Secrets Manager or Doppler) in production. Never in git, never in
container images, never in logs.**

## 1. Where secrets live

| Environment | Source | How |
|---|---|---|
| Local dev | `.env` (repo root) | `cp .env.example .env`, fill in values |
| CI | GitHub Actions secrets | injected into job env |
| Staging/Prod | AWS Secrets Manager **or** Doppler | resolved at startup by `SECRETS_PROVIDER` |

`.env` is ignored by git (`.gitignore`: `.env*`, `!.env.example`) and `pnpm
env:guard` fails CI if a `.env` is ever tracked or a live secret pattern
appears in a tracked file.

## 2. Provider abstraction

`apps/api/src/security/secrets.ts` exposes a single `SecretProvider` interface
selected by `SECRETS_PROVIDER`:

| Provider | When | Resolution |
|---|---|---|
| `env` (default) | local/dev/CI | `process.env[name]` |
| `doppler` | prod (Doppler) | `GET api.doppler.com/v3/configs/config/secrets/download?format=json` with `Bearer DOPPLER_TOKEN`, fetched once + cached |
| `aws` | prod (AWS Secrets Manager) | `GetSecretValue` on `SECRETS_ARN` (region `AWS_REGION`), parses the JSON `SecretString`, cached |

- `getRequiredSecret(provider, name)` fails startup with **the variable name
  only** — never the value.
- AWS SDK is lazily imported so local dev never pays for it:
  `pnpm --filter @pokemon-vault/api add @aws-sdk/client-secrets-manager`.

### AWS Secrets Manager (prod)

- One secret JSON document, e.g. `pokemon-vault/prod`:

  ```json
  {
    "DATABASE_URL": "postgres://pv_app:...@db.internal:5432/pokemon_vault",
    "JWT_SECRET": "...",
    "JWT_REFRESH_SECRET": "...",
    "STRIPE_SECRET_KEY": "...",
    "STRIPE_WEBHOOK_SECRET": "..."
  }
  ```

- `SECRETS_PROVIDER=aws`, `SECRETS_ARN=arn:aws:secretsmanager:...`, `AWS_REGION=...`.
- Access via IAM role (ECS task role / K8s IRSA) — **no long-lived access keys
  in the environment**.
- Enable **automatic rotation** (Lambda) for database credentials and Stripe keys.
- The `DATABASE_URL` returned uses the least-privilege `pv_app` role (§55).

### Doppler (prod)

- `SECRETS_PROVIDER=doppler`, `DOPPLER_TOKEN=dp.pt.<service-token>`,
  optional `DOPPLER_PROJECT` / `DOPPLER_CONFIG` (default config `prd`).
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
   update `SECRETS_ARN`/Doppler config.

## 4. Variables

`NODE_ENV`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
`WEB_ORIGIN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, S3 keys,
`EMAIL_API_KEY`, `SENTRY_DSN`, `DATABASE_SSLMODE`, `SECRETS_PROVIDER`,
`SECRETS_ARN`, `AWS_REGION`, `DOPPLER_TOKEN` — all documented in
`.env.example` with `openssl rand -hex 64` guidance for JWT secrets.

## 5. Verified by

- `apps/api/src/security/secrets.spec.ts` — env/doppler/aws providers, caching,
  selection, error naming, `maskConnectionString`.
- `pnpm env:guard` — git/secret hygiene in CI.
