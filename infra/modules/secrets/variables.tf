variable "app_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "db_username" {
  type    = string
  default = "admin"
}

variable "primary_writer_endpoint" {
  type = string
}

variable "secondary_writer_endpoint" {
  type = string
}

variable "replica_region" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}