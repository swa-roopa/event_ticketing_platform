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


function LatencyLineChart({ sqlSamples, nosqlSamples }: { sqlSamples: number[], nosqlSamples: number[] }) {
  const width = 520
  const height = 100
  const pad = { top: 22, right: 50, bottom: 18, left: 40 }
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
  /* Simple flat layout (viewBox 360 × 120):
     - Nodes: single line region name inside, role/caption sits BELOW the box
     - One accent color per diagram (blue for SQL, green for NoSQL)
     - Arrow labels ABOVE, captions BELOW — no text touches the boxes
  */
  const accent = isSql ? "#2563eb" : "#16a34a"
  const flowLabel = isSql ? "Write forwarded →" : "Async replication →"

  return (
    <svg viewBox="0 0 360 120" className="w-full" fontFamily="ui-sans-serif, system-ui, sans-serif">
      <defs>
        <marker id={`wf-arrow-${isSql ? "s" : "n"}`} markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L6.5,3.5 z" fill="#94a3b8" />
        </marker>
      </defs>

      {/* Nodes */}
      <rect x="20" y="46" width="62" height="34" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5"/>
      <text x="51" y="67" textAnchor="middle" fontSize="12" fontWeight="600" fill="#475569">Client</text>

      <rect x="112" y="46" width="106" height="34" rx="8" fill="#ffffff" stroke={accent} strokeWidth="1.5"/>
      <text x="165" y="67" textAnchor="middle" fontSize="12" fontWeight="600" fill={accent}>us-east-2</text>

      <rect x="248" y="46" width="106" height="34" rx="8" fill="#ffffff" stroke={accent} strokeWidth="1.5"/>
      <text x="301" y="67" textAnchor="middle" fontSize="12" fontWeight="600" fill={accent}>us-east-1</text>

      {/* Arrows */}
      <line x1="82" y1="63" x2="108" y2="63" stroke="#94a3b8" strokeWidth="1.75" markerEnd={`url(#wf-arrow-${isSql ? "s" : "n"})`}/>
      <line x1="218" y1="63" x2="244" y2="63" stroke={accent} strokeWidth="1.75"
        strokeDasharray={isSql ? undefined : "4,3"} markerEnd={`url(#wf-arrow-${isSql ? "s" : "n"})`}/>

      {/* Flow label above the middle arrow */}
      <text x="231" y="34" textAnchor="middle" fontSize="10" fontWeight="600" fill={accent}>{flowLabel}</text>

      {/* Captions below the region boxes */}
      <text x="165" y="98" textAnchor="middle" fontSize="9.5" fill="#64748b">{isSql ? "Selected region" : "Writes locally"}</text>
      <text x="301" y="98" textAnchor="middle" fontSize="9.5" fill="#64748b">{isSql ? "Primary writer" : "Replicated copy"}</text>

      {/* Sub-caption below the flow */}
      <text x="231" y="112" textAnchor="middle" fontSize="9" fill="#94a3b8">
        {isSql ? "user waits for round trip" : "~300ms · background"}
      </text>
    </svg>
  )
}

