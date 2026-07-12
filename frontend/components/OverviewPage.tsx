"use client"
import { useState, useEffect, useCallback } from "react"

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
  write_executed_in?: string
  warning?: string
  note?: string
  error?: string
}

function LatencyValue({ ms }: { ms: number | null }) {
  if (ms === null) return <span className="text-gray-400">—</span>
  const color = ms < 10 ? "text-green-600" : ms < 50 ? "text-yellow-600" : "text-red-500"
  return <span className={`font-mono font-bold ${color}`}>{ms} ms</span>
}

function ConnectedBadge() {
  return (
    <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
      <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
      Connected
    </span>
  )
}

function LatencyLineChart({ sqlSamples, nosqlSamples }: { sqlSamples: number[], nosqlSamples: number[] }) {
  const width = 420
  const height = 200
  const pad = { top: 24, right: 12, bottom: 24, left: 36 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom

  const allVals = [...sqlSamples, ...nosqlSamples].filter(v => v > 0)
  const rawMax = allVals.length ? Math.max(...allVals) : 100
  // round up to a nice number for clean tick labels
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)))
  const niceMax = Math.ceil(rawMax / magnitude) * magnitude
  const minVal = 0

  function toX(i: number, total: number) {
    return pad.left + (i / Math.max(total - 1, 1)) * chartW
  }
  function toY(v: number) {
    return pad.top + chartH - ((v - minVal) / (niceMax - minVal)) * chartH
  }
  function makePath(samples: number[]) {
    if (samples.length === 0) return ""
    return samples.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i, samples.length)},${toY(v)}`).join(" ")
  }

  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round(niceMax * i / 4))

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* grid + y-axis labels */}
      {yTicks.map(t => (
        <g key={t}>
          <line x1={pad.left} y1={toY(t)} x2={width - pad.right} y2={toY(t)} stroke={t === 0 ? "#d1d5db" : "#e5e7eb"} strokeWidth="1" />
          <text x={pad.left - 6} y={toY(t) + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{t}</text>
        </g>
      ))}
      {/* x-axis sample labels */}
      {(sqlSamples.length > 0 ? sqlSamples : nosqlSamples).map((_, i) => (
        <text key={i} x={toX(i, Math.max(sqlSamples.length, nosqlSamples.length))} y={height - 6} textAnchor="middle" fontSize="8" fill="#d1d5db">{i + 1}</text>
      ))}
      {/* lines */}
      {sqlSamples.length > 1 && <path d={makePath(sqlSamples)} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />}
      {nosqlSamples.length > 1 && <path d={makePath(nosqlSamples)} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" />}
      {/* dots */}
      {sqlSamples.map((v, i) => (
        <circle key={i} cx={toX(i, sqlSamples.length)} cy={toY(v)} r="2.5" fill="#3b82f6" />
      ))}
      {nosqlSamples.map((v, i) => (
        <circle key={i} cx={toX(i, nosqlSamples.length)} cy={toY(v)} r="2.5" fill="#22c55e" />
      ))}
      {/* inline labels */}
      {sqlSamples.length > 0 && (
        <text x={width - pad.right} y={pad.top - 10} textAnchor="end" fontSize="9" fill="#3b82f6">
          SQL p95 {Math.round(Math.max(...sqlSamples))} ms
        </text>
      )}
      {nosqlSamples.length > 0 && (
        <text x={width - pad.right} y={pad.top - 1} textAnchor="end" fontSize="9" fill="#22c55e">
          NoSQL p95 {Math.round(Math.max(...nosqlSamples))} ms
        </text>
      )}
    </svg>
  )
}

function WriteFlowDiagram({ isSql, isSecondary }: { isSql: boolean; isSecondary: boolean }) {
  /* Layout (viewBox 340 × 110):
     - Boxes span y=32..82 (height 50)
     - Labels ABOVE boxes: y ≤ 26  → never overlap box content
     - Labels BELOW boxes: y ≥ 90  → same
     - Gap between region boxes: x=175..215 (40px) — arrows only, no text
  */
  if (isSql) {
    return (
      <svg viewBox="0 0 340 110" className="w-full">
        <defs>
          <marker id="wf-gray" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#6b7280" />
          </marker>
          <marker id="wf-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#ef4444" />
          </marker>
        </defs>
        {/* Client */}
        <rect x="10" y="42" width="60" height="28" rx="6" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5"/>
        <text x="40" y="60" textAnchor="middle" fontSize="10" fill="#1d4ed8">Client</text>
        {/* US-East-2 (secondary — selected) */}
        <rect x="90" y="32" width="85" height="50" rx="6" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5"/>
        <text x="132" y="52" textAnchor="middle" fontSize="9" fill="#92400e">US-East-2</text>
        <text x="132" y="65" textAnchor="middle" fontSize="8" fill="#b45309">(Selected) ⚠</text>
        {/* US-East-1 (primary writer) */}
        <rect x="215" y="32" width="115" height="50" rx="6" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5"/>
        <text x="272" y="52" textAnchor="middle" fontSize="9" fill="#1e40af">US-East-1</text>
        <text x="272" y="65" textAnchor="middle" fontSize="8" fill="#1e40af">Primary Writer</text>
        {/* Client → US-East-2 */}
        <line x1="70" y1="56" x2="88" y2="56" stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#wf-gray)"/>
        {/* Write Fwd arrow (red) — label ABOVE boxes */}
        <text x="195" y="22" textAnchor="middle" fontSize="8" fontWeight="600" fill="#ef4444">Write Forwarded →</text>
        <line x1="175" y1="50" x2="213" y2="50" stroke="#ef4444" strokeWidth="1.5" markerEnd="url(#wf-red)"/>
        {/* Response arrow (dashed) — label BELOW boxes */}
        <line x1="213" y1="66" x2="175" y2="66" stroke="#6b7280" strokeWidth="1" strokeDasharray="3,2" markerEnd="url(#wf-gray)"/>
        <text x="195" y="96" textAnchor="middle" fontSize="8" fill="#6b7280">← Response</text>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 340 110" className="w-full">
      <defs>
        <marker id="wf-gray2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#6b7280" />
        </marker>
        <marker id="wf-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#22c55e" />
        </marker>
      </defs>
      {/* Client */}
      <rect x="10" y="42" width="60" height="28" rx="6" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5"/>
      <text x="40" y="60" textAnchor="middle" fontSize="10" fill="#1d4ed8">Client</text>
      {/* US-East-2 (local write) */}
      <rect x="90" y="32" width="85" height="50" rx="6" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5"/>
      <text x="132" y="52" textAnchor="middle" fontSize="9" fill="#15803d">US-East-2</text>
      <text x="132" y="64" textAnchor="middle" fontSize="8" fill="#15803d">✓ Write Local</text>
      {/* US-East-1 (replicated) */}
      <rect x="215" y="32" width="115" height="50" rx="6" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5"/>
      <text x="272" y="52" textAnchor="middle" fontSize="9" fill="#15803d">US-East-1</text>
      <text x="272" y="65" textAnchor="middle" fontSize="8" fill="#15803d">(Replicated)</text>
      {/* Client → US-East-2 */}
      <line x1="70" y1="56" x2="88" y2="56" stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#wf-gray2)"/>
      {/* Async replication arrow — label ABOVE boxes */}
      <text x="195" y="22" textAnchor="middle" fontSize="8" fontWeight="600" fill="#16a34a">Async Replication →</text>
      <line x1="175" y1="58" x2="213" y2="58" stroke="#22c55e" strokeWidth="1" strokeDasharray="4,2" markerEnd="url(#wf-green)"/>
      {/* Background label BELOW boxes */}
      <text x="195" y="96" textAnchor="middle" fontSize="8" fill="#16a34a">~300ms (background)</text>
    </svg>
  )
}

function TimelineViz({ sqlResult, nosqlResult, sqlRegion }: {
  sqlResult: LatencyResult | null
  nosqlResult: LatencyResult | null
  sqlRegion: "primary" | "secondary"
}) {
  const sqlAvg = sqlResult?.avg_write_ms ?? null
  const nosqlAvg = nosqlResult?.avg_write_ms ?? null

  const sqlSteps = sqlAvg !== null
    ? sqlRegion === "secondary"
      ? [
          { label: "Request Received", ms: 0 },
          { label: "Forward to Primary", ms: 3 },
          { label: "Commit on Primary", ms: Math.round(sqlAvg * 0.9) },
          { label: "Response to Client", ms: Math.round(sqlAvg) },
        ]
      : [
          { label: "Request Received", ms: 0 },
          { label: "Commit Locally", ms: Math.round(sqlAvg * 0.8) },
          { label: "Response to Client", ms: Math.round(sqlAvg) },
        ]
    : []

  const nosqlSteps = nosqlAvg !== null
    ? [
        { label: "Request Received", ms: 0 },
        { label: "Commit Locally", ms: Math.round(nosqlAvg * 0.8) },
        { label: "Response to Client", ms: Math.round(nosqlAvg) },
        { label: "Replicated to Other Region", ms: Math.round(nosqlAvg) + 300 },
      ]
    : []

  function StepRow({ steps, color }: { steps: { label: string; ms: number }[]; color: string }) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <span className={`text-xs font-mono ${color}`}>{s.ms} ms</span>
              <div className={`w-2 h-2 rounded-full ${color === "text-blue-600" ? "bg-blue-500" : "bg-green-500"}`}></div>
              <span className="text-xs text-gray-500 text-center max-w-16 leading-tight">{s.label}</span>
            </div>
            {i < steps.length - 1 && <span className="text-gray-300 text-xs mb-4">→</span>}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-xs font-medium text-gray-700">Aurora Global DB (SQL)</span>
        </div>
        {sqlSteps.length > 0
          ? <StepRow steps={sqlSteps} color="text-blue-600" />
          : <p className="text-xs text-gray-400 italic">Run SQL latency test to see timeline</p>}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-xs font-medium text-gray-700">DynamoDB Global Tables (NoSQL)</span>
        </div>
        {nosqlSteps.length > 0
          ? <StepRow steps={nosqlSteps} color="text-green-600" />
          : <p className="text-xs text-gray-400 italic">Run NoSQL latency test to see timeline</p>}
      </div>
    </div>
  )
}

function ComparisonTable({ sqlResult, nosqlResult }: { sqlResult: LatencyResult | null; nosqlResult: LatencyResult | null }) {
  type Row = { label: string; sqlVal: string; nosqlVal: string; sqlBad?: boolean }
  const rows: Row[] = [
    {
      label: "Average Latency",
      sqlVal: sqlResult ? `${sqlResult.avg_write_ms} ms` : "—",
      nosqlVal: nosqlResult ? `${nosqlResult.avg_write_ms} ms` : "—",
      sqlBad: sqlResult ? sqlResult.avg_write_ms > 50 : false,
    },
    {
      label: "P95 Latency",
      sqlVal: sqlResult ? `${sqlResult.p95_write_ms} ms` : "—",
      nosqlVal: nosqlResult ? `${nosqlResult.p95_write_ms ?? "—"} ms` : "—",
      sqlBad: sqlResult ? sqlResult.p95_write_ms > 50 : false,
    },
    {
      label: "P99 Latency",
      sqlVal: sqlResult ? `${sqlResult.p99_write_ms} ms` : "—",
      nosqlVal: nosqlResult ? `${nosqlResult.p99_write_ms} ms` : "—",
      sqlBad: sqlResult ? sqlResult.p99_write_ms > 50 : false,
    },
    {
      label: "Round Trips",
      sqlVal: sqlResult ? `${sqlResult.round_trips}` : "—",
      nosqlVal: nosqlResult ? `${nosqlResult.round_trips ?? 0}` : "—",
      sqlBad: sqlResult ? sqlResult.round_trips > 0 : false,
    },
    {
      label: "Write Behavior",
      sqlVal: sqlResult ? (sqlResult.write_forwarding_enabled ? "Forwarded" : "Local") : "—",
      nosqlVal: nosqlResult ? "Local" : "—",
      sqlBad: sqlResult ? sqlResult.write_forwarding_enabled : false,
    },
    {
      label: "Consistency",
      sqlVal: "Strong (ACID)",
      nosqlVal: "Eventually Consistent",
      sqlBad: false,
    },
  ]

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-gray-100">
          <th className="text-left py-1.5 text-gray-500 font-medium">Metric</th>
          <th className="text-center py-1.5 text-blue-600 font-medium">Aurora (SQL)</th>
          <th className="text-center py-1.5 text-green-600 font-medium">DynamoDB (NoSQL)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-gray-50">
            <td className="py-1.5 text-gray-600">{row.label}</td>
            <td className={`py-1.5 text-center font-mono ${row.sqlBad ? "text-red-500" : "text-gray-700"}`}>{row.sqlVal}</td>
            <td className="py-1.5 text-center font-mono text-green-600">{row.nosqlVal}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

type Props = {
  sqlPrimaryUrl: string
  sqlSecondaryUrl: string
  nosqlPrimaryUrl: string
  nosqlSecondaryUrl: string
}

export default function OverviewPage({ sqlPrimaryUrl, sqlSecondaryUrl, nosqlPrimaryUrl, nosqlSecondaryUrl }: Props) {
  const [sqlRegion, setSqlRegion] = useState<"primary" | "secondary">("primary")
  const [nosqlRegion, setNosqlRegion] = useState<"primary" | "secondary">("primary")
  const [sqlResult, setSqlResult] = useState<LatencyResult | null>(null)
  const [nosqlResult, setNosqlResult] = useState<LatencyResult | null>(null)
  const [sqlLoading, setSqlLoading] = useState(false)
  const [nosqlLoading, setNosqlLoading] = useState(false)
  const [sqlBooking, setSqlBooking] = useState<BookingResult | null>(null)
  const [nosqlBooking, setNosqlBooking] = useState<BookingResult | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const sqlUrl = sqlRegion === "primary" ? sqlPrimaryUrl : sqlSecondaryUrl
  const nosqlUrl = nosqlRegion === "primary" ? nosqlPrimaryUrl : nosqlSecondaryUrl

  const runSqlTest = useCallback(async () => {
    setSqlLoading(true)
    try {
      const res = await fetch(`${sqlUrl}/proof/write-latency?samples=10`)
      const data = await res.json()
      setSqlResult(data)
      setLastUpdated(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setSqlLoading(false)
    }
  }, [sqlUrl])

  const runNosqlTest = useCallback(async () => {
    setNosqlLoading(true)
    try {
      const res = await fetch(`${nosqlUrl}/proof/write-latency?samples=10`)
      const data = await res.json()
      setNosqlResult(data)
      setLastUpdated(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setNosqlLoading(false)
    }
  }, [nosqlUrl])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      runSqlTest()
      runNosqlTest()
    }, 10000)
    return () => clearInterval(interval)
  }, [autoRefresh, runSqlTest, runNosqlTest])

  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  async function bookSql(type: "sync" | "async") {
    setSqlLoading(true)
    setSqlBooking(null)
    try {
      const endpoint = type === "sync" ? "/proof/book-sync" : "/proof/book-async"
      const res = await fetch(`${sqlUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: "demo-event", user_id: "demo-user" }),
      })
      const data = await res.json()
      setSqlBooking(data)

      // Auto-poll for async booking until confirmed
      if (type === "async" && data.poll_url && data.status === "pending") {
        const pollUrl = `${sqlUrl}${data.poll_url}`
        const poll = async () => {
          await new Promise(r => setTimeout(r, 1000))
          try {
            const statusRes = await fetch(pollUrl)
            const statusData = await statusRes.json()
            setSqlBooking(statusData)
            if (statusData.status === "pending") poll()
          } catch { /* ignore */ }
        }
        poll()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSqlLoading(false)
    }
  }

  async function bookNosql() {
    setNosqlLoading(true)
    setNosqlBooking(null)
    try {
      const res = await fetch(`${nosqlUrl}/events/demo-event/reserve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: "demo-event", user_id: "demo-user" }),
      })
      setNosqlBooking(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setNosqlLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 bg-white border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Active-Active Multi-Region: SQL vs NoSQL</h1>
        <p className="text-gray-500 text-sm mt-1">
          Run the same workload from different regions and see how SQL (Aurora Global DB) and NoSQL (DynamoDB Global Tables) handle writes.
        </p>
        <div className="flex gap-3 mt-3">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">&lt; 10ms — Local write</span>
          <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-medium">10–50ms — Acceptable</span>
          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium">&gt; 50ms — Forwarding overhead</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        {/* Booking Pattern Explainer */}
        <div className="mb-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">How Ticket Booking Works Across Regions</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-orange-700 mb-1">⚡ Sync Booking (SQL)</p>
              <p className="text-xs text-gray-600 leading-relaxed">User waits for the full DB write to complete. From a secondary region the write is <span className="font-medium text-orange-600">forwarded to the primary</span>, adding ~80ms cross-region overhead before confirmation is returned.</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-700 mb-1">📨 Async Booking (SQL + SQS)</p>
              <p className="text-xs text-gray-600 leading-relaxed">The write is <span className="font-medium text-green-600">queued instantly (~3ms)</span> and the user gets an immediate acknowledgment. A Lambda consumer processes it in ~2s. The frontend auto-polls until the status flips to confirmed.</p>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-purple-700 mb-1">🔒 Conditional Write (DynamoDB)</p>
              <p className="text-xs text-gray-600 leading-relaxed">DynamoDB uses a <span className="font-medium text-purple-600">conditional write</span> to atomically reserve the ticket. If two regions race to book the same seat, the second write is rejected locally — no cross-region round trip needed.</p>
            </div>
          </div>
        </div>

        {/* Top cards */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* SQL Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-blue-600 text-lg">🗄</span>
                  <h2 className="text-base font-bold text-blue-600">SQL — Aurora Global DB</h2>
                </div>
                <p className="text-xs text-gray-500">Amazon Aurora Global Database</p>
              </div>
              <ConnectedBadge />
            </div>
            <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
              <span>Primary Writer: <strong className="text-gray-700">🇺🇸 US-East-1 (N. Virginia)</strong></span>
              <span>Selected Region:
                <select
                  value={sqlRegion}
                  onChange={e => { setSqlRegion(e.target.value as "primary" | "secondary"); setSqlResult(null); setSqlBooking(null) }}
                  className="ml-1 border border-gray-200 rounded px-1 py-0.5 text-xs text-gray-700 bg-white"
                >
                  <option value="primary">🇺🇸 US-East-1 (N. Virginia)</option>
                  <option value="secondary">🇺🇸 US-East-2 (Ohio)</option>
                </select>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Write Behavior</div>
                <span className={`text-xs px-2 py-1 rounded font-medium ${sqlRegion === "secondary" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                  {sqlRegion === "secondary" ? "Forwarded to Primary" : "Local Write"}
                </span>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Avg Latency</div>
                <div className="text-sm font-bold"><LatencyValue ms={sqlResult?.avg_write_ms ?? null} /></div>
                {sqlResult && <div className="text-xs text-gray-400">p95 {sqlResult.p95_write_ms} ms | p99 {sqlResult.p99_write_ms} ms</div>}
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Replication Lag</div>
                <div className="text-sm font-bold text-gray-700">{sqlResult ? `${sqlResult.replication_lag_ms} ms` : "—"}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Round Trips</div>
                <div className="text-sm font-bold text-gray-700">{sqlResult !== null ? sqlResult.round_trips : "—"}</div>
                <div className="text-xs text-gray-400">{sqlResult && sqlResult.round_trips > 0 ? "(Writer forwarding)" : sqlResult ? "(Local)" : ""}</div>
              </div>
            </div>
            <button
              onClick={runSqlTest}
              disabled={sqlLoading}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 mb-2"
            >
              {sqlLoading ? "Running..." : "Run Write Latency Test (10 samples)"}
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => bookSql("sync")}
                disabled={sqlLoading}
                className="flex-1 py-1.5 bg-orange-500 text-white rounded text-xs font-medium hover:bg-orange-600 disabled:opacity-50"
              >
                ⚡ Book (sync)<br /><span className="text-orange-200 font-normal">Immediate confirmation</span>
              </button>
              <button
                onClick={() => bookSql("async")}
                disabled={sqlLoading}
                className="flex-1 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
              >
                📨 Book (async / SQS)<br /><span className="text-green-200 font-normal">Queued via SQS (~3ms)</span>
              </button>
            </div>
            {sqlBooking && (
              <div className={`mt-2 p-2 rounded text-xs ${sqlBooking.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}>
                Status: <strong>{sqlBooking.status ?? sqlBooking.error}</strong>
                {sqlBooking.user_wait_ms !== undefined && <span className="ml-2">User waited: {sqlBooking.user_wait_ms} ms</span>}
                {(sqlBooking.warning ?? sqlBooking.note) && <span className="ml-2 text-gray-500 italic">{sqlBooking.warning ?? sqlBooking.note}</span>}
              </div>
            )}
          </div>

          {/* NoSQL Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-green-600 text-lg">⚡</span>
                  <h2 className="text-base font-bold text-green-600">NoSQL — DynamoDB Global Tables</h2>
                </div>
                <p className="text-xs text-gray-500">Amazon DynamoDB Global Tables</p>
              </div>
              <ConnectedBadge />
            </div>
            <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
              <span>Selected Region:
                <select
                  value={nosqlRegion}
                  onChange={e => { setNosqlRegion(e.target.value as "primary" | "secondary"); setNosqlResult(null); setNosqlBooking(null) }}
                  className="ml-1 border border-gray-200 rounded px-1 py-0.5 text-xs text-gray-700 bg-white"
                >
                  <option value="primary">🇺🇸 US-East-1 (N. Virginia)</option>
                  <option value="secondary">🇺🇸 US-East-2 (Ohio)</option>
                </select>
              </span>
              <span>Replication: <strong className="text-green-600">Multi-region (Active-Active)</strong></span>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Write Behavior</div>
                <span className="text-xs px-2 py-1 rounded font-medium bg-green-100 text-green-700">Local Write</span>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Avg Latency</div>
                <div className="text-sm font-bold"><LatencyValue ms={nosqlResult?.avg_write_ms ?? null} /></div>
                {nosqlResult && <div className="text-xs text-gray-400">p95 {nosqlResult.p95_write_ms} ms | p99 {nosqlResult.p99_write_ms} ms</div>}
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Replication Lag</div>
                <div className="text-sm font-bold text-gray-700">{nosqlResult ? `${nosqlResult.replication_lag_ms} ms` : "—"}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Round Trips</div>
                <div className="text-sm font-bold text-gray-700">{nosqlResult !== null ? nosqlResult.round_trips : "—"}</div>
                <div className="text-xs text-gray-400">{nosqlResult ? "(No forwarding)" : ""}</div>
              </div>
            </div>
            <button
              onClick={runNosqlTest}
              disabled={nosqlLoading}
              className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 mb-2"
            >
              {nosqlLoading ? "Running..." : "Run Write Latency Test (10 samples)"}
            </button>
            <button
              onClick={bookNosql}
              disabled={nosqlLoading}
              className="w-full py-1.5 bg-orange-500 text-white rounded text-xs font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              ⚡ Book (sync) — Immediate confirmation (local)
            </button>
            {nosqlBooking && (
              <div className={`mt-2 p-2 rounded text-xs ${nosqlBooking.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}>
                Status: <strong>{
                  (nosqlBooking as any).success === true
                    ? (nosqlBooking.status ?? "confirmed")
                    : ((nosqlBooking as any).error ?? "error")
                }</strong>
              </div>
            )}
          </div>
        </div>

        {/* Bottom 3-column grid — flat 6-cell grid so rows align across columns */}
        <div className="grid grid-cols-3 gap-4">
          {/* Row 1, Col 1: Write Flow */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Write Flow Visualization</h3>
            <div className="mb-2">
              <p className="text-xs font-medium text-blue-600 mb-1">Aurora Global DB (Write Forwarding)</p>
              <WriteFlowDiagram isSql={true} isSecondary={sqlRegion === "secondary"} />
            </div>
            <div>
              <p className="text-xs font-medium text-green-600 mb-1">DynamoDB Global Tables (Local Write)</p>
              <WriteFlowDiagram isSql={false} isSecondary={nosqlRegion === "secondary"} />
            </div>
          </div>

          {/* Row 1, Col 2: Live Latency */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Live Latency (Last 10 Samples)</h3>
            {(sqlResult?.latency_samples?.length ?? 0) > 0 || (nosqlResult?.latency_samples?.length ?? 0) > 0 ? (
              <>
                <LatencyLineChart
                  sqlSamples={sqlResult?.latency_samples ?? []}
                  nosqlSamples={nosqlResult?.latency_samples ?? []}
                />
                <div className="flex gap-4 mt-1">
                  <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-blue-500"></div><span className="text-xs text-gray-500">Aurora (SQL)</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-green-500"></div><span className="text-xs text-gray-500">DynamoDB (NoSQL)</span></div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                <svg className="w-8 h-8 mb-2 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <p className="text-xs">Run a latency test above to see data</p>
              </div>
            )}
          </div>

          {/* Row 1, Col 3: Latency Results */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Latency Results (Latest Run)</h3>
            <ComparisonTable sqlResult={sqlResult} nosqlResult={nosqlResult} />
          </div>

          {/* Row 2, Col 1: Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Timeline (Single Write Request)</h3>
            <TimelineViz sqlResult={sqlResult} nosqlResult={nosqlResult} sqlRegion={sqlRegion} />
          </div>

          {/* Row 2, Col 2: Architecture Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Architecture Overview</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="font-medium text-blue-600 mb-1">Aurora Global Database</p>
                <div className="border border-blue-100 rounded p-2 bg-blue-50 text-center text-xs text-gray-600">
                  App<br />↓<br />
                  <span className="text-blue-700 font-medium">US-East-2 (Reader)</span><br />
                  ↓ Write Forwarding<br />
                  <span className="text-blue-700 font-medium">US-East-1 (Writer)</span><br />
                  Shared Storage
                </div>
              </div>
              <div>
                <p className="font-medium text-green-600 mb-1">DynamoDB Global Tables</p>
                <div className="border border-green-100 rounded p-2 bg-green-50 text-center text-xs text-gray-600">
                  App<br />↓<br />
                  <span className="text-green-700 font-medium">US-East-2 (RW)</span><br />
                  ↕ Async Replication<br />
                  <span className="text-green-700 font-medium">US-East-1 (RW)</span><br />
                  Fully Managed Multi-Master
                </div>
              </div>
            </div>
          </div>

          {/* Row 2, Col 3: Key Takeaways */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Key Takeaways</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="font-medium text-blue-600 mb-1 flex items-center gap-1">🗄 Aurora Global DB (SQL)</p>
                <ul className="text-gray-600 space-y-1 list-disc list-inside">
                  <li>Strong consistency with ACID</li>
                  <li>Cross-region writes forwarded to primary</li>
                  <li>Higher latency for remote writes</li>
                  <li>Ideal for transactional workloads</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-green-600 mb-1 flex items-center gap-1">⚡ DynamoDB Global Tables</p>
                <ul className="text-gray-600 space-y-1 list-disc list-inside">
                  <li>Local writes with low latency</li>
                  <li>Async replication across regions</li>
                  <li>Eventually consistent</li>
                  <li>Ideal for high-scale, low-latency</li>
                </ul>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500 italic">
              ☆ Choose based on your priority: Consistency (SQL) vs Low Latency & Availability (NoSQL)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
          </div>
        </div>
      </div>
    </div>
  )
}
