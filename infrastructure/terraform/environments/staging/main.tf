# Pokémon Vault — staging environment (§73). Same topology as production but
# smaller instances and a staging domain; mirrors production for pre-release.
terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket         = "pokemon-vault-tfstate"
    key            = "pokemon-vault/staging/terraform.tfstate"
    region         = "eu-central-1"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.region
  default_tags { tags = var.tags }
}

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

module "network" {
  source          = "../../modules/network"
  name            = "pv-staging"
  vpc_cidr        = var.vpc_cidr
  azs             = var.azs
  public_subnets  = var.public_subnets
  private_subnets = var.private_subnets
  tags            = var.tags
}

module "secrets" {
  source         = "../../modules/secrets"
  name           = "staging"
  app_secrets    = var.app_secrets
  redis_endpoint = module.redis.endpoint
  redis_port     = module.redis.port
  tags           = var.tags
}

module "database" {
  source           = "../../modules/database"
  name             = "pv-staging"
  vpc_id           = module.network.vpc_id
  subnet_ids       = module.network.private_subnet_ids
  sg_ingress_from  = module.network.app_sg_id
  instance_class   = var.db_instance_class
  db_name          = var.db_name
  db_user          = var.db_user
  backup_retention = 14
  multi_az         = false
  tags             = var.tags
}

module "redis" {
  source          = "../../modules/redis"
  name            = "pv-staging"
  vpc_id          = module.network.vpc_id
  subnet_ids      = module.network.private_subnet_ids
  sg_ingress_from = module.network.app_sg_id
  node_type       = var.redis_node_type
  tags            = var.tags
}

module "storage" {
  source        = "../../modules/storage"
  name          = "pv-staging"
  media_bucket  = var.media_bucket
  backup_bucket = var.backup_bucket
  tags          = var.tags
}

module "load_balancer" {
  source            = "../../modules/load-balancer"
  name              = "pv-staging"
  vpc_id            = module.network.vpc_id
  public_subnet_ids = module.network.public_subnet_ids
  alb_sg_id         = module.network.alb_sg_id
  certificate_arn   = data.aws_acm_certificate.api.arn
  tags              = var.tags
}

module "waf" {
  source     = "../../modules/waf"
  name       = "pv-staging"
  alb_arn    = module.load_balancer.alb_arn
  rate_limit = var.waf_rate_limit
  tags       = var.tags
}

module "compute" {
  source               = "../../modules/compute"
  name                 = "pv-staging"
  vpc_id               = module.network.vpc_id
  subnet_ids           = module.network.private_subnet_ids
  app_sg_id            = module.network.app_sg_id
  alb_target_group_arn = module.load_balancer.api_target_group_arn
  image_api            = var.image_api
  image_worker         = var.image_worker
  web_origin           = var.web_origin
  app_secret_arn       = module.secrets.app_secret_arn
  db_secret_arn        = module.database.db_secret_arn
  redis_secret_arn     = module.secrets.redis_secret_arn
  redis_endpoint       = module.redis.endpoint
  redis_port           = module.redis.port
  api_desired          = var.api_desired
  worker_desired       = var.worker_desired
  min_capacity         = var.min_capacity
  max_capacity         = var.max_capacity
  tags                 = var.tags
}

module "cdn" {
  source              = "../../modules/cdn"
  name                = "pv-staging"
  domain_name         = var.api_domain
  origin_domain       = module.load_balancer.alb_dns_name
  origin_id           = "pv-staging-alb"
  acm_certificate_arn = data.aws_acm_certificate.cdn.arn
  waf_arn             = ""
  tags                = var.tags
}

module "dns" {
  source             = "../../modules/dns"
  name               = "pv-staging"
  zone_name          = var.zone_name
  api_record         = var.api_domain
  web_record         = var.web_domain
  cloudfront_domain  = module.cdn.distribution_domain
  cloudfront_zone_id = module.cdn.distribution_zone_id
  tags               = var.tags
}

module "monitoring" {
  source             = "../../modules/monitoring"
  name               = "pv-staging"
  cluster_name       = module.compute.cluster_name
  api_service        = module.compute.api_service
  worker_service     = module.compute.worker_service
  db_instance_id     = module.database.db_instance_id
  sns_email          = var.alerts_email
  api_alb_arn_suffix = module.load_balancer.alb_arn_suffix
  tags               = var.tags
}
