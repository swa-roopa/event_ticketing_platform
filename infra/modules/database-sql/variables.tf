variable "app_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "primary_db_subnet_group_name" {
  type = string
}

variable "primary_db_security_group_id" {
  type = string
}

variable "secondary_db_subnet_group_name" {
  type = string
}

variable "secondary_db_security_group_id" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "tags" {
  type    = map(string)
  default = {}
}