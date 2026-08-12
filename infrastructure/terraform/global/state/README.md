# Terraform remote state bootstrap (§74)

One-time bootstrap for a brand-new AWS account. Creates the S3 bucket and
DynamoDB locking table that every environment's `backend.tf` references.

```bash
cd infrastructure/terraform/global/state
cp terraform.tfvars.example terraform.tfvars   # set state_bucket (globally unique)
terraform init
terraform apply
```

After this, environments use remote state:

```hcl
backend "s3" {
  bucket         = "<state_bucket>"
  key            = "pokemon-vault/<env>/terraform.tfstate"
  region         = "eu-central-1"
  dynamodb_table = "terraform-state-lock"
  encrypt        = true
}
```
