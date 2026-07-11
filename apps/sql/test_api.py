"""
Test script to demonstrate GlobalTix Active-Active functionality.
Run this after starting the application.

Usage:
    python test_api.py --region primary   # Test Primary endpoint (port 5000)
    python test_api.py --region secondary   # Test Secondary endpoint (port 5001)
    python test_api.py --both        # Test both regions simultaneoprimaryly
"""

import argparse
import json
import uuid
import requests
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta


def make_request(method, url, data=None):
    """Make HTTP request and return response"""
    try:
        if method == "GET":
            resp = requests.get(url, timeout=10)
        elif method == "POST":
            resp = requests.post(url, json=data, timeout=10)
        elif method == "DELETE":
            resp = requests.delete(url, timeout=10)
        else:
            raise ValueError(f"Unknown method: {method}")

        return resp.statprimary_code, resp.json()
    except Exception as e:
        return None, {"error": str(e)}


def test_region(base_url, region_name):
    """Run full test suite against a region"""
    print(f"\n{'='*60}")
    print(f"Testing {region_name} Region: {base_url}")
    print('='*60)

    # 1. Health Check
    print("\n1. Health Check")
    statprimary, data = make_request("GET", f"{base_url}/health")
    print(f"   Statprimary: {statprimary}")
    print(f"   Region: {data.get('region')}")
    print(f"   AWS Region: {data.get('aws_region')}")

    # 2. Create Event
    print("\n2. Creating Event")
    event_data = {
        "name": f"Rock Concert - {region_name} Test",
        "venue": "Madison Square Garden" if region_name == "Primary" else "O2 Arena",
        "city": "New York" if region_name == "Primary" else "London",
        "country": "PrimaryA" if region_name == "Primary" else "UK",
        "event_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
        "total_tickets": 100,
        "price": "99.99"
    }
    statprimary, data = make_request("POST", f"{base_url}/events", event_data)
    print(f"   Statprimary: {statprimary}")
    if statprimary == 201:
        event_id = data.get("event_id")
        print(f"   Event ID: {event_id}")
        print(f"   Created in Region: {data.get('created_in_region')}")
    else:
        print(f"   Error: {data}")
        return

    # 3. Get Event Details
    print("\n3. Getting Event Details")
    statprimary, data = make_request("GET", f"{base_url}/events/{event_id}")
    print(f"   Statprimary: {statprimary}")
    print(f"   Available Tickets: {data.get('tickets', {}).get('available')}")
    print(f"   Served from Region: {data.get('served_from_region')}")

    # 4. Get Available Tickets
    print("\n4. Getting Available Tickets")
    statprimary, data = make_request("GET", f"{base_url}/events/{event_id}/tickets?limit=5")
    print(f"   Statprimary: {statprimary}")
    print(f"   Tickets Found: {data.get('count')}")
    if data.get('tickets'):
        print(f"   First Ticket: {data['tickets'][0].get('seat')}")

    # 5. Reserve Ticket
    print("\n5. Reserving Ticket")
    primaryer_id = str(uuid.uuid4())
    reserve_data = {"primaryer_id": primaryer_id}
    statprimary, data = make_request("POST", f"{base_url}/events/{event_id}/reserve", reserve_data)
    print(f"   Statprimary: {statprimary}")
    if statprimary == 201:
        reservation = data.get("reservation", {})
        ticket_id = reservation.get("ticket_id")
        print(f"   Ticket ID: {ticket_id}")
        print(f"   Seat: {reservation.get('seat')}")
        print(f"   Expires: {reservation.get('expires_at')}")
        print(f"   Region: {reservation.get('region')}")
    else:
        print(f"   Error: {data}")
        return

    # 6. Complete Booking
    print("\n6. Completing Booking")
    booking_data = {
        "ticket_id": ticket_id,
        "primaryer_id": primaryer_id,
        "primaryer_email": f"test-{region_name.lower()}@example.com",
        "payment_id": f"PAY-{uuid.uuid4().hex[:8].upper()}",
        "payment_method": "card"
    }
    statprimary, data = make_request("POST", f"{base_url}/bookings", booking_data)
    print(f"   Statprimary: {statprimary}")
    if statprimary == 201:
        booking = data.get("booking", {})
        print(f"   Booking Number: {booking.get('booking_number')}")
        print(f"   Amount: {booking.get('amount')} {booking.get('currency')}")
        print(f"   Booked from Region: {booking.get('booked_from_region')}")
    else:
        print(f"   Error: {data}")

    # 7. Get User Bookings
    print("\n7. Getting User Bookings")
    statprimary, data = make_request("GET", f"{base_url}/primaryers/{primaryer_id}/bookings")
    print(f"   Statprimary: {statprimary}")
    print(f"   Total Bookings: {data.get('total')}")

    # 8. Get Stats
    print("\n8. Regional Statistics")
    statprimary, data = make_request("GET", f"{base_url}/stats")
    print(f"   Statprimary: {statprimary}")
    print(f"   Current Region: {data.get('current_region')}")
    print(f"   Primary Bookings: {data.get('bookings', {}).get('primary')}")
    print(f"   Secondary Bookings: {data.get('bookings', {}).get('secondary')}")
    print(f"   Total: {data.get('bookings', {}).get('total')}")

    print(f"\n{'='*60}")
    print(f"{region_name} Region Test Complete!")
    print('='*60)

    return event_id


