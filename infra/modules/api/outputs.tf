output "nosql_api_url" {
  value = "${aws_api_gateway_stage.nosql.invoke_url}"
}

output "nosql_lambda_arn" {
  value = aws_lambda_function.nosql_api.arn
}

output "booking_processor_arn" {
  value = aws_lambda_function.booking_processor.arn
}