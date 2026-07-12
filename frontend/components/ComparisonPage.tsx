"use client"
import { useState, useCallback } from "react"

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
}

type Props = {
  sqlPrimaryUrl: string
  sqlSecondaryUrl: string
  nosqlPrimaryUrl: string
  nosqlSecondaryUrl: string
}

const CATEGORIES = [
  {
    name: "Write Behavior",
    rows: [
      { feature: "Write from primary region", sql: "Local commit", nosql: "Local commit", sqlWins: false, tie: true },
      { feature: "Write from secondary region", sql: "Forwarded to primary", nosql: "Local commit", sqlWins: false, tie: false },
      { feature: "True active-active", sql: "No (active-passive)", nosql: "Yes", sqlWins: false, tie: false },
      { feature: "Multi-master writes", sql: "Single writer only", nosql: "All regions write", sqlWins: false, tie: false },
    ]
  },
  {
    name: "Latency",
    rows: [
      { feature: "Primary write latency", sql: "~5-15ms", nosql: "~3-10ms", sqlWins: false, tie: true },
      { feature: "Secondary write latency", sql: "~80-150ms (forwarding)", nosql: "~3-10ms (local)", sqlWins: false, tie: false },
      { feature: "Cross-region overhead", sql: "Full round trip per write", nosql: "None (async after commit)", sqlWins: false, tie: false },
      { feature: "Replication lag", sql: "~20ms (replication only)", nosql: "~280-380ms (eventual)", sqlWins: true, tie: false },
    ]
  },
  {
    name: "Consistency & Reliability",
    rows: [
      { feature: "Consistency model", sql: "Strong (ACID)", nosql: "Eventually consistent", sqlWins: true, tie: false },
      { feature: "Transaction support", sql: "Full ACID transactions", nosql: "Single-item atomic only", sqlWins: true, tie: false },
      { feature: "Conflict resolution", sql: "No conflicts (single writer)", nosql: "Last-writer-wins (LWW)", sqlWins: true, tie: false },
      { feature: "Data durability", sql: "Synchronous replication to 6 copies", nosql: "3 AZ per region", sqlWins: false, tie: true },
    ]
  },
  {
    name: "Scalability & Operations",
    rows: [
      { feature: "Horizontal write scale", sql: "Limited (single writer)", nosql: "Per-region independent", sqlWins: false, tie: false },
      { feature: "Managed service", sql: "Aurora Serverless v2", nosql: "Fully serverless", sqlWins: false, tie: true },
      { feature: "Schema flexibility", sql: "Fixed schema (DDL)", nosql: "Schemaless (flexible)", sqlWins: false, tie: false },
      { feature: "Query flexibility", sql: "Full SQL / JOINs", nosql: "Key-value + GSI only", sqlWins: true, tie: false },
    ]
  },
]

