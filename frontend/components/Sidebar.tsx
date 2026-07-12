"use client"

type Page = "overview" | "sql" | "nosql" | "comparison" | "architecture" | "timeline" | "about"

type Props = {
  active: Page
  onNavigate: (page: Page) => void
}

const navItems: { id: Page; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "⊞" },
  { id: "sql", label: "SQL Test", icon: "🗄" },
  { id: "nosql", label: "NoSQL Test", icon: "⚡" },
  { id: "comparison", label: "Comparison", icon: "📊" },
  { id: "architecture", label: "Architecture", icon: "🏗" },
  { id: "timeline", label: "Timeline", icon: "⏱" },
  { id: "about", label: "About", icon: "ℹ" },
]

export default function Sidebar({ active, onNavigate }: Props) {
  return (
    <aside className="w-60 min-h-screen bg-gray-900 flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-blue-400 text-xl">🌐</span>
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
            <span className="text-base w-5 text-center">{item.icon}</span>
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
