"use client"

import * as React from "react"
import { useQuery } from "convex-helpers/react/cache/hooks"
import { api } from "@/convex/_generated/api"
import { Doc, Id } from "@/convex/_generated/dataModel"
import * as SelectionPeriod from "@/convex/schemas/SelectionPeriod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  ArrowRight,
  Users,
  FileText,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { TimerRoot, TimerIcon, TimerDisplay } from "@/components/ui/timer"
import { AssignmentDisplay } from "@/components/AssignmentDisplay"
import { getStudentId } from "@/lib/student"
import { cn } from "@/lib/utils"
import { RankingEventsChart } from "@/components/charts/ranking-events-chart"
import { TopicCompetitionMixedChart } from "@/components/charts/topic-competition-mixed"

// ============================================================================
// TYPES
// ============================================================================

export interface PopularTopic {
  readonly _id?: Id<"topics">
  readonly title: string
  readonly count: number
}

export interface LandingStats {
  readonly isActive: boolean
  readonly title?: string
  readonly periodStatus: string // This comes from SelectionPeriod.getStatus() which returns a string
  readonly closeDate?: number
  readonly openDate?: number
  readonly totalTopics: number
  readonly totalStudents: number
  readonly totalSelections: number
  readonly averageSelectionsPerStudent: number
  readonly mostPopularTopics?: readonly PopularTopic[]
  readonly leastPopularTopics?: readonly PopularTopic[]
}

// Use actual SelectionPeriod type from Convex
export type CurrentPeriod = Doc<"selectionPeriods"> | SelectionPeriod.SelectionPeriod | null

export interface CompetitionData {
  readonly topicId?: Id<"topics">
  readonly topic?: string
  readonly title?: string
  readonly students?: number
  readonly studentCount?: number
  readonly averageRank?: number | null
  readonly averagePosition?: number
  readonly top3Percentage?: number
  readonly competitionLevel?: string
  readonly category?: "low" | "moderate" | "high" | "very-high"
  readonly fill?: string
}

// Use actual types from Convex
export type Topic = Doc<"topics">
export type Assignment = {
  readonly assignment: Doc<"assignments">
  readonly topic: Topic | null
  readonly wasPreference: boolean
  readonly wasTopChoice: boolean
}

export interface LandingPageState {
  readonly stats: LandingStats | null | undefined
  readonly competitionData: readonly CompetitionData[] | null | undefined
  readonly currentPeriod: CurrentPeriod | undefined
  readonly studentId: string | null
  readonly myAssignment: Assignment | null | undefined
}

export interface LandingPageActions {
  readonly setStudentId: (id: string | null) => void
}

// ============================================================================
// CONTEXT
// ============================================================================

const LandingPageContext = React.createContext<
  (LandingPageState & LandingPageActions) | null
>(null)

export const useLandingPage = () => {
  const context = React.useContext(LandingPageContext)
  if (!context) {
    throw new Error("useLandingPage must be used within LandingPageProvider")
  }
  return context
}

// ============================================================================
// PROVIDER
// ============================================================================

export interface ProviderProps {
  readonly children: React.ReactNode
}

export const Provider: React.FC<ProviderProps> = ({ children }) => {
  const stats = useQuery(api.stats.getLandingStats)
  const competitionData = useQuery(api.analytics.getTopicCompetitionLevels)
  const currentPeriod = useQuery(api.admin.getCurrentPeriod)
  const [studentId, setStudentId] = React.useState<string | null>(null)

  React.useEffect(() => {
    const id = getStudentId()
    setStudentId(id)
  }, [])

  const myAssignment = useQuery(
    api.assignments.getMyAssignment,
    currentPeriod && SelectionPeriod.isAssigned(currentPeriod) && studentId && '_id' in currentPeriod
      ? { periodId: currentPeriod._id as Id<"selectionPeriods">, studentId }
      : "skip"
  )

  const value = React.useMemo(
    () => ({
      stats,
      competitionData,
      currentPeriod,
      studentId,
      myAssignment,
      setStudentId,
    }),
    [stats, competitionData, currentPeriod, studentId, myAssignment]
  )

  return (
    <LandingPageContext.Provider value={value}>
      {children}
    </LandingPageContext.Provider>
  )
}

// ============================================================================
// COMPONENTS - Layout Components
// ============================================================================

export const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto py-12 px-4">
      {children}
    </div>
  </div>
)

export const Header: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="text-center mb-12">
    <h1 className="text-4xl font-bold tracking-tight mb-4">
      Project Topic Selection System
    </h1>
    {children}
  </div>
)

export const HeaderDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
    {children}
  </p>
)

