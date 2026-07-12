resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.app_name}-${var.environment}-comparison"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 2
        properties = {
          markdown = "## Active-Active Multi-Region: SQL vs NoSQL\nComparing Aurora Global DB write forwarding latency vs DynamoDB Global Tables local writes."
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 2
        width  = 12
        height = 6
        properties = {
          title  = "NoSQL Lambda Duration (write latency)"
          period = 60
          stat   = "p99"
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", var.nosql_lambda_name]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 2
        width  = 12
        height = 6
        properties = {
          title  = "Booking Processor Duration (async path)"
          period = 60
          stat   = "p99"
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", var.booking_processor_name]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 8
        width  = 12
        height = 6
        properties = {
          title  = "SQS Queue Depth (async bookings pending)"
          period = 60
          stat   = "Maximum"
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", var.booking_queue_name]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 8
        width  = 12
        height = 6
        properties = {
          title  = "Lambda Errors"
          period = 60
          stat   = "Sum"
          metrics = [
            ["AWS/Lambda", "Errors", "FunctionName", var.nosql_lambda_name],
            ["AWS/Lambda", "Errors", "FunctionName", var.booking_processor_name]
          ]
          view = "timeSeries"
        }
      }
    ]
  })
}

resource "aws_cloudwatch_metric_alarm" "booking_processor_errors" {
  alarm_name          = "${var.app_name}-${var.environment}-booking-processor-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Booking processor Lambda errors exceeded threshold"

  dimensions = {
    FunctionName = var.booking_processor_name
  }

  tags = var.tags
}