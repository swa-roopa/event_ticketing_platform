variable "app_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "replica_region" {
  description = "Secondary region for DynamoDB Global Table Replica"
  type = string
}

variable "tags" {
  type = map(string)
  default = {}
}