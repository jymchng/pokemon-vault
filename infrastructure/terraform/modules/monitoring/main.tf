# Monitoring module (§69, §72): SNS alerts + CloudWatch alarms.
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "name" { type = string }
variable "cluster_name" { type = string }
variable "api_service" { type = string }
variable "worker_service" { type = string }
variable "db_instance_id" { type = string }
variable "sns_email" { type = string }
variable "api_alb_arn_suffix" {
  type    = string
  default = "" # e.g. app/alb-name/abc123
}
variable "tags" {
  type    = map(string)
  default = {}
}

resource "aws_sns_topic" "alerts" {
  name = "${var.name}-alerts"
  tags = merge(var.tags, { Name = "${var.name}-alerts" })
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.sns_email
}

# API 5xx spike (ALB metric, dimension supplied by caller when known).
resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  count               = var.api_alb_arn_suffix != "" ? 1 : 0
  alarm_name          = "${var.name}-api-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  period              = "60"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "API target 5xx responses above 10/min"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    LoadBalancer = var.api_alb_arn_suffix
  }
  tags = var.tags
}

# DB free storage + CPU (independent of ALB).
resource "aws_cloudwatch_metric_alarm" "db_free_storage" {
  alarm_name          = "${var.name}-db-free-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  period              = "300"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  statistic           = "Average"
  threshold           = "1073741824" # 1 GiB
  alarm_description   = "RDS free storage below 1 GiB"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    DBInstanceIdentifier = var.db_instance_id
  }
  tags = var.tags
}

# ECS service CPU (worker saturation).
resource "aws_cloudwatch_metric_alarm" "worker_cpu" {
  alarm_name          = "${var.name}-worker-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  period              = "300"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "Worker CPU above 85% for 15 min"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.worker_service
  }
  tags = var.tags
}

# Queue depth alarm (BullMQ → CloudWatch via worker metric; placeholder metric
# is exported by the app's Prometheus exporter, see docs/observability).
resource "aws_cloudwatch_metric_alarm" "queue_depth" {
  alarm_name          = "${var.name}-queue-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  period              = "300"
  metric_name         = "queue_depth_max"
  namespace           = "PokemonVault/Queues"
  statistic           = "Maximum"
  threshold           = "500"
  alarm_description   = "A BullMQ queue waiting depth exceeded 500"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    Cluster = var.cluster_name
  }
  tags = var.tags
}

output "alerts_topic_arn" { value = aws_sns_topic.alerts.arn }
