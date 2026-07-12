output "nosql_lambda_role_arn" {
  value = aws_iam_role.nosql_lambda.arn
}

output "booking_processor_role_arn" {
  value = aws_iam_role.booking_processor.arn
}