import json
import os
import uuid
import boto3
import pymysql
from datetime import datetime, timezone

def get_db():
    return pymysql.connect(
        host=os.environ["PRIMARY_DB_HOST"],
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        database=os.environ["DB_NAME"],
        connect_timeout=5,
    )

def handler(event, context):
    ddb = boto3.resource("dynamodb", region_name="us-east-1")
    status_table = ddb.Table(os.environ["BOOKING_STATUS_TABLE"])

    for record in event["Records"]:
        body = json.loads(record["body"])
        booking_id = body["booking_id"]

        try:
            conn = get_db()
            with conn.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO proof_bookings (id, event_id, user_id, region, method) "
                    "VALUES (%s, %s, %s, %s, 'async')",
                    (
                        booking_id,
                        body["event_id"],
                        body["user_id"],
                        body["source_region"],
                    ),
                )
            conn.commit()
            conn.close()

            status_table.put_item(Item={
                "booking_id": booking_id,
                "status": "confirmed",
                "processed_region": "us-east-1",
                "processed_at": datetime.now(timezone.utc).isoformat(),
                "source_region": body["source_region"],
            })

        except Exception as e:
            status_table.put_item(Item={
                "booking_id": booking_id,
                "status": "failed",
                "error": str(e),
            })
            raise