export const Footer: React.FC = () => (
  <div className="mt-12 text-center text-sm text-muted-foreground">
    <p>University Project Topic Selection System</p>
  </div>
)

export const FooterWithTagline: React.FC = () => (
  <div className="mt-12 text-center text-sm text-muted-foreground">
    <p>University Project Topic Selection System</p>
    <p className="mt-2">
      Built with real-time congestion awareness to minimize disappointment
    </p>
  </div>
)

// ============================================================================
// COMPONENTS - Status Components
// ============================================================================

export const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case "open": return <CheckCircle className="h-4 w-4" />
    case "upcoming": return <Clock className="h-4 w-4" />
    case "closed": return <XCircle className="h-4 w-4" />
    case "assigned": return <Users className="h-4 w-4" />
    default: return <AlertCircle className="h-4 w-4" />
  }
}

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "open": return "bg-green-500"
      case "upcoming": return "bg-blue-500"
      case "closed": return "bg-red-500"
      case "assigned": return "bg-purple-500"
      default: return "bg-gray-500"
    }
  }

  const getStatusText = (status: string): string => {
    switch (status) {
      case "open": return "Selection Open"
      case "upcoming": return "Opening Soon"
      case "closed": return "Selection Closed"
      case "assigned": return "Topics Assigned"
      default: return "No Active Period"
    }
  }

  return (
    <Badge className={cn(
      "px-2 py-1 text-sm font-semibold",
      getStatusColor(status)
    )}>
      {getStatusText(status).toUpperCase()}
    </Badge>
  )
}

// ============================================================================
// COMPONENTS - Timer Component
// ============================================================================

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

export const Timer: React.FC<{ targetDate: number | null }> = ({ targetDate }) => {
  const { formatted } = useCountdown(targetDate)

  if (!targetDate) return null

  return (
    <div className="flex flex-col items-center md:items-start gap-2">
      <TimerRoot size="2xl" variant="outline" loading>
        <TimerIcon size="2xl" loading className="text-muted-foreground" />
        <TimerDisplay size="2xl" time={formatted} />
      </TimerRoot>
    </div>
  )
}

// ============================================================================
// COMPONENTS - Banner Component
// ============================================================================

