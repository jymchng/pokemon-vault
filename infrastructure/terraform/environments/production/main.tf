# Pokémon Vault — production environment (§72-76)
# Architecture: Route53 → CloudFront → WAF → ALB → ECS/Fargate (API + worker)
#              → RDS (Postgres) + ElastiCache (Redis) + S3 (media/backups)
# Workers are a SEPARATE ECS service from the API. No Kubernetes.
terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  # Remote state (§74): S3 + DynamoDB locking (bootstrap: global/state).
  backend "s3" {
    bucket         = "pokemon-vault-tfstate"
    key            = "pokemon-vault/production/terraform.tfstate"
    region         = "eu-central-1"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.region
  default_tags { tags = var.tags }
}

# ACM cert for the ALB must live in the region; CloudFront needs us-east-1.
data "aws_acm_certificate" "api" {
  domain   = var.api_domain
  statuses = ["ISSUED"]
}

data "aws_acm_certificate" "cdn" {
  provider = aws.us_east_1
  domain   = var.api_domain
  statuses = ["ISSUED"]
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  default_tags { tags = var.tags }
}

# ── Network ─────────────────────────────────────────────────────────────────
module "network" {
  source          = "../../modules/network"
  name            = "pv-prod"
  vpc_cidr        = var.vpc_cidr
  azs             = var.azs
  public_subnets  = var.public_subnets
  private_subnets = var.private_subnets
  tags            = var.tags
}

# ── Secrets ─────────────────────────────────────────────────────────────────
module "secrets" {
  source         = "../../modules/secrets"
  name           = "production"
  app_secrets    = var.app_secrets # JWT/STRIPE/SMTP/... via TF_VAR / secret store
  redis_endpoint = module.redis.endpoint
  redis_port     = module.redis.port
  tags           = var.tags
}

# ── Database + Redis ────────────────────────────────────────────────────────
module "database" {
  source           = "../../modules/database"
  name             = "pv-prod"
  vpc_id           = module.network.vpc_id
  subnet_ids       = module.network.private_subnet_ids
  sg_ingress_from  = module.network.app_sg_id
  instance_class   = var.db_instance_class
  db_name          = var.db_name
  db_user          = var.db_user
  backup_retention = 30
  multi_az         = true
  tags             = var.tags
}

module "redis" {
  source          = "../../modules/redis"
  name            = "pv-prod"
  vpc_id          = module.network.vpc_id
  subnet_ids      = module.network.private_subnet_ids
  sg_ingress_from = module.network.app_sg_id
  node_type       = var.redis_node_type
  tags            = var.tags
}

# ── Storage ─────────────────────────────────────────────────────────────────
module "storage" {
  source        = "../../modules/storage"
  name          = "pv-prod"
  media_bucket  = var.media_bucket
  backup_bucket = var.backup_bucket
  tags          = var.tags
}

# ── Load balancer ───────────────────────────────────────────────────────────
module "load_balancer" {
  source            = "../../modules/load-balancer"
  name              = "pv-prod"
  vpc_id            = module.network.vpc_id
  public_subnet_ids = module.network.public_subnet_ids
  alb_sg_id         = module.network.alb_sg_id
  api_port          = 3001
  certificate_arn   = data.aws_acm_certificate.api.arn
  tags              = var.tags
}

# ── WAF ─────────────────────────────────────────────────────────────────────
module "waf" {
  source     = "../../modules/waf"
  name       = "pv-prod"
  alb_arn    = module.load_balancer.alb_arn
  rate_limit = var.waf_rate_limit
  tags       = var.tags
}

# ── Compute (ECS/Fargate: API + separate worker) ────────────────────────────
module "compute" {
  source               = "../../modules/compute"
  name                 = "pv-prod"
  vpc_id               = module.network.vpc_id
  subnet_ids           = module.network.private_subnet_ids
  app_sg_id            = module.network.app_sg_id
  alb_target_group_arn = module.load_balancer.api_target_group_arn
  image_api            = var.image_api
  image_worker         = var.image_worker
  api_port             = 3001
  web_origin           = var.web_origin
  app_secret_arn       = module.secrets.app_secret_arn
  db_secret_arn        = module.database.db_secret_arn
  redis_secret_arn     = module.secrets.redis_secret_arn
  redis_endpoint       = module.redis.endpoint
  redis_port           = module.redis.port
  cpu                  = var.api_cpu
  memory               = var.api_memory
  api_desired          = var.api_desired
  worker_desired       = var.worker_desired
  min_capacity         = var.min_capacity
  max_capacity         = var.max_capacity
  tags                 = var.tags
}

# ── CDN (CloudFront) ────────────────────────────────────────────────────────
module "cdn" {
  source              = "../../modules/cdn"
  name                = "pv-prod"
  domain_name         = var.api_domain
  origin_domain       = module.load_balancer.alb_dns_name
  origin_id           = "pv-prod-alb"
  acm_certificate_arn = data.aws_acm_certificate.cdn.arn
  waf_arn             = ""
  tags                = var.tags
}

# ── DNS (Route53) ───────────────────────────────────────────────────────────
module "dns" {
  source             = "../../modules/dns"
  name               = "pv-prod"
  zone_name          = var.zone_name
  api_record         = var.api_domain
  web_record         = var.web_domain
  cloudfront_domain  = module.cdn.distribution_domain
  cloudfront_zone_id = module.cdn.distribution_zone_id
  tags               = var.tags
}

# ── Monitoring ──────────────────────────────────────────────────────────────
module "monitoring" {
  source             = "../../modules/monitoring"
  name               = "pv-prod"
  cluster_name       = module.compute.cluster_name
  api_service        = module.compute.api_service
  worker_service     = module.compute.worker_service
  db_instance_id     = module.database.db_instance_id == "" ? "pv-prod-db" : module.database.db_instance_id
  sns_email          = var.alerts_email
  api_alb_arn_suffix = module.load_balancer.alb_arn_suffix
  tags               = var.tags
}
