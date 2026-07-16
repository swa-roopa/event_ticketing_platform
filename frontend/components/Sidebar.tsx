"use client"
import Image from "next/image"

type Page = "overview" | "sql" | "nosql" | "comparison" | "architecture" | "timeline" | "about"

type Props = {
  active: Page
  onNavigate: (page: Page) => void
}

const navItems: { id: Page; label: string; icon: string; img?: string }[] = [
  { id: "overview", label: "Overview", icon: "⊞", img: "/overview-icon.png" },
  { id: "sql", label: "SQL Test", icon: "🗄", img: "/sql-icon.png" },
  { id: "nosql", label: "NoSQL Test", icon: "⚡", img: "/nosql-icon.png" },
  { id: "comparison", label: "Comparison", icon: "📊", img: "/comparison-icon.png" },
  { id: "architecture", label: "Architecture", icon: "🏗", img: "/architecture-icon.png" },
  { id: "timeline", label: "Timeline", icon: "⏱", img: "/timeline-icon.png" },
  { id: "about", label: "About", icon: "ℹ", img: "/about-icon.png" },
]

export default function Sidebar({ active, onNavigate }: Props) {
  return (
    <aside className="w-60 min-h-screen bg-gray-900 flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="GlobalTix" width={32} height={32} className="rounded" />
          <span className="text-white font-semibold text-sm leading-tight">GlobalTix<br /><span className="text-gray-400 font-normal text-xs">Multi-Region POC</span></span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
              active === item.id
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            {item.img ? (
              <span className="w-5 h-5 flex items-center justify-center rounded bg-white shrink-0">
                <Image src={item.img} alt="" width={16} height={16} />
              </span>
            ) : (
              <span className="text-base w-5 text-center">{item.icon}</span>
            )}
            {item.label}
          </button>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-gray-700">
        <p className="text-gray-500 text-xs">Active-Active Multi-Region</p>
        <p className="text-gray-600 text-xs">SQL vs NoSQL on AWS</p>
      </div>
    </aside>
  )
}
