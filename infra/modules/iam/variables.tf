
variable "app_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "booking_queue_arn" {
  type = string
}

variable "dynamodb_table_arns" {
  type = list(string)
}

variable "tags" {
  type    = map(string)
  default = {}
}