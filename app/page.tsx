"use client"

import { useQuery } from "convex-helpers/react/cache/hooks"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  ArrowRight,
  Users,
  FileText,
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  BarChart3
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { RankingEventsChart } from "@/components/charts/ranking-events-chart"
import { TopicCompetitionMixedChart } from "@/components/charts/topic-competition-mixed"
import { TimerRoot, TimerIcon, TimerDisplay } from "@/components/ui/timer"
import { AssignmentDisplay } from "@/components/AssignmentDisplay"
import { getStudentId } from "@/lib/student"
import { cn } from "@/lib/utils"
import React from "react"
import { Id } from "@/convex/_generated/dataModel"

// Pure function to get status color
const getStatusColor = (status: string): string => {
  switch (status) {
    case "open": return "bg-green-500"
    case "upcoming": return "bg-blue-500"
    case "closed": return "bg-red-500"
    case "assigned": return "bg-purple-500"
    default: return "bg-gray-500"
  }
}

// Pure function to get status icon
const getStatusIcon = (status: string) => {
  switch (status) {
    case "open": return <CheckCircle className="h-4 w-4" />
    case "upcoming": return <Clock className="h-4 w-4" />
    case "closed": return <XCircle className="h-4 w-4" />
    case "assigned": return <Users className="h-4 w-4" />
    default: return <AlertCircle className="h-4 w-4" />
  }
}

// Pure function to format status text
const getStatusText = (status: string): string => {
  switch (status) {
    case "open": return "Selection Open"
    case "upcoming": return "Opening Soon"
    case "closed": return "Selection Closed"
    case "assigned": return "Topics Assigned"
    default: return "No Active Period"
  }
}

// Simple countdown hook (ms resolution) for D:HH:MM:SS display
function useCountdown(targetMs: number | null) {
  const [now, setNow] = React.useState<number>(() => Date.now())

  React.useEffect(() => {
    if (!targetMs) return
    let raf: number
    let timer: number
    const tick = () => {
      setNow(Date.now())
      raf = requestAnimationFrame(() => { })
    }
    timer = window.setInterval(tick, 250)
    return () => {
      clearInterval(timer)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [targetMs])

  if (!targetMs) return { remainingMs: 0, formatted: "--:--:--:--" }
  const remaining = Math.max(0, targetMs - now)
  const totalSeconds = Math.floor(remaining / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const formatted = `${days.toString().padStart(2, "0")}:${hours
    .toString()
    .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`
  return { remainingMs: remaining, formatted }
}

function StatusBanner({ stats }: { stats: any }) {
  const isOpen = stats.periodStatus === "open"
  const target = isOpen ? stats.closeDate : null
  const { formatted } = useCountdown(target ?? null)

  // Don't show banner if no active period or if assigned
  if (!stats.isActive || stats.periodStatus === "assigned") return null

  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row items-center justify-center gap-6">
        {/* Left: Title + status */}
        <div className="flex items-center gap-3">
          <span>{getStatusIcon(stats.periodStatus)}</span>
          <span className="text-2xl font-bold">{stats.title || "Selection"}</span>
          <Badge className={cn(
            "px-2 py-1 text-sm font-semibold",
            getStatusColor(stats.periodStatus)
          )}>
            {getStatusText(stats.periodStatus).toUpperCase()}
          </Badge>
        </div>

        {/* Right: Timer only for open periods */}
        {isOpen && (
          <div className="flex flex-col items-center md:items-start gap-2">
            <TimerRoot size="2xl" variant="outline" loading>
              <TimerIcon size="2xl" loading className="text-muted-foreground" />
              <TimerDisplay size="2xl" time={formatted} />
            </TimerRoot>
          </div>
        )}
      </div>
    </div>
  )
}

function ActionButtons() {
  return (
    <div className="grid md:grid-cols-2 gap-4 mb-8">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <Link href="/student">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-bold">Student Portal</CardTitle>
            <Users className="h-8 w-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Select and rank your preferred project topics
            </p>
            <Button className="w-full" size="lg">
              Enter Selection <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Link>
      </Card>

      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <Link href="/admin">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
            <FileText className="h-8 w-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Manage topics and view selection statistics
            </p>
            <Button className="w-full" size="lg">
              Admin Access <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Link>
      </Card>
    </div>
  )
}

function Statistics({ stats }: { stats: any }) {
  const progressPercentage = stats.totalTopics > 0
    ? Math.min(100, Math.round((stats.totalSelections / (stats.totalTopics * 5)) * 100))
    : 0

  return (
    <div className="grid md:grid-cols-3 gap-4 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Topics</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalTopics}</div>
          <p className="text-xs text-muted-foreground">Available projects</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Students Participated</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalStudents}</div>
          <p className="text-xs text-muted-foreground">
            Avg {stats.averageSelectionsPerStudent.toFixed(1)} selections each
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Selection Progress</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalSelections}</div>
          <p className="text-xs text-muted-foreground">Total selections made</p>
          <Progress value={progressPercentage} className="mt-2" />
        </CardContent>
      </Card>
    </div>
  )
}

