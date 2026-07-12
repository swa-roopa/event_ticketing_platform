resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${var.app_name}/${var.environment}/database/credentials"
  description = "Aurora MySQL credentials for ${var.app_name}"

  replica {
    region = var.replica_region
  }

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username          = var.db_username
    password          = var.db_password
    primary_endpoint  = var.primary_writer_endpoint
    secondary_endpoint = var.secondary_writer_endpoint
    port              = 3306
    database          = var.app_name
  })
}