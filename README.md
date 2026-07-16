# GlobalTix — Active-Active Multi-Region: SQL vs NoSQL

A proof-of-concept event ticketing platform that demonstrates — with real latency numbers — why **Aurora Global DB with write forwarding is NOT true active-active**, while **DynamoDB Global Tables IS**.

> This repo accompanies the blog post: *Active-Active Multi-Region on AWS: SQL vs NoSQL*

---

## The Point

"Active-active" means every region can accept writes **locally**. AWS Aurora Global DB has a feature called *write forwarding* that makes it look like secondary regions accept writes — but under the hood every write still travels to the single primary region (us-east-1) before being committed. That is active-**passive**, not active-active.

DynamoDB Global Tables writes locally in whichever region receives the request. No forwarding, no cross-region round trip.

This app lets you see the difference live:

| | SQL (Aurora Global DB) | NoSQL (DynamoDB Global Tables) |
|---|---|---|
| Write from primary (us-east-1) | ~5 ms | ~5 ms |
| Write from secondary (us-east-2) | **~80–120 ms** (forwarded) | ~5 ms (local) |
| Conflict handling | Application-level locking | Conditional writes (`ConditionExpression`) |
| True active-active? | **No** | **Yes** |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                            │
│                        localhost:3000                                │
└──────┬────────────────────────────────────┬───────────────────────┘
       │                                    │
       ▼                                    ▼
┌──────────────────────┐        ┌──────────────────────┐
│   SQL Panel          │        │   NoSQL Panel        │
│                      │        │                      │
│  sql-primary :5000   │        │  nosql-primary :5002 │
│  sql-secondary :5001 │        │  nosql-secondary:5003│
└──────────────────────┘        └──────────────────────┘
       │                                    │
       ▼                                    ▼
┌──────────────────┐             ┌──────────────────────┐
│  MySQL (local)   │             │  DynamoDB Local      │
│  Both sql-*      │             │  (shared, :8000)     │
│  point here      │             │  Both nosql-*        │
│  (simulates      │             │  point here          │
│  write forward)  │             │  (simulates local    │
└──────────────────┘             │   writes)            │
                                 └──────────────────────┘
```

**In production (AWS):**
- `sql-secondary` → Aurora secondary cluster → write forwarded to Aurora primary (us-east-1) → **+80ms**
- `nosql-secondary` → DynamoDB local replica in us-east-2 → **+0ms**

---

## Project Structure

```
event_ticketing_platform/
├── docker-compose.yml          # One command to run everything locally
├── apps/
│   ├── sql/
│   │   ├── globaltix.py        # Flask app — events, bookings, region inventory
│   │   ├── proof.py            # Blueprint: /proof/write-latency, /proof/book-sync, /proof/book-async
│   │   ├── booking_processor.py# Lambda handler for async SQS booking
│   │   ├── secrets.py          # Secrets Manager / local env fallback
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── nosql/
│       ├── handler.py          # Lambda entrypoint
│       ├── events.py           # DynamoDB event CRUD
│       ├── bookings.py         # Conditional writes — conflict detection
│       ├── local_runner.py     # Flask wrapper for local Lambda testing
│       ├── Dockerfile
│       └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Two-panel layout
│   │   └── layout.tsx
│   └── components/
│       ├── RegionPanel.tsx     # Region toggle, latency test, sync/async booking
│       └── LatencyBadge.tsx    # Color-coded ms badge
└── docs/screenshots/           # Proof screenshots for the blog
```

> This is a **local POC** — everything runs via `docker-compose` (MySQL stands in
> for Aurora, `dynamodb-local` for DynamoDB Global Tables). There is no cloud
> deployment; the point is to *demonstrate the behavioral difference* between the
> two write models, not to run them on AWS.

---

## Quick Start (Local)

**Prerequisites:** Docker, Docker Compose, Node.js 20+

```bash
# 1. Clone and start all backend services
git clone <this-repo>
cd event_ticketing_platform
docker-compose up --build

# Services started:
# mysql            → :3306
# dynamodb-local   → :8000
# sql-primary      → :5000  (AWS_REGION=us-east-1)
# sql-secondary    → :5001  (AWS_REGION=us-east-2)
# nosql-primary    → :5002  (AWS_REGION=us-east-1)
# nosql-secondary  → :5003  (AWS_REGION=us-east-2)

# 2. Start the frontend
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## Proof Endpoints

### SQL — `/proof/*`

| Endpoint | Method | What it shows |
|---|---|---|
| `/proof/write-latency?samples=10` | GET | avg / p50 / p99 write latency + `write_forwarding_enabled` flag |
| `/proof/book-sync` | POST | Naive booking — user waits for the full write round trip |
| `/proof/book-async` | POST | Queues write via SQS — returns in ~3ms with `status: pending` |
| `/proof/book-status/<id>` | GET | Poll DynamoDB for async booking result |

