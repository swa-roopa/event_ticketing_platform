output "primary_db_subnet_group_name" {
  value = aws_db_subnet_group.primary.name
}

output "primary_db_security_group_id" {
  value = aws_security_group.primary_db.id
}

output "secondary_db_subnet_group_name" {
  value = aws_db_subnet_group.secondary.name
}

output "secondary_db_security_group_id" {
  value = aws_security_group.secondary_db.id
}

output "primary_vpc_id" {
  value = aws_vpc.primary.id
}

output "secondary_vpc_id" {
  value = aws_vpc.secondary.id
}