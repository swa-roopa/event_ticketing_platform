terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.primary, aws.secondary]
    }
  }
}

resource "aws_rds_global_cluster" "main" {
  global_cluster_identifier = "${var.app_name}-${var.environment}-global"
  engine                    = "aurora-mysql"
  engine_version            = "8.0.mysql_aurora.3.04.0"
  database_name             = var.app_name
  storage_encrypted         = true
}

resource "aws_rds_cluster" "primary" {
  provider                  = aws.primary
  cluster_identifier        = "${var.app_name}-${var.environment}-primary"
  engine                    = aws_rds_global_cluster.main.engine
  engine_version            = aws_rds_global_cluster.main.engine_version
  global_cluster_identifier = aws_rds_global_cluster.main.id
  database_name             = var.app_name
  master_username           = "${var.app_name}_admin"
  master_password           = var.db_password
  manage_master_user_password = false

  db_subnet_group_name   = var.primary_db_subnet_group_name
  vpc_security_group_ids = [var.primary_db_security_group_id]

  backup_retention_period = 7
  skip_final_snapshot     = true
  enabled_cloudwatch_logs_exports = ["error", "slowquery"]

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 32
  }

  tags = merge(var.tags, { Role = "primary" })
}

resource "aws_rds_cluster_instance" "primary" {
  provider           = aws.primary
  identifier         = "${var.app_name}-${var.environment}-primary-instance"
  cluster_identifier = aws_rds_cluster.primary.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.primary.engine
  engine_version     = aws_rds_cluster.primary.engine_version
  publicly_accessible          = false
  performance_insights_enabled = true
  tags = var.tags
}

resource "aws_rds_cluster" "secondary" {
  provider                  = aws.secondary
  cluster_identifier        = "${var.app_name}-${var.environment}-secondary"
  engine                    = aws_rds_global_cluster.main.engine
  engine_version            = aws_rds_global_cluster.main.engine_version
  global_cluster_identifier = aws_rds_global_cluster.main.id

  db_subnet_group_name   = var.secondary_db_subnet_group_name
  vpc_security_group_ids = [var.secondary_db_security_group_id]

  backup_retention_period = 7
  skip_final_snapshot     = true

  # This is the key setting that exposes write forwarding — shown as the "problem" in the blog
  enable_global_write_forwarding  = true
  enabled_cloudwatch_logs_exports = ["error", "slowquery"]

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 32
  }

  tags = merge(var.tags, { Role = "secondary" })
  depends_on = [aws_rds_cluster_instance.primary]
}

resource "aws_rds_cluster_instance" "secondary" {
  provider           = aws.secondary
  identifier         = "${var.app_name}-${var.environment}-secondary-instance"
  cluster_identifier = aws_rds_cluster.secondary.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.secondary.engine
  engine_version     = aws_rds_cluster.secondary.engine_version
  publicly_accessible          = false
  performance_insights_enabled = true
  tags = var.tags
}