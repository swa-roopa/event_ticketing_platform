import RegionPanel from "@/components/RegionPanel";

export default function Home() {
  const sqlPrimary   = process.env.NEXT_PUBLIC_SQL_PRIMARY_URL   ?? "http://localhost:5000"
  const sqlSecondary = process.env.NEXT_PUBLIC_SQL_SECONDARY_URL ?? "http://localhost:5001"
  const nosqlPrimary   = process.env.NEXT_PUBLIC_NOSQL_PRIMARY_URL   ?? "http://localhost:5002"
  const nosqlSecondary = process.env.NEXT_PUBLIC_NOSQL_SECONDARY_URL ?? "http://localhost:5003"

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">

        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Active-Active Multi-Region: SQL vs NoSQL
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            Same use case. Same regions. Different write behaviour.
            Pick a region on each panel and run the latency test.
          </p>
        </div>

        <div className="flex gap-4 justify-center text-xs font-medium">
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">&lt; 10ms — local write</span>
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">10–50ms — acceptable</span>
          <span className="bg-red-100 text-red-800 px-2 py-1 rounded">&gt; 50ms — forwarding overhead</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RegionPanel
            title="SQL — Aurora Global DB"
            db="SQL (Aurora Global DB)"
            primaryUrl={sqlPrimary}
            secondaryUrl={sqlSecondary}
            isSql={true}
          />
          <RegionPanel
            title="NoSQL — DynamoDB Global Tables"
            db="NoSQL (DynamoDB Global Tables)"
            primaryUrl={nosqlPrimary}
            secondaryUrl={nosqlSecondary}
            isSql={false}
          />
        </div>

        <div className="bg-white border rounded-xl p-6 text-sm text-gray-600 leading-relaxed">
          <p className="font-semibold text-gray-900 mb-2">What you are seeing</p>
          <p>
            Switch the SQL panel to <strong>secondary (us-east-2)</strong> and run the latency test.
            Notice the p99 jump — that is write forwarding overhead: every write travels to us-east-1 and back.
            Now run the same test on the NoSQL panel from secondary.
            DynamoDB writes locally in us-east-2. No round trip. No forwarding.
          </p>
          <p className="mt-2">
            The SQL <strong>async booking</strong> button shows the mitigation: queue the write via SQS,
            respond in ~3ms, process in the background. The trade-off is the user sees{" "}
            <em>pending</em> before <em>confirmed</em>.
          </p>
        </div>

      </div>
    </main>
  )
}