terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "globaltix-tfstate"
    key    = "prod/secondary-us-east-2/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.secondary_region
}

data "terraform_remote_state" "primary" {
  backend = "s3"
  config = {
    bucket = "globaltix-tfstate"
    key    = "prod/primary-us-east-1/terraform.tfstate"
    region = "us-east-1"
  }
}

locals {
  tags = {
    App         = var.app_name
    Environment = var.environment
    Region      = var.secondary_region
    ManagedBy   = "terraform"
  }
}

module "queue" {
  source      = "../../modules/queue"
  app_name    = var.app_name
  environment = var.environment
  tags        = local.tags
}

module "iam" {
  source      = "../../modules/iam"
  app_name    = var.app_name
  environment = var.environment
  booking_queue_arn   = module.queue.booking_queue_arn
  dynamodb_table_arns = [
    data.terraform_remote_state.primary.outputs.events_table_name,
    data.terraform_remote_state.primary.outputs.tickets_table_name,
    data.terraform_remote_state.primary.outputs.bookings_table_name,
  ]
  tags = local.tags
}

module "api" {
  source                     = "../../modules/api"
  app_name                   = var.app_name
  environment                = var.environment
  lambda_role_arn            = module.iam.nosql_lambda_role_arn
  booking_processor_role_arn = module.iam.booking_processor_role_arn
  booking_queue_arn          = module.queue.booking_queue_arn
  booking_queue_url          = module.queue.booking_queue_url
  events_table_name          = data.terraform_remote_state.primary.outputs.events_table_name
  tickets_table_name         = data.terraform_remote_state.primary.outputs.tickets_table_name
  bookings_table_name        = data.terraform_remote_state.primary.outputs.bookings_table_name
  booking_status_table_name  = "${var.app_name}-${var.environment}-booking-status"
  tags                       = local.tags
}