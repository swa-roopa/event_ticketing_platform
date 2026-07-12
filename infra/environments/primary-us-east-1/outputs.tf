output "nosql_api_url" {
  value = module.api.nosql_api_url
}

output "events_table_name" {
  value = module.database_nosql.events_table_name
}

output "tickets_table_name" {
  value = module.database_nosql.tickets_table_name
}

output "bookings_table_name" {
  value = module.database_nosql.bookings_table_name
}

output "booking_queue_url" {
  value = module.queue.booking_queue_url
}

output "dashboard_name" {
  value = module.monitoring.dashboard_name
}