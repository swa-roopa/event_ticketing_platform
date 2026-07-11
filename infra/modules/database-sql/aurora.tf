# ============== AURORA GLOBAL DATABASE ==============
resource "aws_rds_global_cluster" "main" {
  global_cluster_identifier = "${local.app_name}-global"
  engine                    = "aurora-mysql"
  engine_version            = "8.0.mysql_aurora.3.04.0"
  database_name             = "globaltix"
  storage_encrypted         = true
}

# ============== PRIMARY CLUSTER (US-EAST-1) ==============
resource "aws_rds_cluster" "primary" {
  provider                  = aws.primary
  cluster_identifier        = "${local.app_name}-primary"
  engine                    = aws_rds_global_cluster.main.engine
  engine_version            = aws_rds_global_cluster.main.engine_version
  global_cluster_identifier = aws_rds_global_cluster.main.id
  database_name             = "globaltix"
  master_username                     = "globaltix_admin"
  master_password                     = random_password.db_password.result
  manage_master_user_password         = false

  db_subnet_group_name   = aws_db_subnet_group.primary.name
  vpc_security_group_ids = [aws_security_group.primary_db.id]

  backup_retention_period = 7
  preferred_backup_window = "03:00-04:00"
  skip_final_snapshot     = true

  enabled_cloudwatch_logs_exports = ["error", "slowquery"]

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 32
  }

  tags = merge(local.tags, {
    Name   = "${local.app_name}-primary"
    Region = "us-east-1"
    Role   = "primary"
  })
}

resource "aws_rds_cluster_instance" "primary_instance" {
  provider                     = aws.primary
  identifier                   = "${local.app_name}-primary-instance"
  cluster_identifier           = aws_rds_cluster.primary.id
  instance_class               = "db.serverless"
  engine                       = aws_rds_cluster.primary.engine
  engine_version               = aws_rds_cluster.primary.engine_version
  publicly_accessible          = false
  performance_insights_enabled = true

  tags = merge(local.tags, {
    Name   = "${local.app_name}-primary-instance"
    Region = "us-east-1"
  })
}

# ============== SECONDARY CLUSTER (US-EAST-2) WITH WRITE FORWARDING ==============
resource "aws_rds_cluster" "secondary" {
  provider                  = aws.secondary
  cluster_identifier        = "${local.app_name}-secondary"
  engine                    = aws_rds_global_cluster.main.engine
  engine_version            = aws_rds_global_cluster.main.engine_version
  global_cluster_identifier = aws_rds_global_cluster.main.id

  db_subnet_group_name   = aws_db_subnet_group.secondary.name
  vpc_security_group_ids = [aws_security_group.secondary_db.id]

  backup_retention_period = 7
  skip_final_snapshot     = true

  # KEY SETTING: Enable write forwarding for Active-Active
  enable_global_write_forwarding = true

  enabled_cloudwatch_logs_exports = ["error", "slowquery"]

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 32
  }

  tags = merge(local.tags, {
    Name   = "${local.app_name}-secondary"
    Region = "us-east-2"
    Role   = "secondary"
  })

  depends_on = [aws_rds_cluster_instance.primary_instance]
}

resource "aws_rds_cluster_instance" "secondary_instance" {
  provider                     = aws.secondary
  identifier                   = "${local.app_name}-secondary-instance"
  cluster_identifier           = aws_rds_cluster.secondary.id
  instance_class               = "db.serverless"
  engine                       = aws_rds_cluster.secondary.engine
  engine_version               = aws_rds_cluster.secondary.engine_version
  publicly_accessible          = false
  performance_insights_enabled = true

  tags = merge(local.tags, {
    Name   = "${local.app_name}-secondary-instance"
    Region = "us-east-2"
  })
}

# ============== PARAMETER GROUPS ==============
resource "aws_rds_cluster_parameter_group" "primary" {
  provider    = aws.primary
  name        = "${local.app_name}-params-primary"
  family      = "aurora-mysql8.0"
  description = "GlobalTix Aurora MySQL parameter group for Primary region"

  parameter {
    name  = "aurora_parallel_query"
    value = "ON"
  }

  parameter {
    name  = "slow_query_log"
    value = "1"
  }

  parameter {
    name  = "long_query_time"
    value = "1"
  }

  tags = local.tags
}

resource "aws_rds_cluster_parameter_group" "secondary" {
  provider    = aws.secondary
  name        = "${local.app_name}-params-secondary"
  family      = "aurora-mysql8.0"
  description = "GlobalTix Aurora MySQL parameter group for Secondary region"

  parameter {
    name  = "aurora_parallel_query"
    value = "ON"
  }

  parameter {
    name  = "slow_query_log"
    value = "1"
  }

  parameter {
    name  = "long_query_time"
    value = "1"
  }

  tags = local.tags
}
