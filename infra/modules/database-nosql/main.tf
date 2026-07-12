resource "aws_dynamodb_table" "events" {
  name         = "${var.app_name}-${var.environment}-events"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "event_id"

  attribute {
    name = "event_id"
    type = "S"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  replica {
    region_name = var.replica_region
  }

  tags = merge(var.tags, { Name = "${var.app_name}-${var.environment}-events" })
}

resource "aws_dynamodb_table" "tickets" {
  name         = "${var.app_name}-${var.environment}-tickets"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "event_id"
  range_key    = "ticket_id"

  attribute {
    name = "event_id"
    type = "S"
  }

  attribute {
    name = "ticket_id"
    type = "S"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  replica {
    region_name = var.replica_region
  }

  tags = merge(var.tags, { Name = "${var.app_name}-${var.environment}-tickets" })
}

resource "aws_dynamodb_table" "bookings" {
  name         = "${var.app_name}-${var.environment}-bookings"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "booking_id"

  attribute {
    name = "booking_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "user_id-index"
    hash_key        = "user_id"
    projection_type = "ALL"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  replica {
    region_name = var.replica_region
  }

  tags = merge(var.tags, { Name = "${var.app_name}-${var.environment}-bookings" })
}

resource "aws_dynamodb_table" "booking_status" {
  name         = "${var.app_name}-${var.environment}-booking-status"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "booking_id"

  attribute {
    name = "booking_id"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  replica {
    region_name = var.replica_region
  }

  tags = merge(var.tags, { Name = "${var.app_name}-${var.environment}-booking-status" })
}