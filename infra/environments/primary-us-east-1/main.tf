terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  alias  = "primary"
  region = "us-east-1"
}

provider "aws" {
  alias  = "secondary"
  region = "us-east-2"
}

variable "environment" {
  type    = string
  default = "prod"
}

locals {
  app_name = "globaltix"
  tags = {
    Application = "GlobalTix"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