export default function ComparisonPage({ sqlPrimaryUrl, sqlSecondaryUrl, nosqlPrimaryUrl, nosqlSecondaryUrl }: Props) {
  const [sqlRegion, setSqlRegion] = useState<"primary" | "secondary">("secondary")
  const [nosqlRegion, setNosqlRegion] = useState<"primary" | "secondary">("secondary")
  const [sqlResult, setSqlResult] = useState<LatencyResult | null>(null)
  const [nosqlResult, setNosqlResult] = useState<LatencyResult | null>(null)
  const [loading, setLoading] = useState(false)

  const sqlUrl = sqlRegion === "primary" ? sqlPrimaryUrl : sqlSecondaryUrl
  const nosqlUrl = nosqlRegion === "primary" ? nosqlPrimaryUrl : nosqlSecondaryUrl

  const runBothTests = useCallback(async () => {
    setLoading(true)
    try {
      const [sqlRes, nosqlRes] = await Promise.all([
        fetch(`${sqlUrl}/proof/write-latency?samples=10`),
        fetch(`${nosqlUrl}/proof/write-latency?samples=10`),
      ])
      const [sqlData, nosqlData] = await Promise.all([sqlRes.json(), nosqlRes.json()])
      setSqlResult(sqlData)
      setNosqlResult(nosqlData)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [sqlUrl, nosqlUrl])

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 bg-white border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">SQL vs NoSQL: Side-by-Side Comparison</h1>
        <p className="text-gray-500 text-sm mt-1">
          Run both tests simultaneously and compare how Aurora Global DB and DynamoDB Global Tables handle writes.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-600">SQL Region:</span>
              <select value={sqlRegion} onChange={e => { setSqlRegion(e.target.value as "primary" | "secondary"); setSqlResult(null) }}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700">
                <option value="primary">US-East-1 (Primary)</option>
                <option value="secondary">US-East-2 (Secondary, forwarding)</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-green-600">NoSQL Region:</span>
              <select value={nosqlRegion} onChange={e => { setNosqlRegion(e.target.value as "primary" | "secondary"); setNosqlResult(null) }}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700">
                <option value="primary">US-East-1 (Primary)</option>
                <option value="secondary">US-East-2 (Secondary, local write)</option>
              </select>
            </div>
            <button
              onClick={runBothTests}
              disabled={loading}
              className="ml-auto py-2 px-6 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Running Both Tests..." : "Run Both Tests Simultaneously"}
            </button>
          </div>
        </div>

        {/* Live metric cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "SQL Avg Write", value: sqlResult?.avg_write_ms ?? null, unit: "ms", color: "blue" },
            { label: "SQL P95 Write", value: sqlResult?.p95_write_ms ?? null, unit: "ms", color: "blue" },
            { label: "NoSQL Avg Write", value: nosqlResult?.avg_write_ms ?? null, unit: "ms", color: "green" },
            { label: "NoSQL P95 Write", value: nosqlResult?.p95_write_ms ?? null, unit: "ms", color: "green" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold font-mono ${color === "blue" ? "text-blue-600" : "text-green-600"}`}>
                {value !== null ? value : "—"}
              </p>
              <p className="text-xs text-gray-400">ms</p>
            </div>
          ))}
        </div>

        {/* Latency comparison visual */}
        {(sqlResult || nosqlResult) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Latency Comparison</h2>
            <div className="flex flex-col gap-3">
              {(["avg_write_ms", "p50_write_ms", "p95_write_ms", "p99_write_ms"] as const).map(key => {
                const label = key.replace("_write_ms", "").replace("avg", "Average").replace("p", "P").toUpperCase()
                const sqlVal = sqlResult?.[key] ?? 0
                const nosqlVal = nosqlResult?.[key] ?? 0
                const max = Math.max(sqlVal, nosqlVal, 1) * 1.1
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-500 w-16">{label === "AVERAGE" ? "Average" : label}</span>
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className="w-12 text-xs text-right text-blue-600 font-mono">{sqlVal || "—"}</div>
                          <div className="flex-1 bg-gray-100 rounded h-3">
                            <div className="h-3 rounded bg-blue-500 transition-all" style={{ width: `${sqlVal ? (sqlVal / max) * 100 : 0}%` }}></div>
                          </div>
                          <span className="text-xs text-blue-600 w-8">SQL</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-12 text-xs text-right text-green-600 font-mono">{nosqlVal || "—"}</div>
                          <div className="flex-1 bg-gray-100 rounded h-3">
                            <div className="h-3 rounded bg-green-500 transition-all" style={{ width: `${nosqlVal ? (nosqlVal / max) * 100 : 0}%` }}></div>
                          </div>
                          <span className="text-xs text-green-600 w-8">NoSQL</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Feature comparison table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-100 px-4 py-3 text-sm font-semibold">
            <div className="text-gray-600">Feature</div>
            <div className="text-blue-600 text-center">Aurora Global DB (SQL)</div>
            <div className="text-green-600 text-center">DynamoDB Global Tables (NoSQL)</div>
          </div>
          {CATEGORIES.map(cat => (
            <div key={cat.name}>
              <div className="px-4 py-2 bg-gray-50 border-y border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{cat.name}</span>
              </div>
              {cat.rows.map(row => (
                <div key={row.feature} className="grid grid-cols-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 text-sm">
                  <div className="text-gray-700">{row.feature}</div>
                  <div className={`text-center text-xs ${row.tie ? "text-gray-600" : row.sqlWins ? "text-blue-700 font-medium" : "text-orange-600"}`}>
                    {row.sql}
                    {row.sqlWins && !row.tie && <span className="ml-1">🏆</span>}
                  </div>
                  <div className={`text-center text-xs ${row.tie ? "text-gray-600" : row.sqlWins ? "text-orange-600" : "text-green-700 font-medium"}`}>
                    {row.nosql}
                    {!row.sqlWins && !row.tie && <span className="ml-1">🏆</span>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Verdict */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Choose Aurora Global DB (SQL) when:</h3>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Strong consistency and ACID transactions are required</li>
              <li>Most writes originate from a single region</li>
              <li>Complex queries, joins, and reporting are needed</li>
              <li>Data integrity &gt; write performance</li>
              <li>Regulatory compliance requires strong ordering</li>
            </ul>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h3 className="font-semibold text-green-800 mb-2">Choose DynamoDB Global Tables (NoSQL) when:</h3>
            <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
              <li>Low-latency writes from multiple regions simultaneously</li>
              <li>High availability and fault tolerance are the top priority</li>
              <li>Eventual consistency is acceptable</li>
              <li>Key-value or document access patterns</li>
              <li>Auto-scaling with no capacity planning</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
