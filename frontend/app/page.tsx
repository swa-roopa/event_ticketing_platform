"use client"
import { useState } from "react"
import Sidebar from "@/components/Sidebar"
import OverviewPage from "@/components/OverviewPage"
import SqlTestPage from "@/components/SqlTestPage"
import NoSqlTestPage from "@/components/NoSqlTestPage"
import ComparisonPage from "@/components/ComparisonPage"
import ArchitecturePage from "@/components/ArchitecturePage"
import TimelinePage from "@/components/TimelinePage"
import AboutPage from "@/components/AboutPage"

type Page = "overview" | "sql" | "nosql" | "comparison" | "architecture" | "timeline" | "about"

const SQL_PRIMARY = process.env.NEXT_PUBLIC_SQL_PRIMARY_URL ?? "http://localhost:5010"
const SQL_SECONDARY = process.env.NEXT_PUBLIC_SQL_SECONDARY_URL ?? "http://localhost:5011"
const NOSQL_PRIMARY = process.env.NEXT_PUBLIC_NOSQL_PRIMARY_URL ?? "http://localhost:5002"
const NOSQL_SECONDARY = process.env.NEXT_PUBLIC_NOSQL_SECONDARY_URL ?? "http://localhost:5003"

export default function Home() {
  const [activePage, setActivePage] = useState<Page>("overview")

  function renderPage() {
    switch (activePage) {
      case "overview":
        return (
          <OverviewPage
            sqlPrimaryUrl={SQL_PRIMARY}
            sqlSecondaryUrl={SQL_SECONDARY}
            nosqlPrimaryUrl={NOSQL_PRIMARY}
            nosqlSecondaryUrl={NOSQL_SECONDARY}
          />
        )
      case "sql":
        return <SqlTestPage sqlPrimaryUrl={SQL_PRIMARY} sqlSecondaryUrl={SQL_SECONDARY} />
      case "nosql":
        return <NoSqlTestPage nosqlPrimaryUrl={NOSQL_PRIMARY} nosqlSecondaryUrl={NOSQL_SECONDARY} />
      case "comparison":
        return (
          <ComparisonPage
            sqlPrimaryUrl={SQL_PRIMARY}
            sqlSecondaryUrl={SQL_SECONDARY}
            nosqlPrimaryUrl={NOSQL_PRIMARY}
            nosqlSecondaryUrl={NOSQL_SECONDARY}
          />
        )
      case "architecture":
        return <ArchitecturePage />
      case "timeline":
        return (
          <TimelinePage
            sqlPrimaryUrl={SQL_PRIMARY}
            sqlSecondaryUrl={SQL_SECONDARY}
            nosqlPrimaryUrl={NOSQL_PRIMARY}
            nosqlSecondaryUrl={NOSQL_SECONDARY}
          />
        )
      case "about":
        return <AboutPage />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar active={activePage} onNavigate={setActivePage} />
      <main className="flex-1 overflow-hidden">
        {renderPage()}
      </main>
    </div>
  )
}
