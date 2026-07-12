variable "app_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "nosql_lambda_name" {
  type = string
}

variable "booking_processor_name" {
  type = string
}

variable "booking_queue_name" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}