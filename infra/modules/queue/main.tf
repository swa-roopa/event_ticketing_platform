resource "aws_sqs_queue" "booking_dlq" {
  name                      = "${var.app_name}-${var.environment}-booking-dlq.fifo"
  fifo_queue                = true
  content_based_deduplication = true
  message_retention_seconds = 1209600

  tags = merge(var.tags, { Name = "${var.app_name}-${var.environment}-booking-dlq" })
}

resource "aws_sqs_queue" "booking_queue" {
  name                        = "${var.app_name}-${var.environment}-bookings.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  visibility_timeout_seconds  = 60
  message_retention_seconds   = 86400

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.booking_dlq.arn
    maxReceiveCount     = 3
  })

  tags = merge(var.tags, { Name = "${var.app_name}-${var.environment}-bookings" })
}