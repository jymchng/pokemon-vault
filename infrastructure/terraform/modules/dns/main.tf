# Route53 DNS module (§72): hosted zone + records → CloudFront/ALB.
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "name" { type = string }
variable "zone_name" { type = string }  # e.g. pokemon-vault.dev
variable "api_record" { type = string } # api.pokemon-vault.dev
variable "web_record" { type = string } # www / apex
variable "cloudfront_domain" { type = string }
variable "cloudfront_zone_id" { type = string }
variable "tags" {
  type    = map(string)
  default = {}
}

resource "aws_route53_zone" "this" {
  name = var.zone_name
  tags = merge(var.tags, { Name = "${var.name}-zone" })
}

# API → CloudFront (CDN → WAF → ALB).
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.this.zone_id
  name    = var.api_record
  type    = "A"
  alias {
    name                   = var.cloudfront_domain
    zone_id                = var.cloudfront_zone_id
    evaluate_target_health = false
  }
}

# Web apex → CloudFront.
resource "aws_route53_record" "web" {
  zone_id = aws_route53_zone.this.zone_id
  name    = var.web_record
  type    = "A"
  alias {
    name                   = var.cloudfront_domain
    zone_id                = var.cloudfront_zone_id
    evaluate_target_health = false
  }
}

output "zone_id" { value = aws_route53_zone.this.zone_id }
output "nameservers" { value = aws_route53_zone.this.name_servers }
