output "events_table_name" {
  value = aws_dynamodb_table.events.name
}

output "events_table_arn" {
  value = aws_dynamodb_table.events.arn
}

output "tickets_table_name" {
  value = aws_dynamodb_table.tickets.name
}

output "tickets_table_arn" {
  value = aws_dynamodb_table.tickets.arn
}

output "bookings_table_name" {
  value = aws_dynamodb_table.bookings.name
}

output "bookings_table_arn" {
  value = aws_dynamodb_table.bookings.arn
}

output "booking_status_table_name" {
  value = aws_dynamodb_table.booking_status.name
}

output "booking_status_table_arn" {
  value = aws_dynamodb_table.booking_status.arn
}