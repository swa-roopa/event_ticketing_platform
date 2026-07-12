"use client"

export default function ArchitecturePage() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 bg-white border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Architecture Overview</h1>
        <p className="text-gray-500 text-sm mt-1">
          How GlobalTix deploys across AWS regions — Aurora Global Database vs DynamoDB Global Tables.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        <div className="grid grid-cols-2 gap-6 mb-6">

          {/* ════════════════════════════════════════════════
              SQL — Aurora Write Forwarding
              Layout: viewBox 570 × 430
              R1: x=15  w=210  right=225
              R2: x=345 w=210  right=555
              Gap (arrows): x=225→345  center=285
          ════════════════════════════════════════════════ */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-bold text-blue-600 mb-0.5">Aurora Global Database — Write Forwarding</h2>
            <p className="text-xs text-gray-400 mb-4">Active-Passive · one writer, multiple readers</p>

            <svg viewBox="0 0 570 430" className="w-full">
              <defs>
                <symbol id="sql-aurora" viewBox="0 0 48 48">
                  <rect width="48" height="48" rx="9" fill="#527FFF"/>
                  <ellipse cx="24" cy="15" rx="11" ry="3.8" fill="white" opacity="0.95"/>
                  <rect x="13" y="15" width="22" height="14" fill="white" opacity="0.7"/>
                  <ellipse cx="24" cy="29" rx="11" ry="3.8" fill="white" opacity="0.95"/>
                  <ellipse cx="24" cy="15" rx="11" ry="3.8" fill="white" opacity="0.95"/>
                </symbol>
                <symbol id="sql-flask" viewBox="0 0 48 48">
                  <rect width="48" height="48" rx="9" fill="#E7157B"/>
                  <text x="24" y="32" textAnchor="middle" fontSize="18" fill="white" fontWeight="bold" fontFamily="monospace">&lt;/&gt;</text>
                </symbol>
                <marker id="sql-red" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                  <path d="M0,0 L0,9 L9,4.5 z" fill="#EF4444"/>
                </marker>
                <marker id="sql-blue" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                  <path d="M0,0 L0,9 L9,4.5 z" fill="#60A5FA"/>
                </marker>
                <marker id="sql-gray" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                  <path d="M0,0 L0,9 L9,4.5 z" fill="#9CA3AF"/>
                </marker>
              </defs>

              {/* ── US-East-1 region (x=15, w=210, bottom=255) ── */}
              <rect x="15" y="40" width="210" height="215" rx="12"
                fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="8,5"/>
              {/* P badge + label — fully inside box */}
              <rect x="23" y="50" width="16" height="16" rx="3" fill="#3B82F6"/>
              <text x="31" y="62" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">P</text>
              <text x="44" y="62" fontSize="10" fontWeight="700" fill="#1D4ED8">US-EAST-1</text>
              <text x="23" y="80" fontSize="9" fill="#3B82F6">Primary Writer</text>

              {/* Aurora Writer icon: top-left x=96 y=88 → center x=120 y=112 */}
              <use href="#sql-aurora" x="96" y="88" width="48" height="48"/>
              <text x="120" y="150" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1F2937">Aurora Writer</text>
              <text x="120" y="163" textAnchor="middle" fontSize="9" fill="#6B7280">Global Database</text>

              {/* Flask icon: y=178 → center y=202 */}
              <use href="#sql-flask" x="96" y="178" width="48" height="48"/>
              <text x="120" y="240" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1F2937">Flask App</text>
              <text x="120" y="253" textAnchor="middle" fontSize="9" fill="#6B7280">:5010</text>

              {/* ── US-East-2 region (x=345, w=210) ── */}
              <rect x="345" y="40" width="210" height="215" rx="12"
                fill="#FFF7ED" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="8,5"/>
              <rect x="353" y="50" width="16" height="16" rx="3" fill="#F59E0B"/>
              <text x="361" y="62" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">P</text>
              <text x="374" y="62" fontSize="10" fontWeight="700" fill="#92400E">US-EAST-2</text>
              <text x="353" y="80" fontSize="9" fill="#F59E0B">Reader (Write Fwd)</text>

              <use href="#sql-aurora" x="426" y="88" width="48" height="48"/>
              <text x="450" y="150" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1F2937">Aurora Reader</text>
              <text x="450" y="163" textAnchor="middle" fontSize="9" fill="#6B7280">Global Database</text>

              <use href="#sql-flask" x="426" y="178" width="48" height="48"/>
              <text x="450" y="240" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1F2937">Flask App</text>
              <text x="450" y="253" textAnchor="middle" fontSize="9" fill="#6B7280">:5011</text>

              {/* ── Arrows in gap (x=225 → x=345, center x=285) ── */}
              {/* Write Fwd: red, pointing LEFT (secondary → primary) */}
              <line x1="343" y1="107" x2="227" y2="107"
                stroke="#EF4444" strokeWidth="2.5" markerEnd="url(#sql-red)"/>
              <text x="285" y="100" textAnchor="middle" fontSize="9" fontWeight="700" fill="#EF4444">Write Forwarded</text>

              {/* Async replication: dashed blue, pointing RIGHT */}
              <line x1="227" y1="123" x2="343" y2="123"
                stroke="#60A5FA" strokeWidth="1.5" strokeDasharray="6,3" markerEnd="url(#sql-blue)"/>
              <text x="285" y="140" textAnchor="middle" fontSize="8.5" fill="#6B7280">Async Replication</text>

              {/* ── Clients (y=285, 35px below region bottom at y=255) ── */}
              {/* Client 1 */}
              <rect x="97" y="285" width="46" height="46" rx="9" fill="#6B7280"/>
              <circle cx="120" cy="298" r="7" fill="white" opacity="0.9"/>
              <path d="M107 326 Q107 316 120 316 Q133 316 133 326" fill="white" opacity="0.9"/>
              <text x="120" y="345" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1F2937">Client</text>
              <text x="120" y="358" textAnchor="middle" fontSize="9" fill="#6B7280">Region 1</text>

              {/* Client 2 */}
              <rect x="427" y="285" width="46" height="46" rx="9" fill="#6B7280"/>
              <circle cx="450" cy="298" r="7" fill="white" opacity="0.9"/>
              <path d="M437 326 Q437 316 450 316 Q463 316 463 326" fill="white" opacity="0.9"/>
              <text x="450" y="345" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1F2937">Client</text>
              <text x="450" y="358" textAnchor="middle" fontSize="9" fill="#6B7280">Region 2</text>

              {/* Arrows: client top → region bottom */}
              <line x1="120" y1="285" x2="120" y2="257" stroke="#9CA3AF" strokeWidth="1.5" markerEnd="url(#sql-gray)"/>
              <line x1="450" y1="285" x2="450" y2="257" stroke="#9CA3AF" strokeWidth="1.5" markerEnd="url(#sql-gray)"/>

              {/* Bottom note */}
              <rect x="15" y="378" width="540" height="40" rx="8"
                fill="#FEF2F2" stroke="#FECACA" strokeWidth="1"/>
              <text x="285" y="394" textAnchor="middle" fontSize="10" fontWeight="700" fill="#991B1B">Not True Active-Active</text>
              <text x="285" y="409" textAnchor="middle" fontSize="8.5" fill="#B91C1C">Secondary writes round-trip to US-East-1 (+~80 ms latency for Ohio users)</text>
            </svg>
          </div>

          {/* ════════════════════════════════════════════════
              NoSQL — DynamoDB Multi-Master
          ════════════════════════════════════════════════ */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-bold text-green-600 mb-0.5">DynamoDB Global Tables — Multi-Master</h2>
            <p className="text-xs text-gray-400 mb-4">True Active-Active · every region is a writer</p>

            <svg viewBox="0 0 570 430" className="w-full">
              <defs>
                <symbol id="ddb-icon" viewBox="0 0 48 48">
                  <rect width="48" height="48" rx="9" fill="#8C4FFF"/>
                  <ellipse cx="24" cy="12" rx="10" ry="3.2" fill="white" opacity="0.95"/>
                  <rect x="14" y="12" width="20" height="8" fill="white" opacity="0.5"/>
                  <ellipse cx="24" cy="20" rx="10" ry="3.2" fill="white" opacity="0.95"/>
                  <rect x="14" y="20" width="20" height="8" fill="white" opacity="0.5"/>
                  <ellipse cx="24" cy="28" rx="10" ry="3.2" fill="white" opacity="0.95"/>
                  <rect x="14" y="28" width="20" height="8" fill="white" opacity="0.5"/>
                  <ellipse cx="24" cy="36" rx="10" ry="3.2" fill="white" opacity="0.95"/>
                </symbol>
                <symbol id="lambda-icon" viewBox="0 0 48 48">
                  <rect width="48" height="48" rx="9" fill="#FF9900"/>
                  <text x="24" y="34" textAnchor="middle" fontSize="26" fill="white"
                    fontWeight="bold" fontFamily="Georgia, serif">λ</text>
                </symbol>
                <marker id="ddb-green" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                  <path d="M0,0 L0,9 L9,4.5 z" fill="#22C55E"/>
                </marker>
                <marker id="ddb-green2" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                  <path d="M0,0 L0,9 L9,4.5 z" fill="#22C55E"/>
                </marker>
                <marker id="ddb-gray" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                  <path d="M0,0 L0,9 L9,4.5 z" fill="#9CA3AF"/>
                </marker>
              </defs>

              {/* ── US-East-1 ── */}
              <rect x="15" y="40" width="210" height="215" rx="12"
                fill="#F0FDF4" stroke="#16A34A" strokeWidth="1.5" strokeDasharray="8,5"/>
              <rect x="23" y="50" width="16" height="16" rx="3" fill="#16A34A"/>
              <text x="31" y="62" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">P</text>
              <text x="44" y="62" fontSize="10" fontWeight="700" fill="#15803D">US-EAST-1</text>
              <text x="23" y="80" fontSize="9" fill="#16A34A">Active Writer</text>

              <use href="#ddb-icon" x="96" y="88" width="48" height="48"/>
              <text x="120" y="150" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1F2937">DynamoDB</text>
              <text x="120" y="163" textAnchor="middle" fontSize="9" fill="#6B7280">Global Tables</text>

              <use href="#lambda-icon" x="96" y="178" width="48" height="48"/>
              <text x="120" y="240" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1F2937">Flask App</text>
              <text x="120" y="253" textAnchor="middle" fontSize="9" fill="#6B7280">:5002</text>

              {/* ── US-East-2 ── */}
              <rect x="345" y="40" width="210" height="215" rx="12"
                fill="#F0FDF4" stroke="#16A34A" strokeWidth="1.5" strokeDasharray="8,5"/>
              <rect x="353" y="50" width="16" height="16" rx="3" fill="#16A34A"/>
              <text x="361" y="62" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">P</text>
              <text x="374" y="62" fontSize="10" fontWeight="700" fill="#15803D">US-EAST-2</text>
              <text x="353" y="80" fontSize="9" fill="#16A34A">Active Writer</text>

              <use href="#ddb-icon" x="426" y="88" width="48" height="48"/>
              <text x="450" y="150" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1F2937">DynamoDB</text>
              <text x="450" y="163" textAnchor="middle" fontSize="9" fill="#6B7280">Global Tables</text>

              <use href="#lambda-icon" x="426" y="178" width="48" height="48"/>
              <text x="450" y="240" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1F2937">Flask App</text>
              <text x="450" y="253" textAnchor="middle" fontSize="9" fill="#6B7280">:5003</text>

              {/* ── Bidirectional arrows (gap x=225→345, center=285) ── */}
              <line x1="227" y1="107" x2="343" y2="107"
                stroke="#22C55E" strokeWidth="2" strokeDasharray="6,3" markerEnd="url(#ddb-green)"/>
              <line x1="343" y1="123" x2="227" y2="123"
                stroke="#22C55E" strokeWidth="2" strokeDasharray="6,3" markerEnd="url(#ddb-green2)"/>
              <text x="285" y="100" textAnchor="middle" fontSize="9" fontWeight="700" fill="#16A34A">Async Replication</text>
              <text x="285" y="140" textAnchor="middle" fontSize="8.5" fill="#16A34A">~300 ms</text>

              {/* ── Clients ── */}
              <rect x="97" y="285" width="46" height="46" rx="9" fill="#6B7280"/>
              <circle cx="120" cy="298" r="7" fill="white" opacity="0.9"/>
              <path d="M107 326 Q107 316 120 316 Q133 316 133 326" fill="white" opacity="0.9"/>
              <text x="120" y="345" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1F2937">Client</text>
              <text x="120" y="358" textAnchor="middle" fontSize="9" fill="#6B7280">Region 1</text>

              <rect x="427" y="285" width="46" height="46" rx="9" fill="#6B7280"/>
              <circle cx="450" cy="298" r="7" fill="white" opacity="0.9"/>
              <path d="M437 326 Q437 316 450 316 Q463 316 463 326" fill="white" opacity="0.9"/>
              <text x="450" y="345" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1F2937">Client</text>
              <text x="450" y="358" textAnchor="middle" fontSize="9" fill="#6B7280">Region 2</text>

              <line x1="120" y1="285" x2="120" y2="257" stroke="#9CA3AF" strokeWidth="1.5" markerEnd="url(#ddb-gray)"/>
              <line x1="450" y1="285" x2="450" y2="257" stroke="#9CA3AF" strokeWidth="1.5" markerEnd="url(#ddb-gray)"/>

              {/* Bottom note */}
              <rect x="15" y="378" width="540" height="40" rx="8"
                fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="1"/>
              <text x="285" y="394" textAnchor="middle" fontSize="10" fontWeight="700" fill="#15803D">True Active-Active</text>
              <text x="285" y="409" textAnchor="middle" fontSize="8.5" fill="#15803D">Every region writes locally — replication is background, not blocking</text>
            </svg>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Technology Stack</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Frontend",       items: ["Next.js 15", "React 19", "Tailwind CSS v4", "TypeScript"] },
              { label: "SQL Backend",    items: ["Flask (Python)", "SQLAlchemy", "Aurora MySQL", "SQS FIFO (async)"] },
              { label: "NoSQL Backend",  items: ["AWS Lambda (Flask)", "boto3 (DynamoDB)", "Conditional writes", "LWW conflict resolution"] },
              { label: "Infrastructure", items: ["Terraform modules", "Docker Compose (local)", "AWS Aurora Global DB", "DynamoDB Global Tables"] },
            ].map(({ label, items }) => (
              <div key={label}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
                <ul className="space-y-1">
                  {items.map(item => (
                    <li key={item} className="text-sm text-gray-600 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0"/>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* API Reference */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">API Endpoints Reference</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                title: "SQL Endpoints (:5010 / :5011)", color: "text-blue-600",
                routes: [
                  { m: "GET",  p: "/proof/write-latency",   d: "Latency test (N samples)" },
                  { m: "POST", p: "/proof/book-sync",        d: "Synchronous booking" },
                  { m: "POST", p: "/proof/book-async",       d: "Async booking (SQS sim)" },
                  { m: "GET",  p: "/proof/book-status/:id",  d: "Poll booking status" },
                ],
              },
              {
                title: "NoSQL Endpoints (:5002 / :5003)", color: "text-green-600",
                routes: [
                  { m: "GET",  p: "/proof/write-latency",    d: "DynamoDB put_item latency" },
                  { m: "POST", p: "/events/:id/reserve",     d: "Reserve ticket (conditional write)" },
                  { m: "GET",  p: "/events",                 d: "List events from DynamoDB" },
                  { m: "GET",  p: "/health",                 d: "Health check" },
                ],
              },
            ].map(({ title, color, routes }) => (
              <div key={title}>
                <p className={`text-xs font-semibold ${color} mb-2`}>{title}</p>
                <div className="flex flex-col gap-1.5">
                  {routes.map(({ m, p, d }) => (
                    <div key={p} className="flex items-center gap-2 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-white font-mono font-bold ${m === "GET" ? "bg-blue-500" : "bg-orange-500"}`}>{m}</span>
                      <span className="font-mono text-gray-700">{p}</span>
                      <span className="text-gray-400">— {d}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
