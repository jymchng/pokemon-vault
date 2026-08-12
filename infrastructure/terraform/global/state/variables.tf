variable "region" {
  type    = string
  default = "eu-central-1"
}

variable "state_bucket" {
  type        = string
  description = "Unique S3 bucket name for Terraform remote state"
}

variable "lock_table" {
  type        = string
  description = "DynamoDB table name for state locking"
  default     = "terraform-state-lock"
}

variable "tags" {
  type    = map(string)
  default = { project = "pokemon-vault", managed_by = "terraform" }
}
