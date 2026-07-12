output "primary_writer_endpoint" {
  value = aws_rds_cluster.primary.endpoint
}

output "secondary_writer_endpoint" {
  value = aws_rds_cluster.secondary.endpoint
}

output "primary_reader_endpoint" {
  value = aws_rds_cluster.primary.reader_endpoint
}

output "secondary_reader_endpoint" {
  value = aws_rds_cluster.secondary.reader_endpoint
}

output "global_cluster_id" {
  value = aws_rds_global_cluster.main.id
}