export const StatusBanner: React.FC = () => {
  const { stats } = useLandingPage()

  if (!stats || !stats.isActive || stats.periodStatus === "assigned") return null

  const isOpen = stats.periodStatus === "open"
  const target = isOpen ? stats.closeDate : null

  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row items-center justify-center gap-6">
        <div className="flex items-center gap-3">
          <StatusIcon status={stats.periodStatus} />
          <span className="text-2xl font-bold">{stats.title || "Selection"}</span>
          <StatusBadge status={stats.periodStatus} />
        </div>
        {isOpen && <Timer targetDate={target ?? null} />}
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENTS - Action Cards
// ============================================================================

export const StudentPortalCard: React.FC = () => (
  <Card className="border-0 shadow-sm hover:shadow-lg transition-shadow cursor-pointer bg-primary text-primary-foreground">
    <Link href="/student">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Student Portal</CardTitle>
        <Users className="h-8 w-8 opacity-80" />
      </CardHeader>
      <CardContent>
        <p className="opacity-90 mb-4">
          Select and rank your preferred project topics
        </p>
        <Button className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90" size="lg">
          Enter Selection <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Link>
  </Card>
)

export const AdminPortalCard: React.FC = () => (
  <Card className="border-0 shadow-sm hover:shadow-lg transition-shadow cursor-pointer bg-background">
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
)

export const ActionCards: React.FC = () => (
  <div className="grid md:grid-cols-2 gap-4 mb-8">
    <StudentPortalCard />
    <AdminPortalCard />
  </div>
)

// ============================================================================
// COMPONENTS - Statistics Cards
// ============================================================================

export const TotalTopicsCard: React.FC = () => {
  const { stats } = useLandingPage()
  if (!stats) return null

  return (
    <Card className="border-0 shadow-sm bg-background">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Total Topics</CardTitle>
        <FileText className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{stats.totalTopics}</div>
        <p className="text-xs text-muted-foreground mt-1">Available projects</p>
      </CardContent>
    </Card>
  )
}

export const StudentsParticipatedCard: React.FC = () => {
  const { stats } = useLandingPage()
  if (!stats) return null

  return (
    <Card className="border-0 shadow-sm bg-background">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Students Participated</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{stats.totalStudents}</div>
        <p className="text-xs text-muted-foreground mt-1">
          Avg {stats.averageSelectionsPerStudent.toFixed(1)} selections each
        </p>
      </CardContent>
    </Card>
  )
}

export const SelectionProgressCard: React.FC = () => {
  const { stats } = useLandingPage()
  if (!stats) return null

  const progressPercentage = stats.totalTopics > 0
    ? Math.min(100, Math.round((stats.totalSelections / (stats.totalTopics * 5)) * 100))
    : 0

  return (
    <Card className="border-0 shadow-sm bg-background">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Selection Progress</CardTitle>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{stats.totalSelections}</div>
        <p className="text-xs text-muted-foreground mt-1">Total selections made</p>
        <Progress value={progressPercentage} className="mt-3" />
      </CardContent>
    </Card>
  )
}

export const StatisticsCards: React.FC = () => (
  <div className="grid md:grid-cols-3 gap-4 mb-8">
    <TotalTopicsCard />
    <StudentsParticipatedCard />
    <SelectionProgressCard />
  </div>
)

// ============================================================================
// COMPONENTS - Analytics Section
// ============================================================================

export const AnalyticsSection: React.FC = () => {
  const { competitionData } = useLandingPage()

  const hasData = competitionData && Array.isArray(competitionData) && competitionData.length > 0

  return (
    <div className="space-y-8 mb-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Live Analytics</h2>
        <p className="text-muted-foreground">Real-time insights into the selection process</p>
      </div>
      <div className="flex flex-col gap-6">
        <RankingEventsChart granularity="by-minute" hours={48} />
        {hasData && (
          <TopicCompetitionMixedChart className="h-full" />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENTS - Inactive Period Card
// ============================================================================

export const InactivePeriodCard: React.FC = () => (
  <Card className="max-w-2xl mx-auto border-0 shadow-sm bg-background">
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
          <Button className="w-full bg-primary text-primary-foreground">
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
)

// ============================================================================
// COMPONENTS - Assignment Display
// ============================================================================

export const PersonalAssignmentDisplay: React.FC = () => {
  const { myAssignment } = useLandingPage()
  const topic = myAssignment?.topic

  if (!topic) return null

  return (
    <Card className="max-w-2xl border-0 shadow-lg bg-primary text-primary-foreground">
      <CardContent className="text-center p-12">
        <h1 className="text-3xl font-bold tracking-tight mb-4">
          Your Assignment
        </h1>
        <p className="text-lg opacity-90 mb-6">
          You have been assigned to:
        </p>
        <h2 className="text-4xl font-bold">
          {topic.title}
        </h2>
        {topic.description && (
          <p className="mt-4 text-base opacity-80">
            {topic.description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// Assignment Statistics Component
export const AssignmentStats: React.FC = () => {
  // Mock data for now - replace with real data
  const stats = {
    totalAssignments: 1,
    matchedPreferences: 100,
    topChoiceRate: 0
  }

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      <Card className="border-0 shadow-sm bg-background">
        <CardContent className="text-center p-6">
          <div className="text-3xl font-bold">{stats.totalAssignments}</div>
          <p className="text-sm text-muted-foreground mt-1">Total Assignments</p>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm bg-background">
        <CardContent className="text-center p-6">
          <div className="text-3xl font-bold text-primary">{stats.matchedPreferences}%</div>
          <p className="text-sm text-muted-foreground mt-1">Matched Preferences</p>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm bg-background">
        <CardContent className="text-center p-6">
          <div className="text-3xl font-bold">{stats.topChoiceRate}%</div>
          <p className="text-sm text-muted-foreground mt-1">Got Top Choice</p>
        </CardContent>
      </Card>
    </div>
  )
}

export const AllAssignmentsDisplay: React.FC<{ periodId: Id<"selectionPeriods"> }> = ({ periodId }) => {
  const { studentId } = useLandingPage()

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Assignment Results</h2>
        <p className="text-muted-foreground">
          {studentId ? `Student ID: ${studentId}` : "Enter your student ID to view your assignment"}
        </p>
      </div>

      {/* Assignment Statistics Grid */}
      <AssignmentStats />

      {/* Topic Assignments Table */}
      <Card className="border-0 shadow-sm bg-background">
        <CardHeader>
          <CardTitle>Topic Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignmentDisplay periodId={periodId} studentId={studentId || undefined} />
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// LOADING STATES
// ============================================================================

export const LoadingState: React.FC = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-pulse space-y-4">
      <div className="h-12 w-48 bg-primary/20 rounded"></div>
      <div className="h-4 w-32 bg-primary/20 rounded"></div>
    </div>
  </div>
)

export const LoadingAssignment: React.FC<{ studentId: string }> = ({ studentId }) => (
  <div className="min-h-screen bg-background flex items-center justify-center">
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

export const NoAssignmentFound: React.FC<{ studentId: string }> = ({ studentId }) => (
  <div className="min-h-screen bg-background flex items-center justify-center">
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