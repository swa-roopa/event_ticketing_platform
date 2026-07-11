import json
import os
from events import create_event, get_event, list_events
from bookings import reserve_ticket, get_booking, get_user_bookings, write_latency_proof

CURRENT_REGION = os.getenv("AWS_REGION", "us-east-1")
IS_PRIMARY = CURRENT_REGION == "us-east-1"


def handler(event, context):
    path = event.get("path", "/")
    method = event.get("httpMethod", "GET")
    body = json.loads(event.get("body") or "{}")
    path_params = event.get("pathParameters") or {}
    query_params = event.get("queryStringParameters") or {}

    if path == "/health":
        return respond(200, {
            "status": "healthy",
            "app": "GlobalTix-NoSQL",
            "region": CURRENT_REGION,
            "role": "primary" if IS_PRIMARY else "secondary",
            "database": "DynamoDB Global Tables",
            "write_mode": "local",
        })

    elif path == "/proof/write-latency" and method == "GET":
        return respond(200, write_latency_proof(int(query_params.get("samples", 10))))

    elif path == "/events" and method == "GET":
        return respond(200, list_events())

    elif path == "/events" and method == "POST":
        return respond(201, create_event(body))

    elif "/events/" in path and path.endswith("/reserve") and method == "POST":
        event_id = path_params.get("event_id")
        return respond(201, reserve_ticket({**body, "event_id": event_id}))

    elif "/events/" in path and method == "GET":
        event_id = path_params.get("event_id")
        return respond(200, get_event(event_id))

    elif "/bookings/" in path and method == "GET":
        booking_id = path_params.get("booking_id")
        return respond(200, get_booking(booking_id))

    elif "/users/" in path and path.endswith("/bookings") and method == "GET":
        user_id = path_params.get("user_id")
        return respond(200, get_user_bookings(user_id))

    return respond(404, {"error": "Not found"})


def respond(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "X-Served-By-Region": CURRENT_REGION,
        },
        "body": json.dumps(body, default=str),
    }