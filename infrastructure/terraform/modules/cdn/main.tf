# CloudFront CDN module (§72): edge cache in front of ALB + static assets.
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "name" { type = string }
variable "domain_name" { type = string }   # e.g. api.pokemon-vault.dev
variable "origin_domain" { type = string } # ALB DNS name
variable "origin_id" { type = string }
variable "acm_certificate_arn" { type = string } # must be us-east-1 (CloudFront)
variable "waf_arn" { type = string }             # CloudFront-scope WAF (optional)
variable "tags" {
  type    = map(string)
  default = {}
}

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.name} CDN"
  default_root_object = ""
  aliases             = [var.domain_name]
  price_class         = "PriceClass_100"

  origin {
    domain_name = var.origin_domain
    origin_id   = var.origin_id
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = var.origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    compress               = true
    forwarded_values {
      query_string = true
      headers      = ["Origin", "Authorization", "Cookie", "X-Request-Id"]
      cookies {
        forward = "all"
      }
    }
    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 60
    # Do not cache the API — pass through; assets benefit from caching.
    cache_policy_id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
  }

  # WAF association at the edge (CloudFront-scope ACL).
  web_acl_id = var.waf_arn != "" ? var.waf_arn : null

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = merge(var.tags, { Name = "${var.name}-cdn" })
}

output "distribution_id" { value = aws_cloudfront_distribution.this.id }
output "distribution_domain" { value = aws_cloudfront_distribution.this.domain_name }
output "distribution_zone_id" { value = aws_cloudfront_distribution.this.hosted_zone_id }
