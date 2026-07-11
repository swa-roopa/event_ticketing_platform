# GlobalTix - Event Ticketing Platform

Active-Active Multi-Region application with Aurora MySQL Global Database.

## Architecture

```
                         ┌──────────────────────────────────┐
                         │           Route 53               │
                         │    (Latency-based routing)       │
                         └───────────────┬──────────────────┘
                                         │
              ┌──────────────────────────┴──────────────────────────┐
              │                                                      │
              ▼                                                      ▼
┌─────────────────────────────┐                    ┌─────────────────────────────┐
│       US-EAST-1             │                    │       US-EAST-2             │
│    (Primary Region)         │                    │   (Secondary Region)        │
│                             │                    │                             │
│  ┌───────────────────────┐  │                    │  ┌───────────────────────┐  │
│  │    GlobalTix App      │  │                    │  │    GlobalTix App      │  │
│  │    (Flask API)        │  │                    │  │    (Flask API)        │  │
│  └───────────┬───────────┘  │                    │  └───────────┬───────────┘  │
│              │              │                    │              │              │
│  ┌───────────▼───────────┐  │   Global Database  │  ┌───────────▼───────────┐  │
│  │   Aurora MySQL        │  │◄──────────────────►│  │   Aurora MySQL        │  │
│  │   (Writer)            │  │   <1s replication  │  │   (Write Forwarding)  │  │
│  └───────────────────────┘  │                    │  └───────────────────────┘  │
│                             │                    │                             │
│  ┌───────────────────────┐  │    Replication     │  ┌───────────────────────┐  │
│  │   Secrets Manager     │◄─┼────────────────────┼─►│   Secrets Manager     │  │
│  │   (Primary)           │  │                    │  │   (Replica)           │  │
│  └───────────────────────┘  │                    │  └───────────────────────┘  │
│                             │                    │                             │
└─────────────────────────────┘                    └─────────────────────────────┘
```

## Features

- **Active-Active Multi-Region**: Both regions handle reads AND writes
- **Write Forwarding**: Secondary region forwards writes to primary automatically
- **Conflict-Free Design**: UUID keys, optimistic locking, SKIP LOCKED queries
- **Secrets Manager**: Credentials auto-replicated across regions
- **Auto-scaling**: Aurora Serverless v2 scales 0.5 to 32 ACUs

## Project Structure

```
event_ticketing_platform/
├── README.md
├── docker-compose.yml
├── app/
│   ├── globaltix.py        # Main Flask application
│   ├── secrets.py          # Secrets Manager integration
│   ├── test_api.py         # API test script
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
└── infra/
    ├── main.tf             # Providers, variables
    ├── networking.tf       # VPCs, subnets, security groups
    ├── aurora.tf           # Aurora Global Database
    ├── secrets.tf          # Secrets Manager + replication
    ├── outputs.tf          # Endpoints, connection info
    └── terraform.tfvars.example
```

## Prerequisites

- AWS CLI configured with appropriate permissions
- Terraform >= 1.5.0
- Docker & Docker Compose
- Python 3.11+ (for local development)

## Quick Start

### 1. Deploy Infrastructure

```bash
cd infra

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Deploy (password auto-generated, stored in Secrets Manager)
terraform apply
```

### 2. Run Application

**Production (with Secrets Manager):**
```bash
# From project root
docker-compose up -d

# Primary region: http://localhost:5000
# Secondary region: http://localhost:5001
```

**Local Development (with local MySQL):**
```bash
docker-compose --profile local up -d

# Primary region: http://localhost:5000
# Secondary region: http://localhost:5001
```

### 3. Test the API

```bash
cd app
pip install requests

# Test single region
python test_api.py --region us

# Test both regions with concurrent bookings
python test_api.py --both
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check with DB connectivity |
| GET | `/events` | List upcoming events |
| POST | `/events` | Create new event |
| GET | `/events/{id}` | Get event details |
| GET | `/events/{id}/tickets` | Get available tickets |
| POST | `/events/{id}/reserve` | Reserve a ticket |
| DELETE | `/reservations/{id}` | Cancel reservation |
| POST | `/bookings` | Complete ticket purchase |
| GET | `/bookings/{number}` | Get booking by number |
| GET | `/users/{id}/bookings` | Get user's bookings |
| GET | `/stats` | Regional booking statistics |

## API Examples

### Create Event
```bash
curl -X POST http://localhost:5000/events \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rock Concert 2024",
    "venue": "Madison Square Garden",
    "city": "New York",
    "country": "USA",
    "event_date": "2024-12-31T20:00:00",
    "total_tickets": 1000,
    "price": "99.99"
  }'
```

### Reserve Ticket
```bash
curl -X POST http://localhost:5000/events/{event_id}/reserve \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user-123"}'
```

### Complete Booking
```bash
curl -X POST http://localhost:5000/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "ticket-uuid",
    "user_id": "user-123",
    "user_email": "user@example.com",
    "payment_id": "PAY-ABC123"
  }'
```

### Check Regional Stats
```bash
# From Primary region
curl http://localhost:5000/stats

# From Secondary region
curl http://localhost:5001/stats
```

## Environment Variables

**Production (only 2 required):**

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_REGION` | Current region for Secrets Manager | `us-east-1` |
| `DB_SECRET_NAME` | Secrets Manager secret name | `globaltix/database/credentials` |

**Local Development:**

| Variable | Description |
|----------|-------------|
| `USE_SECRETS_MANAGER` | Set to `false` for local dev |
| `PRIMARY_DB_HOST` | Primary DB host |
| `SECONDARY_DB_HOST` | Secondary DB host |
| `DB_USER` | Database username |
| `DB_PASSWORD` | Database password |

## How Active-Active Works

### Write Forwarding

When a write happens in us-east-2 (secondary):

1. App connects to local Aurora cluster
2. Aurora detects it's a write operation
3. Write is forwarded to us-east-1 (primary)
4. Primary executes and replicates back
5. Total latency: ~50-100ms additional

### Conflict Prevention

| Strategy | Implementation |
|----------|----------------|
| UUID Primary Keys | No auto-increment conflicts |
| Optimistic Locking | `version` column on all tables |
| SKIP LOCKED | Parallel reservations without blocking |
| Region Tracking | `booking_region` field for analytics |

### Replication Lag

- Typical: < 1 second
- Monitor via CloudWatch: `AuroraGlobalDBReplicationLag`

## Infrastructure Costs (Estimated)

| Component | Cost/Month |
|-----------|------------|
| Aurora Serverless v2 (min 0.5 ACU x 2 regions) | ~$90 |
| Secrets Manager (1 secret, 2 regions) | ~$1 |
| VPC, NAT, etc. | ~$70 |
| **Total (minimum)** | **~$160** |

*Costs scale with usage. Aurora scales to 32 ACU per region under load.*

## Monitoring

Key CloudWatch metrics to monitor:

- `AuroraGlobalDBReplicationLag` - Cross-region replication delay
- `DatabaseConnections` - Connection pool usage
- `CPUUtilization` - Aurora compute usage
- `ServerlessDatabaseCapacity` - Current ACU allocation

## Cleanup

```bash
cd infra
terraform destroy
```

## Troubleshooting

**Write forwarding not working:**
- Verify `enable_global_write_forwarding = true` in aurora.tf
- Check security group allows traffic between regions

**Secrets Manager access denied:**
- Ensure IAM role has `secretsmanager:GetSecretValue` permission
- Verify secret is replicated to the application's region

**High replication lag:**
- Check network connectivity between regions
- Review write volume - consider read replicas for read-heavy workloads