function AnalyticsCharts({ competitionData }: { competitionData: any }) {
  return (
    <div className="space-y-8 mb-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Live Analytics</h2>
        <p className="text-muted-foreground">Real-time insights into the selection process</p>
      </div>
      {/* Stack charts vertically instead of horizontally */}
      <div className="flex flex-col gap-6">
        {/* Selection Activity Chart */}
        <RankingEventsChart granularity="by-minute" hours={48} />

        {/* Competition Levels Chart */}
        {competitionData && competitionData.length > 0 && (
          <TopicCompetitionMixedChart className="h-full" />
        )}
      </div>
    </div>
  )
}

// Component for showing a student's personal assignment
function PersonalAssignmentView({ assignment }: { assignment: any }) {
  // assignment is the full response from getMyAssignment which includes assignment.topic
  const topic = assignment.topic

  if (!topic) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Project Topic Selection System
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          You have been assigned to:
        </p>
        <h2 className="text-3xl font-bold text-primary">
          {topic.title}
        </h2>
      </div>
    </div>
  )
}

// Component for showing all assignments when no student ID
function AllAssignmentsView({ periodId, studentId }: { periodId: Id<"selectionPeriods">, studentId?: string | null }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Project Topic Selection System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Topics have been assigned to all students
          </p>
        </div>

        {/* Assignment Display */}
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-2xl">Assignment Results</CardTitle>
            <CardDescription>
              {studentId ? studentId + " Loading your assignment..." : "Enter your student ID to view your assignment"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AssignmentDisplay periodId={periodId} studentId={studentId || undefined} />
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>University Project Topic Selection System</p>
        </div>
      </div>
    </div>
  )
}

// Component for active selection period
function SelectionView({ stats, competitionData }: { stats: any, competitionData: any }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Project Topic Selection System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose your preferred project topics with real-time congestion feedback
            to maximize your chances of getting your top choices.
          </p>
        </div>

        {/* Status Banner */}
        <StatusBanner stats={stats} />

        {/* Action Buttons */}
        <ActionButtons />

        {/* Statistics */}
        <Separator className="my-8" />
        <Statistics stats={stats} />

        {/* Analytics Charts */}
        <AnalyticsCharts competitionData={competitionData} />

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>University Project Topic Selection System</p>
          <p className="mt-2">
            Built with real-time congestion awareness to minimize disappointment
          </p>
        </div>
      </div>
    </div>
  )
}

// Component for inactive/no period
function InactivePeriodView() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Project Topic Selection System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            No active selection period at this time
          </p>
        </div>

        {/* Info Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <AlertCircle className="h-6 w-6" />
              No Active Selection Period
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              There is currently no active project selection period. Please check back later
              or contact your administrator for more information about upcoming selection periods.
            </p>

            <Separator />

            <div className="grid md:grid-cols-2 gap-4">
              <Link href="/student">
                <Button className="w-full" variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  Student Portal
                </Button>
              </Link>
              <Link href="/admin">
                <Button className="w-full" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Admin Portal
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>University Project Topic Selection System</p>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const stats = useQuery(api.stats.getLandingStats)
  const competitionData = useQuery(api.analytics.getTopicCompetitionLevels)
  const currentPeriod = useQuery(api.admin.getCurrentPeriod)
  const [studentId, setStudentId] = React.useState<string | null>(null)

  // Get student ID from localStorage
  React.useEffect(() => {
    const id = getStudentId()
    setStudentId(id)
  }, [])

  // Get student's assignment if period is assigned
  const myAssignment = useQuery(
    api.assignments.getMyAssignment,
    currentPeriod?.status === "assigned" && studentId
      ? { periodId: currentPeriod._id, studentId }
      : "skip"
  )

  // Loading state
  if (!stats || !currentPeriod) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-4">
          <div className="h-12 w-48 bg-gray-200 rounded"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // Simple switch based on period status
  switch (currentPeriod.status) {
    case "assigned":
      // If we have a student ID, ALWAYS show simple view (loading or assignment)
      if (studentId) {
        // Check if assignment query is still loading (undefined means loading, null means not found)
        if (myAssignment === undefined) {
          return (
            <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
              <div className="text-center px-4">
                <h1 className="text-4xl font-bold tracking-tight mb-4">
                  Hey {studentId}
                </h1>
                <p className="text-xl text-muted-foreground animate-pulse">
                  Loading your assignment...
                </p>
              </div>
            </div>
          )
        }
        // If assignment found, show it
        if (myAssignment) {
          return <PersonalAssignmentView assignment={myAssignment} />
        }
        // If no assignment found for this student, show error message
        return (
          <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
            <div className="text-center px-4">
              <h1 className="text-4xl font-bold tracking-tight mb-4">
                Hey {studentId}
              </h1>
              <p className="text-xl text-muted-foreground">
                No assignment found for your student ID
              </p>
            </div>
          </div>
        )
      }
      // Show all assignments only when NO student ID
      return <AllAssignmentsView periodId={currentPeriod._id} studentId={studentId} />

    case "open":
      // Show the normal selection interface
      return <SelectionView stats={stats} competitionData={competitionData} />

    default:
      // No active period
      return <InactivePeriodView />
  }
}

