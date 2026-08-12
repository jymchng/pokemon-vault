variable "region" {
  type    = string
  default = "eu-central-1"
}
variable "azs" {
  type    = list(string)
  default = ["eu-central-1a"]
}
variable "vpc_cidr" {
  type    = string
  default = "10.42.0.0/16"
}
variable "public_subnets" {
  type    = list(string)
  default = ["10.42.1.0/24"]
}
variable "private_subnets" {
  type    = list(string)
  default = ["10.42.10.0/24"]
}
variable "zone_name" {
  type    = string
  default = "pokemon-vault.dev"
}
variable "api_domain" {
  type    = string
  default = "dev-api.pokemon-vault.dev"
}
variable "web_domain" {
  type    = string
  default = "dev.pokemon-vault.dev"
}
variable "web_origin" {
  type    = string
  default = "https://dev.pokemon-vault.dev"
}
variable "db_name" {
  type    = string
  default = "pokemon_vault"
}
variable "db_user" {
  type    = string
  default = "pv_app"
}
variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}
variable "redis_node_type" {
  type    = string
  default = "cache.t4g.micro"
}
variable "media_bucket" { type = string }
variable "backup_bucket" { type = string }
variable "image_api" { type = string }
variable "image_worker" { type = string }
variable "api_desired" {
  type    = number
  default = 1
}
variable "worker_desired" {
  type    = number
  default = 1
}
variable "min_capacity" {
  type    = number
  default = 1
}
variable "max_capacity" {
  type    = number
  default = 2
}
variable "alerts_email" { type = string }
variable "app_secrets" {
  type      = map(string)
  sensitive = true
  default   = {}
}
variable "tags" {
  type    = map(string)
  default = { project = "pokemon-vault", env = "dev" }
}
