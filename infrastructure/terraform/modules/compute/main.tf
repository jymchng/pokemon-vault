# ECS/Fargate compute module (§72): separate api + worker services, no K8s.
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "name" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "app_sg_id" { type = string }
variable "alb_target_group_arn" { type = string } # api only
variable "image_api" { type = string }            # ghcr.io/.../api:<sha>
variable "image_worker" { type = string }         # ghcr.io/.../worker:<sha>
variable "api_port" {
  type    = number
  default = 3001
}
variable "web_origin" { type = string }
variable "app_secret_arn" { type = string } # from secrets module
variable "db_secret_arn" { type = string }
variable "redis_secret_arn" { type = string }
variable "redis_endpoint" { type = string }
variable "redis_port" {
  type    = number
  default = 6379
}
variable "cpu" {
  type    = number
  default = 512
}
variable "memory" {
  type    = number
  default = 1024
}
variable "api_desired" {
  type    = number
  default = 2
}
variable "worker_desired" {
  type    = number
  default = 1
}
variable "min_capacity" {
  type    = number
  default = 2
}
variable "max_capacity" {
  type    = number
  default = 6
}
variable "tags" {
  type    = map(string)
  default = {}
}

# ── Cluster ─────────────────────────────────────────────────────────────────
resource "aws_ecs_cluster" "this" {
  name = "${var.name}-cluster"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  tags = merge(var.tags, { Name = "${var.name}-cluster" })
}

resource "aws_ecs_cluster_capacity_providers" "this" {
  cluster_name       = aws_ecs_cluster.this.name
  capacity_providers = ["FARGATE"]
}

# IAM roles — least privilege.
data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "task" {
  name               = "${var.name}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
  tags               = var.tags
}

resource "aws_iam_policy" "secrets" {
  name = "${var.name}-secrets-read"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = [var.app_secret_arn, var.db_secret_arn, var.redis_secret_arn]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "secrets" {
  role       = aws_iam_role.task.name
  policy_arn = aws_iam_policy.secrets.arn
}

resource "aws_iam_role_policy_attachment" "exec" {
  role       = aws_iam_role.task.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy_attachment" "logs" {
  role       = aws_iam_role.task.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
}

# ── Log groups ──────────────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${var.name}/api"
  retention_in_days = 30
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "worker" {
  name              = "/ecs/${var.name}/worker"
  retention_in_days = 30
  tags              = var.tags
}

# ── Task definitions ────────────────────────────────────────────────────────
locals {
  common_secrets = [
    { name = "POKE_VAULT_DATABASE_URL", valueFrom = var.db_secret_arn },
    { name = "POKE_VAULT_REDIS_URL", valueFrom = var.redis_secret_arn },
    { name = "POKE_VAULT_APP_SECRETS", valueFrom = var.app_secret_arn },
  ]
}

data "aws_region" "current" {}

resource "aws_ecs_task_definition" "api" {
  family                   = "${var.name}-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.task.arn
  task_role_arn            = aws_iam_role.task.arn
  container_definitions = jsonencode([{
    name         = "api"
    image        = var.image_api
    portMappings = [{ containerPort = var.api_port, protocol = "tcp" }]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "POKE_VAULT_WEB_ORIGIN", value = var.web_origin },
      { name = "POKE_VAULT_SECRETS_PROVIDER", value = "aws" },
      { name = "POKE_VAULT_AWS_REGION", value = data.aws_region.current.name },
    ]
    secrets = local.common_secrets
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.api.name
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "api"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "node -e \"fetch('http://localhost:${var.api_port}/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""]
      interval    = 10
      timeout     = 5
      retries     = 5
      startPeriod = 30
    }
  }])
  tags = merge(var.tags, { Name = "${var.name}-api-task" })
}

resource "aws_ecs_task_definition" "worker" {
  family                   = "${var.name}-worker"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.task.arn
  task_role_arn            = aws_iam_role.task.arn
  container_definitions = jsonencode([{
    name  = "worker"
    image = var.image_worker
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "POKE_VAULT_SECRETS_PROVIDER", value = "aws" },
      { name = "POKE_VAULT_AWS_REGION", value = data.aws_region.current.name },
    ]
    secrets = local.common_secrets
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.worker.name
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "worker"
      }
    }
  }])
  tags = merge(var.tags, { Name = "${var.name}-worker-task" })
}

# ── Services (API behind ALB, worker headless) ──────────────────────────────
resource "aws_ecs_service" "api" {
  name            = "${var.name}-api"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.api_desired
  launch_type     = "FARGATE"
  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [var.app_sg_id]
    assign_public_ip = false # private networking
  }
  load_balancer {
    target_group_arn = var.alb_target_group_arn
    container_name   = "api"
    container_port   = var.api_port
  }
  # Rolling deploy safety (§80): minimum 100% healthy, max 200% during rollout —
  # a new task only receives traffic after the ALB /health/ready check passes.
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  health_check_grace_period_seconds  = 60
  wait_for_steady_state              = true
  depends_on                         = [aws_iam_role_policy_attachment.logs]
  tags                               = merge(var.tags, { Name = "${var.name}-api-service" })
}

resource "aws_ecs_service" "worker" {
  name            = "${var.name}-worker"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = var.worker_desired
  launch_type     = "FARGATE"
  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [var.app_sg_id]
    assign_public_ip = false
  }
  # Rolling deploy safety (§80) for the headless worker.
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  health_check_grace_period_seconds  = 60
  wait_for_steady_state              = true
  depends_on                         = [aws_iam_role_policy_attachment.logs]
  tags                               = merge(var.tags, { Name = "${var.name}-worker-service" })
}

# ── Autoscaling (api) ───────────────────────────────────────────────────────
resource "aws_appautoscaling_target" "api" {
  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = var.min_capacity
  max_capacity       = var.max_capacity
}

resource "aws_appautoscaling_policy" "api_cpu" {
  name               = "${var.name}-api-cpu"
  service_namespace  = "ecs"
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = "ecs:service:DesiredCount"
  policy_type        = "TargetTrackingScaling"
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 60
    scale_in_cooldown  = 120
    scale_out_cooldown = 60
  }
}

output "cluster_name" { value = aws_ecs_cluster.this.name }
output "api_service" { value = aws_ecs_service.api.name }
output "worker_service" { value = aws_ecs_service.worker.name }
output "task_role_arn" { value = aws_iam_role.task.arn }
