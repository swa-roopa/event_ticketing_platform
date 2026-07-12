"use client"
import { useState} from "react"
import LatencyBadge from "./LatencyBadge"

type Props = {
    title: string
    db: string
    primaryUrl: string
    secondaryUrl: string
    isSql: boolean
}

type LatencyResult = {
    region: string
    avg_write_ms: number
    p50_write_ms: number
    p99_write_ms: number
    write_forwarding_enabled: boolean
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
    explanation?: string
}

export default function RegionPanel ({ title, db, primaryUrl, secondaryUrl, isSql }: Props) {
    const [activeRegion, setActiveRegion] = useState<"primary" | "secondary">("primary")
    const [latency, setLatency] = useState<LatencyResult | null>(null)
    const [booking, setBooking] = useState<BookingResult | null>(null)
    const [loading, setLoading] = useState(false)

    const baseUrl = activeRegion === "primary" ? primaryUrl : secondaryUrl

    async function runLatencyTest() {
        setLoading(true)
        setLatency(null)
        try {
            const res = await fetch(`${baseUrl}/proof/write-latency?samples=10`)
            setLatency(await res.json())
        } finally {
        setLoading(false)
        }
    }

    async function bookSync() {
        setLoading(true)
        setBooking(null)
        try {
          const endpoint = isSql ? "/proof/book-sync" : "/events/demo-event/reserve"
          const res = await fetch(`${baseUrl}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event_id: "demo-event", user_id: "demo-user" }),
          })
          setBooking(await res.json())
        } finally {
          setLoading(false)
        }
      }
    
      async function bookAsync() {
        setLoading(true)
        setBooking(null)
        try {
          const res = await fetch(`${baseUrl}/proof/book-async`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event_id: "demo-event", user_id: "demo-user" }),
          })
          setBooking(await res.json())
        } finally {
          setLoading(false)
        }
    }

    return (
        <div className="border rounded-xl p-6 flex flex-col gap-4 bg-white shadow-sm">
            <div>
                <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                <p className="text-sm text-gray-500">{db}</p>
            </div>

            <div className="flex gap-2">
        {(["primary", "secondary"] as const).map((r) => (
          <button
            key={r}
            onClick={() => { setActiveRegion(r); setLatency(null); setBooking(null) }}
            className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${
              activeRegion === r
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
            }`}
          >
            {r === "primary" ? "us-east-1 (primary)" : "us-east-2 (secondary)"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={runLatencyTest}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          Run Write Latency Test (10 samples)
        </button>

        {latency && (
          <div className="bg-gray-50 rounded p-3 text-sm flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-gray-600">avg</span>
              <LatencyBadge ms={latency.avg_write_ms} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">p50</span>
              <LatencyBadge ms={latency.p50_write_ms} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">p99</span>
              <LatencyBadge ms={latency.p99_write_ms} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">write forwarding</span>
              <span className={`text-xs font-semibold ${latency.write_forwarding_enabled ? "text-red-600" : "text-green-600"}`}>
                {latency.write_forwarding_enabled ? "YES ⚠️" : "NO ✓"}
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-1 italic">{latency.explanation}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={bookSync}
          disabled={loading}
          className="flex-1 px-3 py-2 bg-orange-500 text-white rounded text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
        >
          Book (sync)
        </button>
        {isSql && (
          <button
            onClick={bookAsync}
            disabled={loading}
            className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            Book (async / SQS)
          </button>
        )}
      </div>

      {booking && (
        <div className={`rounded p-3 text-sm flex flex-col gap-1 ${booking.error ? "bg-red-50" : "bg-green-50"}`}>
          <div className="flex justify-between">
            <span className="text-gray-600">status</span>
            <span className={`font-semibold ${booking.error ? "text-red-600" : "text-green-700"}`}>
              {booking.status ?? booking.error}
            </span>
          </div>
          {booking.write_latency_ms !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600">write latency</span>
              <LatencyBadge ms={booking.write_latency_ms} />
            </div>
          )}
          {booking.user_wait_ms !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600">user waited</span>
              <LatencyBadge ms={booking.user_wait_ms} />
            </div>
          )}
          {booking.write_executed_in && (
            <div className="flex justify-between">
              <span className="text-gray-600">write executed in</span>
              <span className="font-mono text-xs text-gray-700">{booking.write_executed_in}</span>
            </div>
          )}
          {(booking.warning ?? booking.note ?? booking.explanation) && (
            <p className="text-gray-400 text-xs mt-1 italic">
              {booking.warning ?? booking.note ?? booking.explanation}
            </p>
          )}
        </div>
      )}
        </div>
    )
}