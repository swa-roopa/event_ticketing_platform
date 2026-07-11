import os
import uuid
import boto3
from datetime import datetime, timezone

CURRENT_REGION = os.getenv("AWS_REGION", "us-east-1")


def _table(name_env):
    ddb = boto3.resource("dynamodb", region_name=CURRENT_REGION)
    return ddb.Table(os.environ[name_env])


def create_event(data: dict) -> dict:
    table = _table("EVENTS_TABLE")
    event_id = str(uuid.uuid4())

    item = {
        "event_id": event_id,
        "name": data["name"],
        "venue": data["venue"],
        "city": data["city"],
        "country": data["country"],
        "event_date": data["event_date"],
        "total_tickets": data.get("total_tickets", 1000),
        "available_tickets": data.get("total_tickets", 1000),
        "price": str(data["price"]),
        "currency": data.get("currency", "USD"),
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by_region": CURRENT_REGION,
    }

    table.put_item(Item=item)
    return item


def get_event(event_id: str) -> dict:
    table = _table("EVENTS_TABLE")
    result = table.get_item(Key={"event_id": event_id})
    item = result.get("Item")

    if not item:
        return {"error": "Event not found"}

    item["served_from_region"] = CURRENT_REGION
    return item


def list_events() -> dict:
    table = _table("EVENTS_TABLE")
    result = table.scan(
        FilterExpression="#s = :active",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":active": "active"},
        Limit=50,
    )

    return {
        "events": result.get("Items", []),
        "served_from_region": CURRENT_REGION,
    }