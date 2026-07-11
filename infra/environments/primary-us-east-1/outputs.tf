# ============== DATABASE OUTPUTS ==============
output "primary_endpoint" {
  description = "Primary cluster endpoint (read/write) - us-east-1"
  value       = aws_rds_cluster.primary.endpoint
}

output "primary_reader_endpoint" {
  description = "Primary reader endpoint - us-east-1"
  value       = aws_rds_cluster.primary.reader_endpoint
}

output "secondary_endpoint" {
  description = "Secondary cluster endpoint (read + write forwarding) - us-east-2"
  value       = aws_rds_cluster.secondary.endpoint
}

output "secondary_reader_endpoint" {
  description = "Secondary reader endpoint - us-east-2"
  value       = aws_rds_cluster.secondary.reader_endpoint
}

output "database_name" {
  description = "Database name"
  value       = aws_rds_global_cluster.main.database_name
}

output "database_username" {
  description = "Database master username"
  value       = aws_rds_cluster.primary.master_username
}

# ============== NETWORKING OUTPUTS ==============
output "primary_vpc_id" {
  description = "Primary VPC ID (us-east-1)"
  value       = aws_vpc.primary.id
}

output "secondary_vpc_id" {
  description = "Secondary VPC ID (us-east-2)"
  value       = aws_vpc.secondary.id
}

output "primary_app_security_group_id" {
  description = "Primary Application security group ID"
  value       = aws_security_group.primary_app.id
}

output "secondary_app_security_group_id" {
  description = "Secondary Application security group ID"
  value       = aws_security_group.secondary_app.id
}

output "primary_public_subnet_ids" {
  description = "Primary Public subnet IDs"
  value       = [aws_subnet.primary_public_a.id, aws_subnet.primary_public_b.id]
}

output "secondary_public_subnet_ids" {
  description = "Secondary Public subnet IDs"
  value       = [aws_subnet.secondary_public_a.id, aws_subnet.secondary_public_b.id]
}

# ============== CONNECTION INFO ==============
output "connection_info" {
  description = "Database connection information"
  value = {
    primary = {
      region   = "us-east-1"
      host     = aws_rds_cluster.primary.endpoint
      port     = 3306
      database = "globaltix"
      role     = "primary (read/write)"
    }
    secondary = {
      region   = "us-east-2"
      host     = aws_rds_cluster.secondary.endpoint
      port     = 3306
      database = "globaltix"
      role     = "secondary (read + write forwarding)"
    }
    credentials = {
      note        = "Credentials stored in AWS Secrets Manager"
      secret_name = "globaltix/database/credentials"
      regions     = ["us-east-1", "us-east-2"]
    }
  }
}
