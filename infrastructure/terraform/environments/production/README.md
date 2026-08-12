# Production environment (§72-76)

Architecture: Route53 → CloudFront → WAF → ALB → ECS/Fargate (API + worker
as SEPARATE services) → RDS Postgres + ElastiCache Redis + S3 (media/backups).
No Kubernetes — Fargate only.

## Prereqs

1. `global/state` applied (S3 state bucket + DynamoDB lock).
2. AWS creds with the required permissions (profile in `AWS_PROFILE`).
3. ACM certs: `api.pokemon-vault.dev` in the region + in `us-east-1`.

## Apply

```bash
cd infrastructure/terraform/environments/production
cp terraform.tfvars.example terraform.tfvars     # fill real values
TF_VAR_app_secrets='{"JWT_SECRET":"..."}' \
  terraform init && terraform plan && terraform apply
```

State is remote (S3 `pokemon-vault-tfstate` + DynamoDB locking) — concurrent
runs are serialized automatically.
