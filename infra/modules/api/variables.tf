variable "app_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "lambda_role_arn" {
  type = string
}

variable "booking_processor_role_arn" {
  type = string
}

variable "booking_queue_arn" {
  type = string
}

variable "events_table_name" {
  type = string
}

variable "tickets_table_name" {
  type = string
}

variable "bookings_table_name" {
  type = string
}

variable "booking_status_table_name" {
  type = string
}

variable "booking_queue_url" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}