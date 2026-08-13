# Terraform — Pokémon Vault AWS Infrastructure (§72-76)

Infrastructure-as-code for the Pokémon Vault production backend. **No
Kubernetes** — ECS/Fargate with API and worker as separate services.

## Architecture

```
Route53 (pokemon-vault.dev)
  └─ CloudFront (CDN, ACM us-east-1)          [modules/cdn]
       └─ WAF (managed rules + rate limit)     [modules/waf]
            └─ ALB (HTTPS, /health/ready)      [modules/load-balancer]
                 └─ ECS/Fargate
                      ├─ api service   (behind ALB)     │
                      └─ worker service (separate, no LB)│ → RDS Postgres (encrypted,
                                                          │    private, PITR) [modules/database]
                                                          → ElastiCache Redis (encrypted)
                                                            [modules/redis]
                                                          → S3 media + backups (versioned)
                                                            [modules/storage]
                 └─ Secrets Manager (app/db/redis)       [modules/secrets]
VPC (private subnets, NAT, S3 endpoints)                 [modules/network]
CloudWatch + SNS alerts                                  [modules/monitoring]
```

## Layout

```
global/state/        S3 state bucket + DynamoDB lock (bootstrap once)
modules/             reusable modules: network, database, redis, storage,
                     compute (ECS), load-balancer, dns, cdn, waf, monitoring, secrets
environments/
  dev/       smallest footprint (no CDN/WAF/DNS; ALB direct)
  staging/   mirrors production, smaller instances, staging domain
  production/ full chain + autoscaling + multi-AZ DB
```

## Remote state (§74)

Every environment uses `backend "s3"` with the bucket + DynamoDB lock table
created by `global/state`:

```hcl
backend "s3" {
  bucket         = "pokemon-vault-tfstate"
  key            = "pokemon-vault/<env>/terraform.tfstate"
  region         = "eu-central-1"
  dynamodb_table = "terraform-state-lock"
  encrypt        = true
}
```

## Apply

```bash
# one-time
cd infrastructure/terraform/global/state && terraform apply

# per environment
cd infrastructure/terraform/environments/<env>
cp terraform.tfvars.example terraform.tfvars   # fill real values
TF_VAR_app_secrets='{"POKE_VAULT_POKE_VAULT_JWT_SECRET":"...","POKE_VAULT_POKE_VAULT_STRIPE_SECRET_KEY":"...","POKE_VAULT_POKE_VAULT_SENTRY_DSN":"..."}' \
  terraform init && terraform plan && terraform apply
```

Secrets never live in git: app secrets flow through `TF_VAR_app_secrets`
(operator secret store) into Secrets Manager; the ECS task role reads them via
`secretsmanager:GetSecretValue` (§56).

## Validate

```bash
terraform fmt -recursive -check .
terraform validate   # run inside each module and environment dir
```

All 11 modules and 3 environments pass `terraform validate`.
