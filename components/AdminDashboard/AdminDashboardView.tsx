"use client"

import * as React from "react"
import * as AD from "./index"
import DockLayout from "@/components/layouts/DockLayout"
import { useRouter } from "next/navigation"
import {
  Calendar,
  FileText,
  Users,
  BarChart3,
  Settings,
  Home,
  Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import SelectionPeriodForm, { SelectionPeriodFormValues } from "@/components/forms/selection-period-form"
import TopicForm from "@/components/forms/topic-form"
import { PeriodsView } from "./PeriodsView"
import { TopicsView } from "./TopicsView"
import { StudentsView } from "./StudentsView"
import { AnalyticsView } from "./AnalyticsView"
import { SettingsView } from "./SettingsView"

// ============================================================================
// OVERVIEW VIEW - Composed from atomic components
// ============================================================================

const OverviewView: React.FC = () => {
  const { currentPeriod, assignments } = AD.useDashboard()

  return (
    <div className="space-y-6">
      {/* Metrics Grid - Clean, no nesting */}
      <AD.MetricsGrid />

      {/* Assignment Results when period is assigned */}
      {currentPeriod?.status === "assigned" && assignments && assignments.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Assignments</CardTitle>
            <CardDescription>Latest topic assignments for students</CardDescription>
          </CardHeader>
          <CardContent>
            <AD.AssignmentTable />
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Selection Periods</CardTitle>
            <CardDescription>Manage when students can select topics</CardDescription>
          </CardHeader>
          <CardContent>
            <AD.PeriodsTable />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Topics</CardTitle>
            <CardDescription>Available topics for selection</CardDescription>
          </CardHeader>
          <CardContent>
            <AD.TopicsTable />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN CONTENT SWITCHER
// ============================================================================

const MainContent: React.FC = () => {
  const { activeView } = AD.useDashboard()

  switch (activeView) {
    case "overview":
      return <OverviewView />
    case "periods":
      return <PeriodsView />
    case "topics":
      return <TopicsView />
    case "students":
      return <StudentsView />
    case "analytics":
      return <AnalyticsView />
    case "settings":
      return <SettingsView />
    default:
      return <OverviewView />
  }
}

// ============================================================================
// ADMIN DASHBOARD VIEW WITH DOCK
// ============================================================================

export const AdminDashboardView: React.FC = () => {
  const router = useRouter()
  const { activeView, setActiveView } = AD.useDashboard()

  const dockItems = [
    {
      id: "home",
      icon: <Home className="h-6 w-6" />,
      label: "Home",
      onClick: () => router.push("/")
    },
    {
      id: "overview",
      icon: <BarChart3 className="h-6 w-6" />,
      label: "Overview",
      isActive: activeView === "overview",
      onClick: () => setActiveView("overview")
    },
    {
      id: "periods",
      icon: <Calendar className="h-6 w-6" />,
      label: "Periods",
      isActive: activeView === "periods",
      onClick: () => setActiveView("periods")
    },
    {
      id: "topics",
      icon: <FileText className="h-6 w-6" />,
      label: "Topics",
      isActive: activeView === "topics",
      onClick: () => setActiveView("topics")
    },
    {
      id: "students",
      icon: <Users className="h-6 w-6" />,
      label: "Students",
      isActive: activeView === "students",
      onClick: () => setActiveView("students")
    },
    {
      id: "analytics",
      icon: <BarChart3 className="h-6 w-6" />,
      label: "Analytics",
      isActive: activeView === "analytics",
      onClick: () => setActiveView("analytics")
    },
    {
      id: "settings",
      icon: <Settings className="h-6 w-6" />,
      label: "Settings",
      isActive: activeView === "settings",
      onClick: () => setActiveView("settings")
    }
  ]

  return (
    <DockLayout dockItems={dockItems}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          <AD.PageHeader />

          {/* Main Content Area */}
          <MainContent />
        </div>
      </div>
    </DockLayout>
  )
}

// ============================================================================
// ROOT COMPONENT WITH PROVIDER
// ============================================================================

export const AdminDashboard: React.FC = () => (
  <AD.Provider>
    <AdminDashboardView />
  </AD.Provider>
)