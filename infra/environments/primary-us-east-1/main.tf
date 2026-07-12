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
    key    = "prod/primary-us-east-1/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  alias  = "primary"
  region = var.primary_region
}

provider "aws" {
  alias  = "secondary"
  region = var.secondary_region
}

locals {
  tags = {
    App         = var.app_name
    Environment = var.environment
    Region      = var.primary_region
    ManagedBy   = "terraform"
  }
}

module "networking" {
  source           = "../../modules/networking"
  app_name         = var.app_name
  environment      = var.environment
  primary_region   = var.primary_region
  secondary_region = var.secondary_region
  tags             = local.tags

  providers = {
    aws.primary   = aws.primary
    aws.secondary = aws.secondary
  }
}

module "database_sql" {
  source                         = "../../modules/database-sql"
  app_name                       = var.app_name
  environment                    = var.environment
  db_password                    = var.db_password
  primary_db_subnet_group_name   = module.networking.primary_db_subnet_group_name
  primary_db_security_group_id   = module.networking.primary_db_security_group_id
  secondary_db_subnet_group_name = module.networking.secondary_db_subnet_group_name
  secondary_db_security_group_id = module.networking.secondary_db_security_group_id
  tags                           = local.tags

  providers = {
    aws.primary   = aws.primary
    aws.secondary = aws.secondary
  }
}

module "database_nosql" {
  source         = "../../modules/database-nosql"
  app_name       = var.app_name
  environment    = var.environment
  replica_region = var.secondary_region
  tags           = local.tags
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
  booking_queue_arn = module.queue.booking_queue_arn
  dynamodb_table_arns = [
    module.database_nosql.events_table_arn,
    module.database_nosql.tickets_table_arn,
    module.database_nosql.bookings_table_arn,
    module.database_nosql.booking_status_table_arn,
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
  events_table_name          = module.database_nosql.events_table_name
  tickets_table_name         = module.database_nosql.tickets_table_name
  bookings_table_name        = module.database_nosql.bookings_table_name
  booking_status_table_name  = module.database_nosql.booking_status_table_name
  tags                       = local.tags
}

module "monitoring" {
  source                 = "../../modules/monitoring"
  app_name               = var.app_name
  environment            = var.environment
  nosql_lambda_name      = "${var.app_name}-${var.environment}-nosql-api"
  booking_processor_name = "${var.app_name}-${var.environment}-booking-processor"
  booking_queue_name     = "${var.app_name}-${var.environment}-bookings.fifo"
  tags                   = local.tags
}

module "secrets" {
  source                    = "../../modules/secrets"
  app_name                  = var.app_name
  environment               = var.environment
  db_password               = var.db_password
  db_username               = "${var.app_name}_admin"
  primary_writer_endpoint   = module.database_sql.primary_writer_endpoint
  secondary_writer_endpoint = module.database_sql.secondary_writer_endpoint
  replica_region            = var.secondary_region
  tags                      = local.tags
}