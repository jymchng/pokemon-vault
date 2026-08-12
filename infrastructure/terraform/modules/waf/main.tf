# WAF module (§72): managed rules + rate limiting, associated with ALB.
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "name" { type = string }
variable "alb_arn" { type = string }
variable "rate_limit" {
  type    = number
  default = 2000 # per 5 min per IP
}
variable "tags" {
  type    = map(string)
  default = {}
}

resource "aws_wafv2_web_acl" "this" {
  name        = "${var.name}-waf"
  description = "Pokémon Vault WAF: managed rules + rate limiting"
  scope       = "REGIONAL"
  default_action {
    allow {}
  }

  # Core rule set (SQLi/XSS/etc.)
  rule {
    name     = "aws-managed-core"
    priority = 1
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name}-waf-core"
      sampled_requests_enabled   = true
    }
  }

  # Rate-based rule: block IPs exceeding the limit per 5 minutes.
  rule {
    name     = "rate-limit"
    priority = 2
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit              = var.rate_limit
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name}-waf-rate"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.name}-waf"
    sampled_requests_enabled   = true
  }
  tags = merge(var.tags, { Name = "${var.name}-waf" })
}

resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = var.alb_arn
  web_acl_arn  = aws_wafv2_web_acl.this.arn
}

output "web_acl_arn" { value = aws_wafv2_web_acl.this.arn }