Example — run latency test against the secondary region:

```bash
curl "http://localhost:5001/proof/write-latency?samples=10"
# {
#   "region": "us-east-2",
#   "avg_write_ms": 94.3,
#   "p50_write_ms": 91.2,
#   "p99_write_ms": 118.7,
#   "write_forwarding_enabled": true,
#   "explanation": "Secondary writes are forwarded to us-east-1 — this is NOT active-active"
# }
```

### NoSQL — `/events/<id>/reserve`

DynamoDB conditional write — rejects double-booking atomically without any locking:

```bash
curl -X POST http://localhost:5003/events/demo-event/reserve \
  -H "Content-Type: application/json" \
  -d '{"event_id": "demo-event", "user_id": "demo-user"}'
# {
#   "success": true,
#   "write_executed_in": "us-east-2",
#   "write_latency_ms": 4.8
# }
```

---

## How Write Forwarding Works (and Why It's Not Active-Active)

```
User in us-east-2 sends a write:

  App (us-east-2)
      │
      ▼
  Aurora Secondary Cluster (us-east-2)   ← connected locally
      │
      │  write forwarded over the wire (~80ms)
      ▼
  Aurora Primary Cluster (us-east-1)     ← single writer
      │
      │  replication back
      ▼
  Aurora Secondary Cluster (us-east-2)
      │
      ▼
  Response to user    ← total: ~80–120ms extra
```

With `enable_global_write_forwarding = true` in Terraform, the secondary _accepts_ the connection — but the write is serialized through us-east-1. There is exactly one writer. That is the definition of active-passive.

---

## How DynamoDB Global Tables IS Active-Active

```
User in us-east-2 sends a write:

  App (us-east-2)
      │
      ▼
  DynamoDB replica in us-east-2          ← writes here directly
      │
      │  async replication (~1s)
      ▼
  DynamoDB replica in us-east-1

  Response to user    ← total: ~5ms
```

Conflicts are caught by the DynamoDB SDK:

```python
tickets_table.update_item(
    ConditionExpression=Attr("status").eq("available"),
    ...
)
# raises ConditionalCheckFailedException if another region already booked it
```

No cross-region round trip. No single writer. That is true active-active.

---

## What If You Must Use SQL for Active-Active?

If you need relational semantics with true active-active writes across regions, your AWS-managed options run out fast. Aurora Global DB write forwarding adds latency. Aurora DSQL is not production-ready for general workloads.

The realistic paths:

1. **Stay with Aurora + SQS buffer** — queue writes from the secondary, accept eventual consistency, poll for status. This app's `/proof/book-async` demonstrates this pattern.
2. **CockroachDB / YugabyteDB on EKS** — distributed SQL with native active-active. Not AWS managed.
3. **Redesign to NoSQL** — for event ticketing, DynamoDB's access patterns fit naturally (event\_id hash key, ticket\_id range key, conditional writes for inventory).

---

## Deployment

This POC is **local-only** — it runs entirely through `docker-compose` (see
[Quick Start](#quick-start-local)). MySQL stands in for Aurora Global Database
and `dynamodb-local` for DynamoDB Global Tables, which is enough to demonstrate
the write-model difference. There is no cloud/Terraform deployment.

---

## Environment Variables

**SQL app:**

| Variable | Local | Production |
|---|---|---|
| `USE_SECRETS_MANAGER` | `false` | `true` |
| `AWS_REGION` | `us-east-1` / `us-east-2` | set by runtime |
| `PRIMARY_DB_HOST` | `mysql` | from Secrets Manager |
| `DB_NAME` | `globaltix` | from Secrets Manager |
| `DB_USER` / `DB_PASSWORD` | see docker-compose | from Secrets Manager |
| `BOOKING_STATUS_TABLE` | `globaltix-booking-status` | same |

**NoSQL app:**

| Variable | Local | Production |
|---|---|---|
| `AWS_ENDPOINT_URL` | `http://dynamodb-local:8000` | not set (uses real AWS) |
| `EVENTS_TABLE` | `globaltix-events` | same |
| `TICKETS_TABLE` | `globaltix-tickets` | same |
| `BOOKINGS_TABLE` | `globaltix-bookings` | same |

---

## What You'd Watch in Production

If this ran on real AWS, the key signals would be:

- `AuroraGlobalDBReplicationLag` — spikes when write load increases on the secondary
- `ConditionalCheckFailedRequests` (DynamoDB) — successful conflict detection
- `ApproximateNumberOfMessagesVisible` (SQS) — async booking queue depth

---

## Cleanup

```bash
docker-compose down -v   # stop containers and remove the mysql volume
```
