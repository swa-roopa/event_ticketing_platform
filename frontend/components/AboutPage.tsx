"use client"

export default function AboutPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 bg-white border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">About This Project</h1>
        <p className="text-gray-500 text-sm mt-1">
          A hands-on proof that Aurora Global DB write forwarding is NOT active-active.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        <div className="grid grid-cols-3 gap-4">
          {/* Main content */}
          <div className="col-span-2 flex flex-col gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-bold text-gray-800 mb-3">The Blog Post Thesis</h2>
              <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded-r mb-4">
                <p className="text-sm text-indigo-800 font-medium">
                  &ldquo;Everyone says Aurora Global Database supports active-active. Here&rsquo;s proof that it doesn&rsquo;t — and what actually is active-active.&rdquo;
                </p>
              </div>
              <div className="text-sm text-gray-600 space-y-3">
                <p>
                  AWS markets Aurora Global Database with &ldquo;write forwarding&rdquo; as a multi-region write capability. But write forwarding is not active-active — it&rsquo;s active-passive with a convenient proxy.
                </p>
                <p>
                  When a client in Ohio (US-East-2) writes a record, Aurora doesn&rsquo;t commit it in Ohio. Instead, it forwards the write to Virginia (US-East-1), commits it there, and returns the response. The client pays the full cross-region round-trip latency.
                </p>
                <p>
                  DynamoDB Global Tables is different. Both regions are writers. A write from Ohio commits immediately in Ohio&rsquo;s local replica (~5ms), and replication to Virginia happens asynchronously in the background. The client does not wait for replication.
                </p>
                <p className="font-medium text-gray-700">
                  This distinction matters enormously for globally distributed applications.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-bold text-gray-800 mb-3">Key Concepts Demonstrated</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    title: "Write Forwarding (SQL)",
                    color: "blue",
                    points: [
                      "Secondary regions forward writes to the global primary",
                      "Client waits for cross-region round trip (~80ms)",
                      "All writes serialized through single writer",
                      "Strong consistency guaranteed at a latency cost",
                    ],
                  },
                  {
                    title: "Multi-Master (NoSQL)",
                    color: "green",
                    points: [
                      "Every region accepts writes independently",
                      "Client gets confirmation in <10ms (local commit)",
                      "Replication is asynchronous and transparent",
                      "Conflicts resolved via Last-Writer-Wins",
                    ],
                  },
                  {
                    title: "SQS Async Mitigation",
                    color: "orange",
                    points: [
                      "SQL secondary adds SQS FIFO queue in front of writes",
                      "Client gets a booking_id immediately (~3ms)",
                      "Lambda consumer processes from US-East-1 asynchronously",
                      "Trade-off: eventual confirmation vs instant confirmation",
                    ],
                  },
                  {
                    title: "Conditional Writes",
                    color: "purple",
                    points: [
                      "DynamoDB uses ConditionExpression for atomic seat reservations",
                      "Prevents double-booking without distributed locks",
                      "ConditionalCheckFailedException caught and surfaced as conflict",
                      "Aurora uses SELECT FOR UPDATE for equivalent isolation",
                    ],
                  },
                ].map(({ title, color, points }) => (
                  <div key={title} className={`border rounded-lg p-3 ${color === "blue" ? "border-blue-100 bg-blue-50" : color === "green" ? "border-green-100 bg-green-50" : color === "orange" ? "border-orange-100 bg-orange-50" : "border-purple-100 bg-purple-50"}`}>
                    <h3 className={`text-sm font-semibold mb-2 ${color === "blue" ? "text-blue-700" : color === "green" ? "text-green-700" : color === "orange" ? "text-orange-700" : "text-purple-700"}`}>{title}</h3>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {points.map((p, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-gray-400 mt-0.5">•</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-bold text-gray-800 mb-3">Quick Start</h2>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-auto leading-relaxed">{`# Start all services locally
docker-compose up --build

# SQL Primary:    http://localhost:5010
# SQL Secondary:  http://localhost:5011
# NoSQL Primary:  http://localhost:5002
# NoSQL Secondary: http://localhost:5003

# Start the frontend
cd frontend && npm install && npm run dev
# → http://localhost:3000

# Test the proof endpoint directly
curl http://localhost:5011/proof/write-latency?samples=5
# → {"write_forwarding_enabled": true, "avg_write_ms": 82, ...}

curl http://localhost:5003/proof/write-latency?samples=5
# → {"write_forwarding_enabled": false, "avg_write_ms": 4, ...}`}</pre>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Project Links</h2>
              <div className="flex flex-col gap-2 text-sm">
                <a href="https://github.com/swa-roopa/event_ticketing_platform" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800">
                  <span>⊞</span> GitHub Repository
                </a>
                <a href="https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
                  <span>📄</span> Aurora Global DB Docs
                </a>
                <a href="https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 hover:text-green-800">
                  <span>📄</span> DynamoDB Global Tables Docs
                </a>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Use Case: Event Ticketing</h2>
              <p className="text-xs text-gray-600 mb-2">
                GlobalTix is a fictional global event platform used to stress-test these patterns.
              </p>
              <div className="text-xs text-gray-500 space-y-2">
                <div className="flex gap-2">
                  <span className="font-medium text-gray-700">Why ticketing?</span>
                  <span>High write contention (seat reservations), global users, and hard consistency requirements make it ideal for comparing these databases.</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-medium text-gray-700">The scenario:</span>
                  <span>A concert in London sells out. Users in Asia, Europe, and North America all try to book the last 100 seats simultaneously.</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Local Setup</h2>
              <div className="text-xs text-gray-600 space-y-2">
                <div>
                  <p className="font-medium text-gray-700 mb-0.5">Requirements</p>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-500">
                    <li>Docker + Docker Compose</li>
                    <li>Docker Buildx ≥ 0.17.0</li>
                    <li>Node.js 18+</li>
                    <li>Port 5010, 5011, 5002, 5003 free</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-gray-700 mb-0.5">Note on macOS</p>
                  <p className="text-gray-500">AirPlay Receiver uses port 5000. SQL apps run on 5010/5011 to avoid conflict. Disable AirPlay in System Settings → General → AirDrop & Handoff if needed.</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-indigo-800 mb-2">The Verdict</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">SQL:</span>
                  <span className="text-gray-700">Aurora Global DB provides write forwarding — useful but not active-active. Choose for strong consistency requirements.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">NoSQL:</span>
                  <span className="text-gray-700">DynamoDB Global Tables is true active-active. Local writes, async replication. Choose for lowest latency from any region.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
