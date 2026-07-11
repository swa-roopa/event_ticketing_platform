import os
import uuid
import logging
from datetime import datetime, timedelta, timezone
from contextlib import contextmanager
from decimal import Decimal

from flask import Flask, request, jsonify
from sqlalchemy import (
    create_engine, Column, String, DateTime, Integer,
    ForeignKey, Numeric, Index, text
)
from sqlalchemy.orm import sessionmaker, relationship, declarative_base
from sqlalchemy.pool import QueuePool

# ============== APPLICATION SETUP ==============
app = Flask(__name__)
app.config["APP_NAME"] = "GlobalTix"
Base = declarative_base()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("globaltix")


# ============== CONFIGURATION ==============
# Import secrets module for Secrets Manager integration
from secrets import get_db_config, get_all_db_endpoints


class Config:
    CURRENT_REGION = os.getenv("AWS_REGION", "us-east-1")

    REGION_MAP = {
        "us-east-1": "primary",
        "us-east-2": "secondary",
    }

    # Cached credentials (loaded at startup)
    _db_config = None
    _endpoints = None

    @classmethod
    def get_local_region_key(cls):
        return cls.REGION_MAP.get(cls.CURRENT_REGION, "primary")

    @classmethod
    def load_db_config(cls):
        """Load database configuration from Secrets Manager"""
        if cls._db_config is None:
            cls._db_config = get_db_config()
            cls._endpoints = get_all_db_endpoints()
            logger.info("Database configuration loaded from Secrets Manager")
        return cls._db_config

    @classmethod
    def get_endpoints(cls):
        """Get all database endpoints"""
        if cls._endpoints is None:
            cls.load_db_config()
        return cls._endpoints


# ============== DATABASE MODELS ==============
class Event(Base):
    """Concert, sports game, or any ticketed event"""
    __tablename__ = "events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    venue = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    country = Column(String(100), nullable=False)
    event_date = Column(DateTime, nullable=False)
    total_tickets = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    status = Column(String(20), default="active")  # active, cancelled, completed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.utcnow)

    tickets = relationship("Ticket", back_populates="event", lazy="dynamic")

    __table_args__ = (
        Index("idx_event_date", "event_date"),
        Index("idx_event_status", "status"),
    )


class Ticket(Base):
    """Individual ticket with seat assignment"""
    __tablename__ = "tickets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(36), ForeignKey("events.id"), nullable=False)
    seat_section = Column(String(50), nullable=False)
    seat_row = Column(String(10), nullable=False)
    seat_number = Column(String(10), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    status = Column(String(20), default="available")  # available, reserved, sold
    reserved_at = Column(DateTime, nullable=True)
    reserved_by = Column(String(36), nullable=True)
    reservation_expires = Column(DateTime, nullable=True)
    sold_at = Column(DateTime, nullable=True)
    version = Column(Integer, default=1)  # Optimistic locking

    event = relationship("Event", back_populates="tickets")

    __table_args__ = (
        Index("idx_ticket_event_seat", "event_id", "seat_section", "seat_row", "seat_number", unique=True),
        Index("idx_ticket_status", "status"),
        Index("idx_ticket_reserved_by", "reserved_by"),
    )

    @property
    def seat_label(self):
        return f"{self.seat_section}-{self.seat_row}-{self.seat_number}"


class Booking(Base):
    """Completed ticket purchase"""
    __tablename__ = "bookings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    booking_number = Column(String(20), unique=True, nullable=False)
    user_id = Column(String(36), nullable=False, index=True)
    user_email = Column(String(255), nullable=False)
    ticket_id = Column(String(36), ForeignKey("tickets.id"), nullable=False)
    event_id = Column(String(36), ForeignKey("events.id"), nullable=False)

    # Multi-region tracking
    booking_region = Column(String(20), nullable=False)

    # Payment info
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    payment_status = Column(String(20), default="pending")  # pending, completed, failed, refunded
    payment_id = Column(String(100), nullable=True)
    payment_method = Column(String(50), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_booking_user", "user_id"),
        Index("idx_booking_region", "booking_region"),
        Index("idx_booking_number", "booking_number"),
    )


class RegionInventory(Base):
    """
    Per-region ticket allocation to enable parallel writes without conflicts.
    Each region owns a portion of tickets for hot events.
    """
    __tablename__ = "region_inventory"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(36), ForeignKey("events.id"), nullable=False)
    region = Column(String(20), nullable=False)
    allocated_tickets = Column(Integer, default=0)
    sold_tickets = Column(Integer, default=0)
    reserved_tickets = Column(Integer, default=0)
    version = Column(Integer, default=1)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_region_inventory_event_region", "event_id", "region", unique=True),
    )

