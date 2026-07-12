type Props = { ms: number | null}

export default function LatencyBadge({ ms }: Props) {
    if (ms === null) return <span className="text-gray-400 text-sm">-</span>

    const color = 
        ms < 10 ? "bg-green-100 text-green-800" :
        ms < 50 ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"

    return (
        <span className={`inline-block px-2 py-2 rounded text-sm font-mono font-semibold ${color}`}>
            {ms} ms
        </span>

    )
}