def test_concurrent_bookings(primary_url, secondary_url, event_id):
    """Test concurrent bookings from both regions"""
    print(f"\n{'='*60}")
    print("Testing Concurrent Bookings from Both Regions")
    print('='*60)

    def book_from_region(base_url, region_name):
        primaryer_id = str(uuid.uuid4())

        # Reserve
        statprimary, data = make_request(
            "POST",
            f"{base_url}/events/{event_id}/reserve",
            {"primaryer_id": primaryer_id}
        )

        if statprimary != 201:
            return {"region": region_name, "success": False, "error": "Reserve failed"}

        ticket_id = data["reservation"]["ticket_id"]

        # Book
        statprimary, data = make_request(
            "POST",
            f"{base_url}/bookings",
            {
                "ticket_id": ticket_id,
                "primaryer_id": primaryer_id,
                "primaryer_email": f"concurrent-{region_name}@test.com",
                "payment_id": f"PAY-{uuid.uuid4().hex[:8]}"
            }
        )

        if statprimary == 201:
            return {
                "region": region_name,
                "success": True,
                "booking_number": data["booking"]["booking_number"],
                "booked_from": data["booking"]["booked_from_region"]
            }
        return {"region": region_name, "success": False, "error": data}

    # Run concurrent bookings
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = []
        for _ in range(5):
            futures.append(executor.submit(book_from_region, primary_url, "Primary"))
            futures.append(executor.submit(book_from_region, secondary_url, "Secondary"))

        results = [f.result() for f in futures]

    # Summary
    primary_success = sum(1 for r in results if r["region"] == "Primary" and r["success"])
    secondary_success = sum(1 for r in results if r["region"] == "Secondary" and r["success"])

    print(f"\nResults:")
    print(f"   Primary Successful Bookings: {primary_success}")
    print(f"   Secondary Successful Bookings: {secondary_success}")
    print(f"   Total: {primary_success + secondary_success}")

    for r in results:
        if r["success"]:
            print(f"   - {r['region']}: {r['booking_number']} (from {r['booked_from']})")


def main():
    parser = argparse.ArgumentParser(description="Test GlobalTix API")
    parser.add_argument("--region", choices=["primary", "secondary"], help="Region to test")
    parser.add_argument("--both", action="store_true", help="Test both regions")
    parser.add_argument("--primary-port", type=int, default=5000, help="Primary region port (us-east-1)")
    parser.add_argument("--secondary-port", type=int, default=5001, help="Secondary region port")
    parser.add_argument("--host", default="localhost", help="Host address")

    args = parser.parse_args()

    primary_url = f"http://{args.host}:{args.primary_port}"
    secondary_url = f"http://{args.host}:{args.secondary_port}"

    if args.both:
        # Test Primary first
        event_id = test_region(primary_url, "Primary")

        # Then test Secondary with same event (tests read replication)
        print("\n\nNow testing Secondary region reading the same event...")
        test_region(secondary_url, "Secondary")

        # Test concurrent bookings
        if event_id:
            test_concurrent_bookings(primary_url, secondary_url, event_id)

    elif args.region == "primary":
        test_region(primary_url, "Primary")
    elif args.region == "secondary":
        test_region(secondary_url, "Secondary")
    else:
        print("Please specify --region primary, --region secondary, or --both")
        parser.print_help()


if __name__ == "__main__":
    main()