class LatencyTest(Base):
    __tablename__ = "latency_tests"
    id = Column(String(36), primary_key=True)
    region = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ProofBooking(Base):
    __tablename__ = "proof_bookings"
    id = Column(String(36), primary_key=True)
    event_id = Column(String(100), nullable=False)
    user_id = Column(String(100), nullable=False)
    region = Column(String(20), nullable=False)
    method = Column(String(10), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

# ============== DATABASE CONNECTION MANAGER ==============
class DatabaseManager:
    """
    Manages connections to both US and Secondary Aurora clusters.
    Automatically routes to local region for lowest latency.
    """

    def __init__(self):
        self.engines = {}
        self.session_factories = {}
        self._initialized = False

    def init_app(self):
        if self._initialized:
            return

        # Load credentials from Secrets Manager
        db_config = Config.load_db_config()
        endpoints = Config.get_endpoints()

        for region_key in ["primary", "secondary"]:
            host = endpoints[region_key]["writer"]

            url = (
                f"mysql+pymysql://{db_config['user']}:{db_config['password']}"
                f"@{host}:{db_config['port']}/{db_config['database']}"
                f"?charset=utf8mb4"
            )

            engine = create_engine(
                url,
                poolclass=QueuePool,
                pool_size=10,
                max_overflow=20,
                pool_pre_ping=True,
                pool_recycle=1800,
                connect_args={
                    "connect_timeout": 5,
                    "read_timeout": 30,
                    "write_timeout": 30,
                }
            )

            self.engines[region_key] = engine
            self.session_factories[region_key] = sessionmaker(bind=engine)

        self._initialized = True
        logger.info(f"Database connections initialized. Local region: {self.get_local_region()}")

    def get_local_region(self):
        return Config.get_local_region_key()

    def get_engine(self, region=None):
        region = region or self.get_local_region()
        return self.engines.get(region)

    @contextmanager
    def session(self, region=None):
        """Context manager for database sessions with auto-commit/rollback"""
        region = region or self.get_local_region()
        session = self.session_factories[region]()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def create_tables(self):
        """Create all tables in the local region's database"""
        Base.metadata.create_all(self.get_engine())
        logger.info("Database tables created")


db = DatabaseManager()

def SessionLocal():
    return db.session_factories[db.get_local_region()]()


# ============== TICKET BOOKING SERVICE ==============
class TicketService:
    """
    Core booking logic with conflict-free multi-region writes.

    Strategies used:
    1. UUID primary keys - no auto-increment conflicts
    2. SELECT FOR UPDATE SKIP LOCKED - parallel reservations without blocking
    3. Optimistic locking with version field - detect concurrent modifications
    4. Write forwarding - Secondary writes automatically forwarded to US primary
    """

    RESERVATION_TIMEOUT_MINUTES = 10

    @staticmethod
    def generate_booking_number():
        """Generate unique booking number: GT-YYYYMMDD-XXXXXX"""
        date_part = datetime.utcnow().strftime("%Y%m%d")
        random_part = uuid.uuid4().hex[:6].upper()
        return f"GT-{date_part}-{random_part}"

    @staticmethod
    def find_available_tickets(event_id: str, quantity: int = 1, section: str = None):
        """Find available tickets for an event"""
        with db.session() as session:
            query = session.query(Ticket).filter(
                Ticket.event_id == event_id,
                Ticket.status == "available"
            )

            if section:
                query = query.filter(Ticket.seat_section == section)

            tickets = query.order_by(
                Ticket.seat_section,
                Ticket.seat_row,
                Ticket.seat_number
            ).limit(quantity).all()

            return [{
                "id": t.id,
                "seat": t.seat_label,
                "section": t.seat_section,
                "row": t.seat_row,
                "number": t.seat_number,
                "price": str(t.price)
            } for t in tickets]

    @staticmethod
    def reserve_ticket(event_id: str, user_id: str, ticket_id: str = None) -> dict:
        """
        Reserve a specific ticket or any available ticket.
        Uses SKIP LOCKED to allow parallel reservations without blocking.
        """
        current_region = db.get_local_region()
        reservation_expires = datetime.utcnow() + timedelta(minutes=TicketService.RESERVATION_TIMEOUT_MINUTES)

        with db.session() as session:
            # Build query for available ticket
            query = session.query(Ticket).filter(
                Ticket.event_id == event_id,
                Ticket.status == "available"
            )

            if ticket_id:
                query = query.filter(Ticket.id == ticket_id)

            # SKIP LOCKED allows parallel reservations - won't block on locked rows
            ticket = query.with_for_update(skip_locked=True).first()

            if not ticket:
                return {
                    "success": False,
                    "error": "No available tickets" if not ticket_id else "Ticket not available"
                }

            # Reserve the ticket
            ticket.status = "reserved"
            ticket.reserved_by = user_id
            ticket.reserved_at = datetime.utcnow()
            ticket.reservation_expires = reservation_expires
            ticket.version += 1

            session.flush()

            logger.info(f"Ticket {ticket.id} reserved by {user_id} in region {current_region}")

            return {
                "success": True,
                "reservation": {
                    "ticket_id": ticket.id,
                    "event_id": event_id,
                    "seat": ticket.seat_label,
                    "price": str(ticket.price),
                    "expires_at": reservation_expires.isoformat(),
                    "region": current_region
                }
            }

    @staticmethod
    def complete_booking(
        ticket_id: str,
        user_id: str,
        user_email: str,
        payment_id: str,
        payment_method: str = "card"
    ) -> dict:
        """
        Complete the purchase of a reserved ticket.
        Creates a booking record and marks ticket as sold.
        """
        current_region = db.get_local_region()

        with db.session() as session:
            # Get the reserved ticket with lock
            ticket = session.query(Ticket).filter(
                Ticket.id == ticket_id,
                Ticket.reserved_by == user_id,
                Ticket.status == "reserved"
            ).with_for_update().first()

            if not ticket:
                return {"success": False, "error": "Reservation not found or expired"}

            # Check reservation hasn't expired
            if ticket.reservation_expires and ticket.reservation_expires < datetime.utcnow():
                ticket.status = "available"
                ticket.reserved_by = None
                ticket.reserved_at = None
                ticket.reservation_expires = None
                return {"success": False, "error": "Reservation has expired"}

            # Get event for additional info
            event = session.query(Event).filter(Event.id == ticket.event_id).first()

            # Mark ticket as sold
            ticket.status = "sold"
            ticket.sold_at = datetime.utcnow()
            ticket.version += 1

            # Create booking record
            booking = Booking(
                booking_number=TicketService.generate_booking_number(),
                user_id=user_id,
                user_email=user_email,
                ticket_id=ticket.id,
                event_id=ticket.event_id,
                booking_region=current_region,
                amount=ticket.price,
                currency=event.currency if event else "USD",
                payment_status="completed",
                payment_id=payment_id,
                payment_method=payment_method
            )
            session.add(booking)

            # Update region inventory
            inventory = session.query(RegionInventory).filter(
                RegionInventory.event_id == ticket.event_id,
                RegionInventory.region == current_region
            ).with_for_update().first()

            if inventory:
                inventory.sold_tickets += 1
                if inventory.reserved_tickets > 0:
                    inventory.reserved_tickets -= 1
                inventory.version += 1

            session.flush()

            logger.info(f"Booking {booking.booking_number} completed in region {current_region}")

            return {
                "success": True,
                "booking": {
                    "booking_number": booking.booking_number,
                    "booking_id": booking.id,
                    "event_name": event.name if event else None,
                    "event_date": event.event_date.isoformat() if event else None,
                    "venue": event.venue if event else None,
                    "seat": ticket.seat_label,
                    "amount": str(booking.amount),
                    "currency": booking.currency,
                    "payment_status": booking.payment_status,
                    "booked_from_region": current_region
                }
            }

    @staticmethod
    def cancel_reservation(ticket_id: str, user_id: str) -> dict:
        """Cancel a reservation and release the ticket"""
        with db.session() as session:
            ticket = session.query(Ticket).filter(
                Ticket.id == ticket_id,
                Ticket.reserved_by == user_id,
                Ticket.status == "reserved"
            ).with_for_update().first()

            if not ticket:
                return {"success": False, "error": "Reservation not found"}

            ticket.status = "available"
            ticket.reserved_by = None
            ticket.reserved_at = None
            ticket.reservation_expires = None
            ticket.version += 1

            return {"success": True, "message": "Reservation cancelled"}

    @staticmethod
    def release_expired_reservations() -> int:
        """Background job to release expired reservations"""
        with db.session() as session:
            expired_tickets = session.query(Ticket).filter(
                Ticket.status == "reserved",
                Ticket.reservation_expires < datetime.utcnow()
            ).with_for_update(skip_locked=True).all()

            count = 0
            for ticket in expired_tickets:
                ticket.status = "available"
                ticket.reserved_by = None
                ticket.reserved_at = None
                ticket.reservation_expires = None
                ticket.version += 1
                count += 1

            logger.info(f"Released {count} expired reservations")
            return count


# ============== EVENT SERVICE ==============
class EventService:
    """Service for managing events"""

    @staticmethod
    def create_event(
        name: str,
        venue: str,
        city: str,
        country: str,
        event_date: datetime,
        total_tickets: int,
        price: Decimal,
        sections: list = None
    ) -> dict:
        """Create a new event with tickets"""
        current_region = db.get_local_region()

        with db.session() as session:
            event = Event(
                name=name,
                venue=venue,
                city=city,
                country=country,
                event_date=event_date,
                total_tickets=total_tickets,
                price=price
            )
            session.add(event)
            session.flush()

            # Default sections if not provided
            if not sections:
                sections = [
                    {"name": "VIP", "rows": 5, "seats_per_row": 20, "price_multiplier": 2.0},
                    {"name": "FLOOR", "rows": 20, "seats_per_row": 30, "price_multiplier": 1.0},
                    {"name": "BALCONY", "rows": 10, "seats_per_row": 40, "price_multiplier": 0.7},
                ]

            # Create tickets
            ticket_count = 0
            for section in sections:
                section_price = price * Decimal(str(section.get("price_multiplier", 1.0)))
                for row in range(1, section["rows"] + 1):
                    for seat in range(1, section["seats_per_row"] + 1):
                        ticket = Ticket(
                            event_id=event.id,
                            seat_section=section["name"],
                            seat_row=str(row),
                            seat_number=str(seat),
                            price=section_price
                        )
                        session.add(ticket)
                        ticket_count += 1

            # Allocate inventory to regions (50/50 split)
            half = ticket_count // 2
            for region, allocation in [("primary", half), ("secondary", ticket_count - half)]:
                inventory = RegionInventory(
                    event_id=event.id,
                    region=region,
                    allocated_tickets=allocation
                )
                session.add(inventory)

            session.flush()

            logger.info(f"Event '{name}' created with {ticket_count} tickets")

            return {
                "event_id": event.id,
                "name": event.name,
                "venue": event.venue,
                "event_date": event.event_date.isoformat(),
                "total_tickets": ticket_count,
                "created_in_region": current_region
            }

    @staticmethod
    def get_event(event_id: str) -> dict:
        """Get event details with availability"""
        with db.session() as session:
            event = session.query(Event).filter(Event.id == event_id).first()
            if not event:
                return None

            # Count available tickets
            available = session.query(Ticket).filter(
                Ticket.event_id == event_id,
                Ticket.status == "available"
            ).count()

            reserved = session.query(Ticket).filter(
                Ticket.event_id == event_id,
                Ticket.status == "reserved"
            ).count()

            sold = session.query(Ticket).filter(
                Ticket.event_id == event_id,
                Ticket.status == "sold"
            ).count()

            return {
                "id": event.id,
                "name": event.name,
                "venue": event.venue,
                "city": event.city,
                "country": event.country,
                "date": event.event_date.isoformat(),
                "price": str(event.price),
                "currency": event.currency,
                "status": event.status,
                "tickets": {
                    "total": event.total_tickets,
                    "available": available,
                    "reserved": reserved,
                    "sold": sold
                }
            }


# ============== API ENDPOINTS ==============
@app.route("/")
def index():
    """API information"""
    return jsonify({
        "app": "GlobalTix",
        "description": "Global Event Ticketing Platform",
        "version": "1.0.0",
        "region": db.get_local_region(),
        "endpoints": {
            "health": "/health",
            "events": "/events",
            "reserve": "/events/<event_id>/reserve",
            "book": "/bookings",
            "user_bookings": "/users/<user_id>/bookings",
            "stats": "/stats"
        }
    })


@app.route("/health")
def health():
    """Health check with database connectivity test"""
    try:
        with db.session() as session:
            session.execute(text("SELECT 1"))

        return jsonify({
            "status": "healthy",
            "app": "GlobalTix",
            "region": db.get_local_region(),
            "aws_region": Config.CURRENT_REGION,
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "region": db.get_local_region()
        }), 500


@app.route("/events", methods=["GET"])
def list_events():
    """List upcoming events"""
    with db.session() as session:
        events = session.query(Event).filter(
            Event.status == "active",
            Event.event_date > datetime.utcnow()
        ).order_by(Event.event_date).limit(50).all()

        return jsonify({
            "events": [{
                "id": e.id,
                "name": e.name,
                "venue": e.venue,
                "city": e.city,
                "country": e.country,
                "date": e.event_date.isoformat(),
                "price": str(e.price),
                "currency": e.currency
            } for e in events],
            "served_from_region": db.get_local_region()
        })


@app.route("/events", methods=["POST"])
def create_event():
    """Create a new event"""
    data = request.json

    result = EventService.create_event(
        name=data["name"],
        venue=data["venue"],
        city=data["city"],
        country=data["country"],
        event_date=datetime.fromisoformat(data["event_date"]),
        total_tickets=data.get("total_tickets", 1000),
        price=Decimal(str(data["price"])),
        sections=data.get("sections")
    )

    return jsonify(result), 201


@app.route("/events/<event_id>")
def get_event(event_id):
    """Get event details"""
    result = EventService.get_event(event_id)
    if not result:
        return jsonify({"error": "Event not found"}), 404

    result["served_from_region"] = db.get_local_region()
    return jsonify(result)


@app.route("/events/<event_id>/tickets")
def get_available_tickets(event_id):
    """Get available tickets for an event"""
    section = request.args.get("section")
    limit = int(request.args.get("limit", 20))

    tickets = TicketService.find_available_tickets(
        event_id=event_id,
        quantity=limit,
        section=section
    )

    return jsonify({
        "event_id": event_id,
        "tickets": tickets,
        "count": len(tickets),
        "served_from_region": db.get_local_region()
    })


@app.route("/events/<event_id>/reserve", methods=["POST"])
def reserve_ticket(event_id):
    """Reserve a ticket"""
    data = request.json
    user_id = data.get("user_id")
    ticket_id = data.get("ticket_id")  # Optional: specific ticket

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    result = TicketService.reserve_ticket(
        event_id=event_id,
        user_id=user_id,
        ticket_id=ticket_id
    )

    if result["success"]:
        return jsonify(result), 201
    return jsonify(result), 400


@app.route("/reservations/<ticket_id>", methods=["DELETE"])
def cancel_reservation(ticket_id):
    """Cancel a reservation"""
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    result = TicketService.cancel_reservation(ticket_id, user_id)

    if result["success"]:
        return jsonify(result)
    return jsonify(result), 400


@app.route("/bookings", methods=["POST"])
def complete_booking():
    """Complete a ticket purchase"""
    data = request.json

    required = ["ticket_id", "user_id", "user_email", "payment_id"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": f"Missing required fields: {missing}"}), 400

    result = TicketService.complete_booking(
        ticket_id=data["ticket_id"],
        user_id=data["user_id"],
        user_email=data["user_email"],
        payment_id=data["payment_id"],
        payment_method=data.get("payment_method", "card")
    )

    if result["success"]:
        return jsonify(result), 201
    return jsonify(result), 400


@app.route("/bookings/<booking_number>")
def get_booking(booking_number):
    """Get booking by booking number"""
    with db.session() as session:
        booking = session.query(Booking).filter(
            Booking.booking_number == booking_number
        ).first()

        if not booking:
            return jsonify({"error": "Booking not found"}), 404

        ticket = session.query(Ticket).filter(Ticket.id == booking.ticket_id).first()
        event = session.query(Event).filter(Event.id == booking.event_id).first()

        return jsonify({
            "booking_number": booking.booking_number,
            "event": {
                "name": event.name if event else None,
                "venue": event.venue if event else None,
                "date": event.event_date.isoformat() if event else None
            },
            "seat": ticket.seat_label if ticket else None,
            "amount": str(booking.amount),
            "currency": booking.currency,
            "payment_status": booking.payment_status,
            "booked_at": booking.created_at.isoformat(),
            "booked_from_region": booking.booking_region
        })


@app.route("/users/<user_id>/bookings")
def get_user_bookings(user_id):
    """Get all bookings for a user"""
    with db.session() as session:
        bookings = session.query(Booking).filter(
            Booking.user_id == user_id
        ).order_by(Booking.created_at.desc()).all()

        results = []
        for b in bookings:
            ticket = session.query(Ticket).filter(Ticket.id == b.ticket_id).first()
            event = session.query(Event).filter(Event.id == b.event_id).first()

            results.append({
                "booking_number": b.booking_number,
                "event_name": event.name if event else None,
                "event_date": event.event_date.isoformat() if event else None,
                "venue": event.venue if event else None,
                "seat": ticket.seat_label if ticket else None,
                "amount": str(b.amount),
                "currency": b.currency,
                "booked_from_region": b.booking_region,
                "booked_at": b.created_at.isoformat()
            })

        return jsonify({
            "user_id": user_id,
            "bookings": results,
            "total": len(results)
        })


@app.route("/stats")
def stats():
    """Regional booking statistics"""
    with db.session() as session:
        # Bookings by region
        primary_bookings = session.query(Booking).filter(Booking.booking_region == "primary").count()
        secondary_bookings = session.query(Booking).filter(Booking.booking_region == "secondary").count()

        # Total revenue by region
        primary_revenue = session.query(Booking).filter(
            Booking.booking_region == "primary",
            Booking.payment_status == "completed"
        ).with_entities(
            text("COALESCE(SUM(amount), 0)")
        ).scalar() or 0

        secondary_revenue = session.query(Booking).filter(
            Booking.booking_region == "secondary",
            Booking.payment_status == "completed"
        ).with_entities(
            text("COALESCE(SUM(amount), 0)")
        ).scalar() or 0

        return jsonify({
            "current_region": db.get_local_region(),
            "bookings": {
                "primary": primary_bookings,
                "secondary": secondary_bookings,
                "total": primary_bookings + secondary_bookings
            },
            "revenue": {
                "primary": str(primary_revenue),
                "secondary": str(secondary_revenue),
                "total": str(primary_revenue + secondary_revenue)
            },
            "timestamp": datetime.utcnow().isoformat()
        })


@app.route("/admin/release-expired", methods=["POST"])
def release_expired():
    """Admin endpoint to release expired reservations"""
    count = TicketService.release_expired_reservations()
    return jsonify({
        "released": count,
        "region": db.get_local_region()
    })


# ============== STARTUP ==============
def init_app():
    """Initialize the application"""
    db.init_app()
    db.create_tables()
    logger.info(f"GlobalTix initialized in region: {db.get_local_region()}")

from proof import proof_bp
app.register_blueprint(proof_bp)

if __name__ == "__main__":
    init_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
