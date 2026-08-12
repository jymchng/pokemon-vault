output "api_url" {
  value = "https://${var.api_domain}"
}

output "alb_dns" {
  value = module.load_balancer.alb_dns_name
}

output "cloudfront_domain" {
  value = module.cdn.distribution_domain
}

output "nameservers" {
  description = "Point the registrar's NS records here"
  value       = module.dns.nameservers
}

output "api_service" {
  value = module.compute.api_service
}

output "worker_service" {
  value = module.compute.worker_service
}

output "alerts_topic_arn" {
  value = module.monitoring.alerts_topic_arn
}
