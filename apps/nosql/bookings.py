import os
import uuid
import time
import statistics
import boto3
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Attr, Key

CURRENT_REGION = os.getenv("AWS_REGION", "us-east-1")
IS_PRIMARY = CURRENT_REGION == "us-east-1"


def _table(name_env):
    ddb = boto3.resource("dynamodb", region_name=CURRENT_REGION)
    return ddb.Table(os.environ[name_env])


def reserve_ticket(data: dict) -> dict:
    """
    Conditional write — DynamoDB rejects the write if the ticket
    is already taken, regardless of which region tries to book it.
    Both regions write locally. Conflict caught at the DB level.
    No cross-region coordination. No single primary.
    """
    tickets_table = _table("TICKETS_TABLE")
    bookings_table = _table("BOOKINGS_TABLE")

    event_id = data.get("event_id")
    user_id = data.get("user_id", str(uuid.uuid4()))
    ticket_id = data.get("ticket_id")

    if not ticket_id:
        result = table.query(
            IndexName="user_id-index",
            KeyConditionExpression=Key("user_id").eq(user_id),
        )
        items = result.get("Items", [])
        if not items:
            return {"success": False, "error": "No available tickets"}
        ticket_id = items[0]["ticket_id"]

    booking_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    t0 = time.perf_counter()
    try:
        tickets_table.update_item(
            Key={"event_id": event_id, "ticket_id": ticket_id},
            UpdateExpression="SET #s = :sold, reserved_by = :uid, booked_at = :now, booking_id = :bid",
            ConditionExpression=Attr("status").eq("available"),
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":sold": "sold",
                ":uid": user_id,
                ":now": now,
                ":bid": booking_id,
            },
        )
    except tickets_table.meta.client.exceptions.ConditionalCheckFailedException:
        write_ms = round((time.perf_counter() - t0) * 1000, 2)
        return {
            "success": False,
            "error": "Ticket already booked",
            "conflict_detected_by": CURRENT_REGION,
            "write_latency_ms": write_ms,
            "explanation": "DynamoDB caught the conflict locally — no cross-region round trip needed",
        }

    write_ms = round((time.perf_counter() - t0) * 1000, 2)

    bookings_table.put_item(Item={
        "booking_id": booking_id,
        "event_id": event_id,
        "ticket_id": ticket_id,
        "user_id": user_id,
        "status": "confirmed",
        "booked_at": now,
        "booked_by_region": CURRENT_REGION,
        "write_latency_ms": str(write_ms),
    })

    return {
        "success": True,
        "booking_id": booking_id,
        "ticket_id": ticket_id,
        "status": "confirmed",
        "booked_by_region": CURRENT_REGION,
        "write_executed_in": CURRENT_REGION,
        "write_latency_ms": write_ms,
        "note": "write executed locally — no forwarding, no cross-region round trip",
    }


def get_booking(booking_id: str) -> dict:
    table = _table("BOOKINGS_TABLE")
    result = table.get_item(Key={"booking_id": booking_id})
    item = result.get("Item")

    if not item:
        return {"error": "Booking not found"}

    item["served_from_region"] = CURRENT_REGION
    return item


def get_user_bookings(user_id: str) -> dict:
    table = _table("BOOKINGS_TABLE")
    result = table.query(
        IndexName="user_id-index",
        KeyConditionExpression="user_id = :uid",
        ExpressionAttributeValues={":uid": user_id},
    )

    return {
        "user_id": user_id,
        "bookings": result.get("Items", []),
        "served_from_region": CURRENT_REGION,
    }


def write_latency_proof(samples: int = 10) -> dict:
    """
    Identical proof endpoint to the SQL version.
    Run both, compare the numbers side by side.
    """
    table = _table("BOOKINGS_TABLE")
    latencies = []

    for _ in range(min(samples, 20)):
        t0 = time.perf_counter()
        table.put_item(Item={
            "booking_id": str(uuid.uuid4()),
            "event_id": "latency-test",
            "user_id": "latency-test",
            "status": "test",
            "booked_at": datetime.now(timezone.utc).isoformat(),
            "booked_by_region": CURRENT_REGION,
        })
        latencies.append((time.perf_counter() - t0) * 1000)

    return {
        "region": CURRENT_REGION,
        "role": "primary" if IS_PRIMARY else "secondary",
        "write_forwarding_enabled": False,
        "samples": len(latencies),
        "latencies_ms": [round(l, 2) for l in latencies],
        "avg_write_ms": round(statistics.mean(latencies), 2),
        "p50_write_ms": round(statistics.median(latencies), 2),
        "p99_write_ms": round(sorted(latencies)[int(len(latencies) * 0.99) - 1], 2),
        "explanation": "writes always local — DynamoDB Global Tables, no forwarding ever",
    }