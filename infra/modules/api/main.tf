locals {
  nosql_handler_zip      = "${path.module}/nosql_handler.zip"
  booking_processor_zip  = "${path.module}/booking_processor.zip"
}

resource "aws_lambda_function" "nosql_api" {
  function_name = "${var.app_name}-${var.environment}-nosql-api"
  role          = var.lambda_role_arn
  handler       = "handler.handler"
  runtime       = "python3.12"
  filename      = local.nosql_handler_zip
  timeout       = 30
  memory_size   = 256

  environment {
    variables = {
      EVENTS_TABLE         = var.events_table_name
      TICKETS_TABLE        = var.tickets_table_name
      BOOKINGS_TABLE       = var.bookings_table_name
      BOOKING_STATUS_TABLE = var.booking_status_table_name
    }
  }

  tags = merge(var.tags, { Name = "${var.app_name}-${var.environment}-nosql-api" })
}

resource "aws_lambda_function" "booking_processor" {
  function_name = "${var.app_name}-${var.environment}-booking-processor"
  role          = var.booking_processor_role_arn
  handler       = "booking_processor.handler"
  runtime       = "python3.12"
  filename      = local.booking_processor_zip
  timeout       = 60
  memory_size   = 256

  environment {
    variables = {
      BOOKING_STATUS_TABLE = var.booking_status_table_name
    }
  }

  tags = merge(var.tags, { Name = "${var.app_name}-${var.environment}-booking-processor" })
}

resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = var.booking_queue_arn
  function_name    = aws_lambda_function.booking_processor.arn
  batch_size       = 1
  enabled          = true
}

resource "aws_api_gateway_rest_api" "nosql" {
  name = "${var.app_name}-${var.environment}-nosql"
  tags = var.tags
}

resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.nosql.id
  parent_id   = aws_api_gateway_rest_api.nosql.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.nosql.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "lambda" {
  rest_api_id             = aws_api_gateway_rest_api.nosql.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.proxy.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.nosql_api.invoke_arn
}

resource "aws_api_gateway_deployment" "nosql" {
  rest_api_id = aws_api_gateway_rest_api.nosql.id

  depends_on = [aws_api_gateway_integration.lambda]

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "nosql" {
  rest_api_id   = aws_api_gateway_rest_api.nosql.id
  deployment_id = aws_api_gateway_deployment.nosql.id
  stage_name    = var.environment
  tags          = var.tags
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.nosql_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.nosql.execution_arn}/*/*"
}