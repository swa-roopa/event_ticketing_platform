"use client"
import { useState } from "react"

type LatencyResult = {
  region: string
  role?: string
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

type BookingResult = {
  booking_id?: string
  status?: string
  write_latency_ms?: number
  user_wait_ms?: number
  queue_latency_ms?: number
  write_executed_in?: string
  poll_url?: string
  warning?: string
  note?: string
  error?: string
}

function LatencyBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }}></div>
      </div>
      <span className="text-xs font-mono w-14 text-right text-gray-700">{value} ms</span>
    </div>
  )
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
  sqlPrimaryUrl: string
  sqlSecondaryUrl: string
}

export default function SqlTestPage({ sqlPrimaryUrl, sqlSecondaryUrl }: Props) {
  const [region, setRegion] = useState<"primary" | "secondary">("primary")
  const [samples, setSamples] = useState(10)
  const [result, setResult] = useState<LatencyResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState<BookingResult | null>(null)
  const [bookingType, setBookingType] = useState<"sync" | "async" | null>(null)
  const [bookingLoading, setBookingLoading] = useState(false)

  const url = region === "primary" ? sqlPrimaryUrl : sqlSecondaryUrl

  async function runTest() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`${url}/proof/write-latency?samples=${samples}`)
      setResult(await res.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function bookTicket(type: "sync" | "async") {
    setBookingLoading(true)
    setBooking(null)
    setBookingType(type)
    try {
      const endpoint = type === "sync" ? "/proof/book-sync" : "/proof/book-async"
      const res = await fetch(`${url}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: "demo-event", user_id: "demo-user" }),
      })
      setBooking(await res.json())
    } catch (e) { console.error(e) }
    finally { setBookingLoading(false) }
  }

  const maxLatency = result ? Math.max(...result.latency_samples) * 1.1 : 100

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 bg-white border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">SQL — Aurora Global DB Write Test</h1>
        <p className="text-gray-500 text-sm mt-1">
          Aurora Global Database write-forwarding: writes from secondary regions are proxied to the single primary writer.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        <div className="grid grid-cols-3 gap-4">
          {/* Left: Config + Result */}
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
                    <option value="primary">US-East-1 (Primary Writer)</option>
                    <option value="secondary">US-East-2 (Secondary, write-forwarding)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Samples: {samples}</label>
                  <input type="range" min={3} max={20} value={samples} onChange={e => setSamples(+e.target.value)}
                    className="w-full accent-blue-600" />
                </div>
                <button
                  onClick={runTest}
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Running Test..." : "Run Latency Test"}
                </button>
              </div>
            </div>

            {region === "secondary" && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-orange-800 mb-2">⚠ Write Forwarding Active</h3>
                <p className="text-xs text-orange-700">
                  Writes from US-East-2 are forwarded to US-East-1 (primary). This adds cross-region round-trip latency to every write.
                  Aurora Global DB write forwarding is <strong>NOT active-active</strong> — only the primary can commit writes.
                </p>
              </div>
            )}

            {region === "primary" && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-green-800 mb-2">✓ Primary Writer</h3>
                <p className="text-xs text-green-700">
                  Writes commit locally on this node. No forwarding overhead. This is the single writer for the entire Aurora Global cluster.
                </p>
              </div>
            )}

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
                  <div className="flex justify-between mb-1"><span>Write Forwarding</span><span className={result.write_forwarding_enabled ? "text-orange-600 font-medium" : "text-green-600 font-medium"}>{result.write_forwarding_enabled ? "YES" : "NO"}</span></div>
                  <div className="flex justify-between mb-1"><span>Round Trips</span><span className="font-medium">{result.round_trips}</span></div>
                  <div className="flex justify-between"><span>Replication Lag</span><span className="font-medium">{result.replication_lag_ms} ms</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Charts + Booking */}
          <div className="col-span-2 flex flex-col gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Latency Samples (Bar Chart)</h2>
              <SampleChart samples={result?.latency_samples ?? []} />
              {result && (
                <div className="flex gap-3 mt-3 text-xs">
                  <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-400"></div>&lt; 10ms (local)</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-400"></div>10–50ms</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-400"></div>&gt; 50ms (forwarding)</span>
                </div>
              )}
            </div>

            {result && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Percentile Breakdown</h2>
                <div className="flex flex-col gap-3">
                  {[
                    { label: "Average", value: result.avg_write_ms },
                    { label: "P50 (median)", value: result.p50_write_ms },
                    { label: "P95", value: result.p95_write_ms },
                    { label: "P99", value: result.p99_write_ms },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{label}</span>
                      </div>
                      <LatencyBar value={value} max={maxLatency} color={value < 10 ? "bg-green-500" : value < 50 ? "bg-yellow-500" : "bg-red-500"} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Booking Simulation</h2>
              <p className="text-xs text-gray-500 mb-3">
                Book a ticket using the selected region. Sync waits for confirmation; async queues via SQS (3ms user wait).
              </p>
              <div className="flex gap-3 mb-3">
                <button
                  onClick={() => bookTicket("sync")}
                  disabled={bookingLoading}
                  className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
                >
                  ⚡ Sync Booking (user waits)
                </button>
                <button
                  onClick={() => bookTicket("async")}
                  disabled={bookingLoading}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  📨 Async via SQS (3ms wait)
                </button>
              </div>
              {booking && (
                <div className={`p-3 rounded-lg text-sm ${booking.error ? "bg-red-50 border border-red-200" : "bg-gray-50 border border-gray-200"}`}>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {booking.booking_id && <div><span className="text-gray-500">Booking ID:</span> <span className="font-mono text-gray-700">{booking.booking_id.split("-")[0]}...</span></div>}
                    {booking.status && <div><span className="text-gray-500">Status:</span> <span className={`font-medium ${booking.status === "confirmed" ? "text-green-600" : booking.status === "pending" ? "text-yellow-600" : "text-red-600"}`}>{booking.status}</span></div>}
                    {booking.user_wait_ms !== undefined && <div><span className="text-gray-500">User waited:</span> <span className="font-mono font-medium">{booking.user_wait_ms} ms</span></div>}
                    {booking.queue_latency_ms !== undefined && <div><span className="text-gray-500">Queue time:</span> <span className="font-mono font-medium">{booking.queue_latency_ms} ms</span></div>}
                    {booking.write_executed_in && <div><span className="text-gray-500">Write region:</span> <span className="font-medium">{booking.write_executed_in}</span></div>}
                    {(booking.warning ?? booking.note) && <div className="col-span-2 mt-1 text-gray-500 italic">{booking.warning ?? booking.note}</div>}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Write Architecture</h2>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-medium text-blue-700 mb-2">Write from Primary (US-East-1)</p>
                  <div className="flex flex-col gap-1">
                    {["Client → US-East-1 Writer", "Commit Locally", "Replicate to US-East-2 (async)", "Response ← 5–15ms"].map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                        <span className="text-gray-600">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-orange-700 mb-2">Write from Secondary (US-East-2)</p>
                  <div className="flex flex-col gap-1">
                    {["Client → US-East-2 (Reader)", "Forward Write to US-East-1", "Commit on Primary", "Response ← US-East-1 → Client (~80ms)"].map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                        <span className="text-gray-600">{s}</span>
                      </div>
                    ))}
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
