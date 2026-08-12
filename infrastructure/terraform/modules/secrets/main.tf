# Secrets module (§56, §72): Secrets Manager + rotation wiring.
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "name" { type = string }
variable "tags" {
  type    = map(string)
  default = {}
}

# App secrets: one JSON document per environment, never in git/state plaintext
# (values injected via TF_VAR_* or -var-file from the operator's secrets store).
variable "app_secrets" {
  type      = map(string)
  sensitive = true
  default   = {}
}

resource "aws_secretsmanager_secret" "app" {
  name = "pokemon-vault/${var.name}/app"
  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id     = aws_secretsmanager_secret.app.id
  secret_string = jsonencode(var.app_secrets)
}

resource "aws_secretsmanager_secret" "redis" {
  name = "pokemon-vault/${var.name}/redis"
  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "redis" {
  secret_id = aws_secretsmanager_secret.redis.id
  secret_string = jsonencode({
    REDIS_URL = "rediss://${var.redis_endpoint}:${var.redis_port}"
  })
}

variable "redis_endpoint" { type = string }
variable "redis_port" {
  type    = number
  default = 6379
}

output "app_secret_arn" { value = aws_secretsmanager_secret.app.arn }
output "redis_secret_arn" { value = aws_secretsmanager_secret.redis.arn }
