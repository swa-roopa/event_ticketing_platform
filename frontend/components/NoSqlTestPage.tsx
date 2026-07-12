"use client"
import { useState } from "react"

type LatencyResult = {
  region: string
  avg_write_ms: number
  p50_write_ms: number
  p95_write_ms: number
  p99_write_ms: number
  latency_samples: number[]
  write_forwarding_enabled: boolean
  replication_lag_ms: number
  round_trips: number
  explanation: string
}

function SampleChart({ samples }: { samples: number[] }) {
  if (samples.length === 0) return <div className="h-20 flex items-center justify-center text-gray-300 text-sm">Run a test to see results</div>
  const max = Math.max(...samples) * 1.2 || 1
  return (
    <div className="flex items-end gap-1 h-20">
      {samples.map((v, i) => {
        const h = Math.max(4, (v / max) * 72)
        const color = v < 10 ? "bg-green-400" : v < 50 ? "bg-yellow-400" : "bg-red-400"
        return (
          <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
            <div className={`w-full rounded-t ${color}`} style={{ height: h }}></div>
            <span className="text-xs text-gray-400 font-mono">{Math.round(v)}</span>
          </div>
        )
      })}
    </div>
  )
}

type Props = {
  nosqlPrimaryUrl: string
  nosqlSecondaryUrl: string
}

export default function NoSqlTestPage({ nosqlPrimaryUrl, nosqlSecondaryUrl }: Props) {
  const [region, setRegion] = useState<"primary" | "secondary">("primary")
  const [samples, setSamples] = useState(10)
  const [result, setResult] = useState<LatencyResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState<Record<string, unknown> | null>(null)
  const [bookingLoading, setBookingLoading] = useState(false)

  const url = region === "primary" ? nosqlPrimaryUrl : nosqlSecondaryUrl

  async function runTest() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`${url}/proof/write-latency?samples=${samples}`)
      setResult(await res.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function bookTicket() {
    setBookingLoading(true)
    setBooking(null)
    try {
      const res = await fetch(`${url}/events/demo-event/reserve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: "demo-event", user_id: `user-${Date.now()}` }),
      })
      setBooking(await res.json())
    } catch (e) { console.error(e) }
    finally { setBookingLoading(false) }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 bg-white border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">NoSQL — DynamoDB Global Tables Write Test</h1>
        <p className="text-gray-500 text-sm mt-1">
          DynamoDB Global Tables: every region is a writer. Writes commit locally — no forwarding, no extra round trips.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1 flex flex-col gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Test Configuration</h2>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Region</label>
                  <select
                    value={region}
                    onChange={e => { setRegion(e.target.value as "primary" | "secondary"); setResult(null); setBooking(null) }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700"
                  >
                    <option value="primary">US-East-1 (Active Writer)</option>
                    <option value="secondary">US-East-2 (Active Writer)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Samples: {samples}</label>
                  <input type="range" min={3} max={20} value={samples} onChange={e => setSamples(+e.target.value)}
                    className="w-full accent-green-600" />
                </div>
                <button
                  onClick={runTest}
                  disabled={loading}
                  className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? "Running Test..." : "Run Latency Test"}
                </button>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-green-800 mb-2">✓ True Active-Active</h3>
              <p className="text-xs text-green-700">
                DynamoDB Global Tables allows writes to any region simultaneously. Each region maintains a local replica
                and syncs asynchronously. No region is &ldquo;primary&rdquo; — all are equal writers.
              </p>
            </div>

            {result && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Results</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Avg", value: result.avg_write_ms },
                    { label: "P50", value: result.p50_write_ms },
                    { label: "P95", value: result.p95_write_ms },
                    { label: "P99", value: result.p99_write_ms },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                      <div className={`text-sm font-bold font-mono ${value < 10 ? "text-green-600" : value < 50 ? "text-yellow-600" : "text-red-500"}`}>{value} ms</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <div className="flex justify-between mb-1"><span>Write Forwarding</span><span className="text-green-600 font-medium">NO</span></div>
                  <div className="flex justify-between mb-1"><span>Round Trips</span><span className="font-medium text-green-600">{result.round_trips} (none)</span></div>
                  <div className="flex justify-between"><span>Async Replication</span><span className="font-medium">{result.replication_lag_ms} ms</span></div>
                </div>
              </div>
            )}
          </div>

          <div className="col-span-2 flex flex-col gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Latency Samples (Bar Chart)</h2>
              <SampleChart samples={result?.latency_samples ?? []} />
              {result && (
                <div className="flex gap-3 mt-3 text-xs">
                  <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-400"></div>&lt; 10ms (local)</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-400"></div>10–50ms</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-400"></div>&gt; 50ms</span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Conditional Write — Ticket Reservation</h2>
              <p className="text-xs text-gray-500 mb-3">
                Uses <code className="bg-gray-100 px-1 rounded">ConditionExpression</code> to prevent double-booking.
                DynamoDB throws <code className="bg-gray-100 px-1 rounded">ConditionalCheckFailedException</code> on conflict.
              </p>
              <button
                onClick={bookTicket}
                disabled={bookingLoading}
                className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 mb-3"
              >
                {bookingLoading ? "Booking..." : "Reserve Ticket (Conditional Write)"}
              </button>
              {booking && (
                <div className={`p-3 rounded-lg text-xs ${(booking as any).success === false ? "bg-orange-50 border border-orange-200" : "bg-green-50 border border-green-200"}`}>
                  {(booking as any).success === false
                    ? <><strong className="text-orange-700">Conflict!</strong> <span className="text-orange-600">Ticket already reserved — ConditionalCheckFailedException caught.</span></>
                    : <><strong className="text-green-700">Confirmed!</strong> <span className="text-green-600">Booking: {(booking as any).booking_id}</span></>}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">How DynamoDB Global Tables Works</h2>
              <div className="grid grid-cols-2 gap-6 text-xs">
                <div>
                  <p className="font-medium text-green-700 mb-2">Write to Any Region</p>
                  <div className="flex flex-col gap-1.5">
                    {[
                      "Client → DynamoDB US-East-2",
                      "Commit locally (single-digit ms)",
                      "Async replication → US-East-1",
                      "Client gets response immediately",
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                        <span className="text-gray-600">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-yellow-700 mb-2">Conflict Resolution</p>
                  <div className="flex flex-col gap-1.5 text-gray-600">
                    <p>Simultaneous writes to both regions may conflict. DynamoDB uses <strong>last-writer-wins (LWW)</strong> based on timestamp.</p>
                    <p className="mt-1">For ticketing, use conditional expressions to detect conflicts before they replicate.</p>
                    <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-2 font-mono text-xs text-yellow-800">
                      attribute_not_exists(booking_id)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
