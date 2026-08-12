# RDS PostgreSQL module (§72): private, encrypted, automated backups/PITR,
# least-privilege app role, no public access.
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "name" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "sg_ingress_from" { type = string } # app SG id
variable "instance_class" {
  type    = string
  default = "db.t4g.small"
}
variable "allocated_storage" {
  type    = number
  default = 20
}
variable "engine_version" {
  type    = string
  default = "17"
}
variable "db_name" { type = string }
variable "db_user" {
  type    = string
  default = "pv_app"
}
variable "backup_retention" {
  type    = number
  default = 30
}
variable "multi_az" {
  type    = bool
  default = false
}
variable "tags" {
  type    = map(string)
  default = {}
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-subnet-group"
  subnet_ids = var.subnet_ids
  tags       = merge(var.tags, { Name = "${var.name}-db-subnet-group" })
}

# Password stored in Secrets Manager (secrets module), not in state as plaintext.
resource "random_password" "db" {
  length  = 32
  special = false
  keepers = { name = var.name }
}

resource "aws_secretsmanager_secret" "db" {
  name = "pokemon-vault/${var.name}/db"
  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    DATABASE_URL = "postgresql://${var.db_user}:${random_password.db.result}@${aws_db_instance.this.endpoint}/${var.db_name}?schema=public"
  })
}

resource "aws_db_instance" "this" {
  identifier                = "${var.name}-db"
  engine                    = "postgres"
  engine_version            = var.engine_version
  instance_class            = var.instance_class
  allocated_storage         = var.allocated_storage
  storage_encrypted         = true
  db_name                   = var.db_name
  username                  = var.db_user
  password                  = random_password.db.result
  db_subnet_group_name      = aws_db_subnet_group.this.name
  vpc_security_group_ids    = [aws_security_group.this.id]
  backup_retention_period   = var.backup_retention
  backup_window             = "03:00-04:00"
  maintenance_window        = "sun:04:00-sun:05:00"
  multi_az                  = var.multi_az
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.name}-db-final"
  deletion_protection       = true
  tags                      = merge(var.tags, { Name = "${var.name}-db" })
}

resource "aws_security_group" "this" {
  name        = "${var.name}-db"
  description = "RDS private, app-only ingress (§55 no public port)"
  vpc_id      = var.vpc_id
  tags        = merge(var.tags, { Name = "${var.name}-sg-db" })
}

resource "aws_security_group_rule" "ingress_app" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.this.id
  source_security_group_id = var.sg_ingress_from
}

resource "aws_security_group_rule" "egress" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.this.id
}

output "endpoint" { value = aws_db_instance.this.endpoint }
output "db_instance_id" { value = aws_db_instance.this.id }
output "security_group_id" { value = aws_security_group.this.id }
output "db_secret_arn" { value = aws_secretsmanager_secret.db.arn }
