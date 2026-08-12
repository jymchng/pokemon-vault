# Deployment (§58, §72-82)

Deployment is fully automated through GitHub Actions + Terraform. **No laptop
deploys** — only the CD pipeline (with OIDC roles) touches the environments.

## Environments

| Environment | Terraform root | URL |
|---|---|---|
| dev | `infrastructure/terraform/environments/dev` | local Docker |
| staging | `infrastructure/terraform/environments/staging` | staging-api.pokemon-vault.dev |
| production | `infrastructure/terraform/environments/production` | api.pokemon-vault.dev |

## Architecture (AWS)

Route53 → CloudFront → WAF → ALB → ECS/Fargate (separate `api` + `worker`
services) → RDS PostgreSQL / ElastiCache Redis / S3. All IaC lives in
`infrastructure/terraform/modules/*` (network, database, redis, storage,
compute, load-balancer, dns, cdn, waf, monitoring, secrets). Remote state is in
S3 + DynamoDB locking.

## CI/CD

- **CI (`.github/workflows/ci.yml`)**: install → lint → typecheck → unit +
  integration (real Postgres/Redis) → build (all packages + Docker production
  images) → security (Trivy image+fs, Gitleaks, CodeQL, pnpm audit, guard-env).
- **CD (`.github/workflows/cd.yml`)**: on main — build immutable git-SHA
  images → push GHCR → migrate staging DB → deploy staging (Terraform) → smoke
  `/api/v1/health/ready` → **manual approval** → migrate prod DB → deploy prod →
  health check → post-deploy 5xx monitor with **auto-rollback**.

Image tags are git SHAs (`IMAGE_TAG=${{ github.sha }}`) — never `latest`-only.

## Manual deploy (if ever needed)

```bash
cd infrastructure/terraform/environments/production
terraform init
terraform apply -var-file ../../../.tfvars-ci -var-file terraform.tfvars
```

## Migrations

- `prisma migrate deploy` runs in CI/CD **before** new tasks receive traffic
  (ECS run-task, exit code asserted).
- Migrations are **forward-only**; follow expand → migrate → contract for
  backward compatibility (§81). See docs/operations/deploy-safety.md.

## Rollback

App/worker: redeploy the previous immutable SHA via Terraform (or the
`rollback` workflow_dispatch job). DB: forward-only corrective migrations; true
data rollback = restore from the verified encrypted backup (§70). Infra:
versioned S3 state + revert tfvars. See docs/operations/deploy-safety.md §5.

## Security posture

- Production DB: encrypted (sslmode require/verify-full), private networking,
  least-privilege `pv_app` role, no public port (§55).
- Secrets via AWS Secrets Manager / Doppler (SECRETS_PROVIDER), never in git or
  images (§56); `guard-env.sh` enforces.
- CORS restricted to `WEB_ORIGIN`; Helmet + CSP + HSTS; Redis rate limiting (§52-54).
