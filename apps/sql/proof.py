import time
import uuid
import statistics
import os
import json
import boto3
from flask import Blueprint, jsonify, request
from sqlalchemy import Column, String, DateTime, text
from sqlalchemy.orm import Session

proof_bp = Blueprint("proof", __name__, url_prefix="/proof")

CURRENT_REGION = os.getenv("AWS_REGION", "us-east-1")
IS_PRIMARY = CURRENT_REGION == "us-east-1"

def _get_session():
    from globaltix import SessionLocal
    return SessionLocal()

# GET /proof/write-latency
@proof_bp.route("/write-latency", methods=["GET"])
def write_latency():
    samples = min(int(request.args.get("samples", 10)), 20)
    latencies = []

    session = _get_session()
    try:
        for _ in range(samples):
            t0 = time.perf_counter()
            session.execute(
                text(
                    "INSERT INTO latency_tests (id, region) VALUES (:id, :region)"
                ),
                {"id": str(uuid.uuid4()), "region": CURRENT_REGION}
            )
            session.commit()
            latencies.append((time.perf_counter() - t0) * 1000)
    finally:
        session.close()

    avg = round(statistics.mean(latencies), 2)
    p50 = round(statistics.median(latencies), 2)
    p99 = round(sorted(latencies)[int(len(latencies) * 0.99) - 1], 2)

    return jsonify({
        "region": CURRENT_REGION,
        "role": "primary" if IS_PRIMARY else "secondary",
        "write_forwarding_enabled": not IS_PRIMARY,
        "samples": samples,
        "latencies_ms": [round(l, 2) for l in latencies],
        "avg_write_ms": avg,
        "p50_write_ms": p50,
        "p99_write_ms": p99,
        "explanation": (
            "writes executed locally - no forwarding overhead"
            if IS_PRIMARY
            else "writes forwarded to us-east-1 primary - cross-region writes"
        ),
    })


# POST /proof/book-sync
@proof_bp.route("/book-sync", methods=["POST"])
def book_sync():
    data = request.get_json() or {}
    booking_id = str(uuid.uuid4())
    
    session = _get_session()
    try:
        t0 = time.perf_counter()
        session.execute(
            text(
                "INSERT INTO proof_bookings (id, event_id, user_id, region, method) VALUES (:id, :event_id, :user_id, :region, 'sync')"
            ),
            {
                "id": booking_id,
                "event_id": data.get("event_id", "demo-event"),
                "user_id": data.get("user_id", "demo-user"),
                "region": CURRENT_REGION,
            },
        )
        session.commit()
        write_ms = round((time.perf_counter() - t0) * 1000, 2)
    finally:
        session.close()

    return jsonify({
        "booking_id": booking_id,
        "status": "confirmed",
        "served_by": CURRENT_REGION,
        "write_executed_in": "us-east-1",
        "write_latency_ms": write_ms,
        "user_wait_ms": write_ms,
        "warning": (
            "write forwarded to primary — user paid cross-region latency"
            if not IS_PRIMARY
            else "write executed locally — no overhead"
        ),
    })

# POST /proof/book-async
@proof_bp.route("/book-async", methods=["POST"])
def book_async():
    data = request.get_json() or {}
    booking_id = str(uuid.uuid4())

    t0 = time.perf_counter()
    sqs = boto3.client("sqs", region_name=CURRENT_REGION)
    sqs.send_message(
        QueueUrl=os.environ["BOOKING_QUEUE_URL"],
        MessageBody=json.dumps({
            "booking_id": booking_id,
            "event_id": data.get("event_id", "demo-event"),
            "user_id": data.get("user_id", "demo-user"),
            "source_region": CURRENT_REGION,
        }),
        MessageGroupId="bookings",
        MessageDeduplicationId=booking_id,
    )
    queue_ms = round((time.perf_counter() - t0) * 1000, 2)

    return jsonify({
        "booking_id": booking_id,
        "status": "pending",
        "served_by": CURRENT_REGION,
        "queue_latency_ms": queue_ms,
        "user_wait_ms": queue_ms,
        "poll_url": f"/proof/book-status/{booking_id}",
        "note": "write queued to SQS — Lambda processes from primary region async",
    })

# GET /proof/book-status/<booking_id>
@proof_bp.route("/book-status/<booking_id>", methods=["GET"])
def book_status(booking_id):
    ddb = boto3.resource("dynamodb", region_name=CURRENT_REGION)
    table = ddb.Table(os.environ["BOOKING_STATUS_TABLE"])
    result = table.get_item(Key={"booking_id": booking_id})
    item = result.get("Item")

    if not item:
        return jsonify({"booking_id": booking_id, "status": "pending"})

    return jsonify({
        "booking_id": booking_id,
        "status": item["status"],
        "processed_by_region": item.get("processed_region"),
        "processed_at": item.get("processed_at"),
        "source_region": item.get("source_region"),
    })