function TimelineViz({ sqlResult, nosqlResult, sqlRegion }: {
  sqlResult: LatencyResult | null
  nosqlResult: LatencyResult | null
  sqlRegion: "primary" | "secondary"
}) {
  const s = sqlResult
  const n = nosqlResult
  const isSec = sqlRegion === "secondary"

  const steps: { label: string; sql: string; nosql: string; sqlBad?: boolean }[] = [
    { label: "Received",    sql: s ? "0 ms" : "—",                                    nosql: n ? "0 ms" : "—" },
    { label: "Forwarding",  sql: s && isSec ? `~3 ms` : "—",                          nosql: "—",               sqlBad: isSec && !!s },
    { label: "DB Commit",   sql: s ? `${Math.round(s.avg_write_ms * 0.9)} ms` : "—",  nosql: n ? `${Math.round(n.avg_write_ms * 0.8)} ms` : "—" },
    { label: "Response",    sql: s ? `${s.avg_write_ms} ms` : "—",                    nosql: n ? `${n.avg_write_ms} ms` : "—", sqlBad: !!s && s.avg_write_ms > 50 },
    { label: "Replication", sql: "—",                                                  nosql: n ? `~${n.replication_lag_ms} ms` : "—" },
  ]

  function Row({ color, dotColor, values }: { color: string; dotColor: string; values: { val: string; bad?: boolean }[] }) {
    return (
      <div className="flex items-start">
        {values.map((v, i) => (
          <div key={i} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1">
              <span className={`text-[10px] font-mono font-semibold ${v.bad ? "text-red-500" : color}`}>{v.val}</span>
              <div className={`w-2 h-2 rounded-full my-1 ${dotColor}`}></div>
            </div>
            {i < values.length - 1 && <div className="w-4 h-px bg-gray-200 flex-shrink-0 mb-2"></div>}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* step labels */}
      <div className="flex items-center">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center flex-1 min-w-0">
            <span className="text-[10px] text-gray-400 text-center flex-1 leading-tight">{s.label}</span>
            {i < steps.length - 1 && <div className="w-4 flex-shrink-0"></div>}
          </div>
        ))}
      </div>
      {/* SQL row */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
          <span className="text-[10px] font-medium text-gray-500">Aurora (SQL)</span>
        </div>
        <Row color="text-blue-600" dotColor="bg-blue-400" values={steps.map(st => ({ val: st.sql, bad: st.sqlBad }))} />
      </div>
      {/* NoSQL row */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
          <span className="text-[10px] font-medium text-gray-500">DynamoDB (NoSQL)</span>
        </div>
        <Row color="text-green-600" dotColor="bg-green-400" values={steps.map(st => ({ val: st.nosql }))} />
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
        <h1 className="text-2xl font-bold text-gray-900">Event Ticket Booking System</h1>
        <p className="text-gray-500 text-sm mt-1">
          Book tickets using SQL (Aurora Global DB) or NoSQL (DynamoDB Global Tables) — each from any region. See how each database handles the write under the hood.
        </p>
        <div className="flex gap-3 mt-3">
          <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">🗄 Aurora Global DB — Relational</span>
          <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-medium">⚡ DynamoDB Global Tables — Distributed</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-gray-50">

        {/* ── CUSTOMER BOOKING UI ── */}
        <div className="grid grid-cols-2 gap-4 mb-6">

          {/* Aurora booking card — no tech labels */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-800 mb-0.5">Reserve with Aurora</h2>
                <p className="text-xs text-gray-400">Relational</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">Book from region</label>
              <select
                value={sqlRegion}
                onChange={e => { setSqlRegion(e.target.value as "primary" | "secondary"); setSqlResult(null); setSqlBooking(null) }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="primary">🇺🇸 US-East-1 — N. Virginia</option>
                <option value="secondary">🇺🇸 US-East-2 — Ohio</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => bookSql("sync")}
                disabled={sqlLoading}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {sqlLoading ? "Reserving…" : "Reserve Ticket"}
              </button>
              <button
                onClick={() => bookSql("async")}
                disabled={sqlLoading}
                className="flex-1 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-semibold hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                {sqlLoading ? "Queuing…" : "Reserve (Queued)"}
              </button>
            </div>
            {sqlBooking && (
              <div className={`mt-3 p-3 rounded-lg text-sm flex items-start gap-2 ${sqlBooking.error ? "bg-red-50 border border-red-100" : sqlBooking.status === "pending" ? "bg-yellow-50 border border-yellow-100" : "bg-green-50 border border-green-100"}`}>
                <span className="text-base leading-none mt-0.5">
                  {sqlBooking.error ? "✗" : sqlBooking.status === "pending" ? "⏳" : "✓"}
                </span>
                <div>
                  <p className={`font-semibold ${sqlBooking.error ? "text-red-700" : sqlBooking.status === "pending" ? "text-yellow-700" : "text-green-700"}`}>
                    {sqlBooking.error ? "Booking failed" : sqlBooking.status === "pending" ? "Booking in progress…" : "Ticket Reserved!"}
                  </p>
                  {sqlBooking.booking_id && <p className="text-xs text-gray-400 mt-0.5">Ref: {sqlBooking.booking_id.slice(0, 8).toUpperCase()}</p>}
                  {sqlBooking.error && <p className="text-xs text-red-500 mt-0.5">{sqlBooking.error}</p>}
                </div>
              </div>
            )}
          </div>

          {/* DynamoDB booking card — no tech labels */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-800 mb-0.5">Reserve with DynamoDB</h2>
                <p className="text-xs text-gray-400">Distributed</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">Book from region</label>
              <select
                value={nosqlRegion}
                onChange={e => { setNosqlRegion(e.target.value as "primary" | "secondary"); setNosqlResult(null); setNosqlBooking(null) }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-100"
              >
                <option value="primary">🇺🇸 US-East-1 — N. Virginia</option>
                <option value="secondary">🇺🇸 US-East-2 — Ohio</option>
              </select>
            </div>
            <button
              onClick={bookNosql}
              disabled={nosqlLoading}
              className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {nosqlLoading ? "Reserving…" : "Reserve Ticket"}
            </button>
            {nosqlBooking && (
              <div className={`mt-3 p-3 rounded-lg text-sm flex items-start gap-2 ${(nosqlBooking as any).success === false ? "bg-red-50 border border-red-100" : "bg-green-50 border border-green-100"}`}>
                <span className="text-base leading-none mt-0.5">
                  {(nosqlBooking as any).success === false ? "✗" : "✓"}
                </span>
                <div>
                  <p className={`font-semibold ${(nosqlBooking as any).success === false ? "text-red-700" : "text-green-700"}`}>
                    {(nosqlBooking as any).success === false ? "Booking failed" : "Ticket Reserved!"}
                  </p>
                  {(nosqlBooking as any).booking_id && <p className="text-xs text-gray-400 mt-0.5">Ref: {((nosqlBooking as any).booking_id as string).slice(0, 8).toUpperCase()}</p>}
                  {(nosqlBooking as any).success === false && <p className="text-xs text-red-500 mt-0.5">{(nosqlBooking as any).error}</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-200"></div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm">
            <span className="text-gray-400 text-xs">↓</span>
            <span className="text-xs font-medium text-gray-500">What happens when you book</span>
            <span className="text-gray-400 text-xs">↓</span>
          </div>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        {/* ── TECHNICAL BREAKDOWN: 2-column SQL vs NoSQL ── */}
        <div className="grid grid-cols-2 gap-4 mb-4">

          {/* SQL Column */}
          <div className="flex flex-col gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-blue-600 text-base">🗄</span>
                <h3 className="text-sm font-bold text-blue-700">Aurora Global Database (SQL)</h3>
              </div>
              <p className="text-sm text-blue-600 mb-3 leading-relaxed">
                Single writer in <strong>us-east-1</strong>. Secondary regions forward writes to the primary — user waits for the full round trip before getting a confirmation.
              </p>
              <WriteFlowDiagram isSql={true} isSecondary={sqlRegion === "secondary"} />
              <button
                onClick={runSqlTest}
                disabled={sqlLoading}
                className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {sqlLoading ? "Running…" : "Run Write Latency Test (10 samples)"}
              </button>
              {sqlResult && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white rounded-lg p-2 text-center border border-blue-100">
                    <div className="text-gray-400 mb-0.5">Avg latency</div>
                    <div className="font-bold text-blue-700">{sqlResult.avg_write_ms} ms</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 text-center border border-blue-100">
                    <div className="text-gray-400 mb-0.5">p95 latency</div>
                    <div className="font-bold text-blue-700">{sqlResult.p95_write_ms} ms</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 text-center border border-blue-100">
                    <div className="text-gray-400 mb-0.5">Round trips</div>
                    <div className={`font-bold ${sqlResult.round_trips > 0 ? "text-orange-600" : "text-green-600"}`}>{sqlResult.round_trips}</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 text-center border border-blue-100">
                    <div className="text-gray-400 mb-0.5">Replication lag</div>
                    <div className="font-bold text-blue-700">{sqlResult.replication_lag_ms} ms</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* NoSQL Column */}
          <div className="flex flex-col gap-4">
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-green-600 text-base">⚡</span>
                <h3 className="text-sm font-bold text-green-700">DynamoDB Global Tables (NoSQL)</h3>
              </div>
              <p className="text-sm text-green-600 mb-3 leading-relaxed">
                Every region is a <strong>full writer</strong>. Writes commit locally, then replicate asynchronously. Conflicts are caught atomically via conditional writes — no coordination needed.
              </p>
              <WriteFlowDiagram isSql={false} isSecondary={nosqlRegion === "secondary"} />
              <button
                onClick={runNosqlTest}
                disabled={nosqlLoading}
                className="mt-3 w-full py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {nosqlLoading ? "Running…" : "Run Write Latency Test (10 samples)"}
              </button>
              {nosqlResult && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white rounded-lg p-2 text-center border border-green-100">
                    <div className="text-gray-400 mb-0.5">Avg latency</div>
                    <div className="font-bold text-green-700">{nosqlResult.avg_write_ms} ms</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 text-center border border-green-100">
                    <div className="text-gray-400 mb-0.5">p95 latency</div>
                    <div className="font-bold text-green-700">{nosqlResult.p95_write_ms} ms</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 text-center border border-green-100">
                    <div className="text-gray-400 mb-0.5">Round trips</div>
                    <div className="font-bold text-green-600">{nosqlResult.round_trips}</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 text-center border border-green-100">
                    <div className="text-gray-400 mb-0.5">Replication lag</div>
                    <div className="font-bold text-green-700">{nosqlResult.replication_lag_ms} ms</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Latency — full width */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Live Latency — Last 10 Samples</h3>
          {(sqlResult?.latency_samples?.length ?? 0) > 0 || (nosqlResult?.latency_samples?.length ?? 0) > 0 ? (
            <>
              <div className="px-2">
                <LatencyLineChart
                  sqlSamples={sqlResult?.latency_samples ?? []}
                  nosqlSamples={nosqlResult?.latency_samples ?? []}
                />
              </div>
              <div className="flex gap-4 mt-1 px-2">
                <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-blue-500"></div><span className="text-xs text-gray-500">Aurora (SQL)</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-green-500"></div><span className="text-xs text-gray-500">DynamoDB (NoSQL)</span></div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
              <svg className="w-8 h-8 mb-2 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <p className="text-xs">Run a latency test in either column above to see data</p>
            </div>
          )}
        </div>

        {/* Write Timeline + Latency Comparison + Key Traits — flat 2×2 grid so rows align */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-8">Write Timeline</h3>
            <TimelineViz sqlResult={sqlResult} nosqlResult={nosqlResult} sqlRegion={sqlRegion} />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Latency Comparison</h3>
            <ComparisonTable sqlResult={sqlResult} nosqlResult={nosqlResult} />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Aurora — Key Traits</h3>
            <ul className="text-xs text-gray-600 space-y-1.5">
              <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">•</span>Strong consistency — ACID transactions guaranteed</li>
              <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">•</span>Cross-region writes forwarded to the primary writer</li>
              <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">•</span>Queued (async) booking hides the latency from users</li>
              <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">•</span>Best for financial or transactional workloads</li>
            </ul>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">DynamoDB — Key Traits</h3>
            <ul className="text-xs text-gray-600 space-y-1.5">
              <li className="flex items-start gap-1.5"><span className="text-green-400 mt-0.5">•</span>Always-local writes — no cross-region round trip</li>
              <li className="flex items-start gap-1.5"><span className="text-green-400 mt-0.5">•</span>Async replication (~300ms lag) across all regions</li>
              <li className="flex items-start gap-1.5"><span className="text-green-400 mt-0.5">•</span>Conditional writes prevent double-booking atomically</li>
              <li className="flex items-start gap-1.5"><span className="text-green-400 mt-0.5">•</span>Best for high-scale, low-latency global workloads</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
