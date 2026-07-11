# ============== SECRETS MANAGER ==============

# Generate random password
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Primary Secret (us-east-1)
resource "aws_secretsmanager_secret" "db_credentials" {
  provider                = aws.primary
  name                    = "${local.app_name}/database/credentials"
  description             = "GlobalTix Aurora database credentials"
  recovery_window_in_days = 7

  # Replicate to secondary region
  replica {
    region = "us-east-2"
  }

  tags = merge(local.tags, {
    Name = "${local.app_name}-db-credentials"
  })
}

# Store the credentials
resource "aws_secretsmanager_secret_version" "db_credentials" {
  provider  = aws.primary
  secret_id = aws_secretsmanager_secret.db_credentials.id

  secret_string = jsonencode({
    username                  = "globaltix_admin"
    password                  = random_password.db_password.result
    engine                    = "aurora-mysql"
    host                      = aws_rds_cluster.primary.endpoint
    port                      = 3306
    dbname                    = "globaltix"
    primary_writer_endpoint   = aws_rds_cluster.primary.endpoint
    primary_reader_endpoint   = aws_rds_cluster.primary.reader_endpoint
    secondary_writer_endpoint = aws_rds_cluster.secondary.endpoint
    secondary_reader_endpoint = aws_rds_cluster.secondary.reader_endpoint
  })

  depends_on = [
    aws_rds_cluster.primary,
    aws_rds_cluster.secondary
  ]
}

# IAM Policy for application to read secrets (primary region)
resource "aws_iam_policy" "secrets_read_primary" {
  provider    = aws.primary
  name        = "${local.app_name}-secrets-read"
  description = "Allow reading GlobalTix database secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.db_credentials.arn,
          "arn:aws:secretsmanager:us-east-2:*:secret:${local.app_name}/database/credentials-*"
        ]
      }
    ]
  })

  tags = local.tags
}

# Same policy in secondary region
resource "aws_iam_policy" "secrets_read_secondary" {
  provider    = aws.secondary
  name        = "${local.app_name}-secrets-read"
  description = "Allow reading GlobalTix database secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.db_credentials.arn,
          "arn:aws:secretsmanager:us-east-2:*:secret:${local.app_name}/database/credentials-*"
        ]
      }
    ]
  })

  tags = local.tags
}

# ============== OUTPUTS ==============
output "secret_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "secret_name" {
  description = "Name of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.name
}

output "secrets_policy_arn_primary" {
  description = "ARN of IAM policy for reading secrets (primary)"
  value       = aws_iam_policy.secrets_read_primary.arn
}

output "secrets_policy_arn_secondary" {
  description = "ARN of IAM policy for reading secrets (secondary)"
  value       = aws_iam_policy.secrets_read_secondary.arn
}
