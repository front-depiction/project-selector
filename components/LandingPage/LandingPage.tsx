"use client"

import * as React from "react"
import { useSignals } from "@preact/signals-react/runtime"
import { useRouter } from "next/navigation"
import * as Option from "effect/Option"
import { Doc, Id } from "@/convex/_generated/dataModel"
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
  Home,
} from "lucide-react"
import Link from "next/link"
import { clearStudentId } from "@/lib/student"
import { TimerRoot, TimerIcon, TimerDisplay } from "@/components/ui/timer"
import { AssignmentDisplay } from "@/components/AssignmentDisplay"
import { cn } from "@/lib/utils"
import { RankingEventsChart } from "@/components/charts/ranking-events-chart"
import { TopicCompetitionMixedChart } from "@/components/charts/topic-competition-mixed"
import type { LandingPageVM, StatCardVM } from "./LandingPageVM"

// ============================================================================
// TYPES (kept for backward compatibility with Context consumers)
// ============================================================================

export interface PopularTopic {
  readonly _id?: Id<"topics">
  readonly title: string
  readonly count: number
}

export interface LandingStats {
  readonly isActive: boolean
  readonly title?: string
  readonly closeDate?: number
  readonly openDate?: number
  readonly totalTopics: number
  readonly totalStudents: number
  readonly totalSelections: number
  readonly averageSelectionsPerStudent: number
  readonly mostPopularTopics?: readonly PopularTopic[]
  readonly leastPopularTopics?: readonly PopularTopic[]
}

export type CurrentPeriod = Doc<"selectionPeriods"> | null

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
// CONTEXT (kept for child components like AssignmentDisplay)
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
// PROVIDER (receives VM via props)
// ============================================================================

export interface ProviderProps {
  readonly vm: LandingPageVM
  readonly children: React.ReactNode
}

export const Provider: React.FC<ProviderProps> = ({ vm, children }) => {
  // Enable signal tracking for reactivity
  useSignals()

  // Bridge VM to Context for backward compatibility
  // This allows child components to continue using useLandingPage()
  return (
    <LandingPageContext.Provider value={{
      stats: null, // Not exposed by VM anymore
      competitionData: vm.competitionData$.value,
      currentPeriod: vm.currentPeriod$.value ?? null,
      studentId: Option.getOrNull(vm.studentId$.value),
      myAssignment: null, // Not in old format
      setStudentId: vm.setStudentId,
    }}>
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
// COMPONENTS - Status Components (now VM-driven)
// ============================================================================

export const StatusIcon: React.FC<{ iconName: string }> = ({ iconName }) => {
  switch (iconName) {
    case "checkCircle": return <CheckCircle className="h-4 w-4" />
    case "clock": return <Clock className="h-4 w-4" />
    case "xCircle": return <XCircle className="h-4 w-4" />
    case "users": return <Users className="h-4 w-4" />
    default: return <AlertCircle className="h-4 w-4" />
  }
}

export const StatusBadge: React.FC<{ statusText: string; statusColor: string }> = ({ statusText, statusColor }) => {
  return (
    <Badge className={cn(
      "px-2 py-1 text-sm font-semibold",
      statusColor
    )}>
      {statusText.toUpperCase()}
    </Badge>
  )
}

// ============================================================================
// COMPONENTS - Timer Component (now uses VM-driven countdown with requestAnimationFrame)
// ============================================================================

export const Timer: React.FC<{ targetDate: number | null }> = ({ targetDate }) => {
  const [formatted, setFormatted] = React.useState<string>("--:--:--:--")

  React.useEffect(() => {
    if (!targetDate) {
      setFormatted("--:--:--:--")
      return
    }

    let rafId: number
    let timerId: number

    const updateCountdown = () => {
      const now = Date.now()
      const remaining = Math.max(0, targetDate - now)
      const totalSeconds = Math.floor(remaining / 1000)
      const days = Math.floor(totalSeconds / 86400)
      const hours = Math.floor((totalSeconds % 86400) / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      const newFormatted = `${days.toString().padStart(2, "0")}:${hours
        .toString()
        .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`

      setFormatted(newFormatted)
      rafId = requestAnimationFrame(() => {})
    }

    updateCountdown()
    timerId = window.setInterval(updateCountdown, 250)

    return () => {
      clearInterval(timerId)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [targetDate])

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
// COMPONENTS - Banner Component (now VM-driven)
// ============================================================================

export const StatusBanner: React.FC<{ vm: LandingPageVM }> = ({ vm }) => {
  useSignals()

  return Option.match(vm.banner$.value, {
    onNone: () => null,
    onSome: (bannerData) => (
      <div className="mb-8">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          <div className="flex items-center gap-3">
            <StatusIcon iconName={bannerData.status.iconName} />
            <span className="text-2xl font-bold">{bannerData.title}</span>
            <StatusBadge
              statusText={bannerData.status.statusText}
              statusColor={bannerData.status.statusColor}
            />
          </div>
          <Timer targetDate={bannerData.timer.targetDate} />
        </div>
      </div>
    )
  })
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
// COMPONENTS - Statistics Cards (now VM-driven)
// ============================================================================

const getIcon = (iconName: string) => {
  switch (iconName) {
    case "fileText": return <FileText className="h-4 w-4 text-muted-foreground" />
    case "users": return <Users className="h-4 w-4 text-muted-foreground" />
    case "calendar": return <Calendar className="h-4 w-4 text-muted-foreground" />
    default: return <FileText className="h-4 w-4 text-muted-foreground" />
  }
}

export const StatCard: React.FC<{ card: StatCardVM }> = ({ card }) => {
  const isProgress = card.iconName === "calendar"
  const progressMatch = card.subtitle.match(/(\d+)% complete/)
  const progressPercentage = progressMatch ? parseInt(progressMatch[1]) : 0

  return (
    <Card className="border-0 shadow-sm bg-background">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
        {getIcon(card.iconName)}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{card.value}</div>
        <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
        {isProgress && <Progress value={progressPercentage} className="mt-3" />}
      </CardContent>
    </Card>
  )
}

export const StatisticsCards: React.FC<{ vm: LandingPageVM }> = ({ vm }) => {
  useSignals()

  if (vm.stats$.value.length === 0) return null

  return (
    <div className="grid md:grid-cols-3 gap-4 mb-8">
      {vm.stats$.value.map((card, idx) => (
        <StatCard key={idx} card={card} />
      ))}
    </div>
  )
}

// ============================================================================
// COMPONENTS - Analytics Section (now VM-driven)
// ============================================================================

export const AnalyticsSection: React.FC<{ vm: LandingPageVM }> = ({ vm }) => {
  useSignals()

  return (
    <div className="space-y-8 mb-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Live Analytics</h2>
        <p className="text-muted-foreground">Real-time insights into the selection process</p>
      </div>
      <div className="flex flex-col gap-6">
        <RankingEventsChart granularity="by-minute" hours={48} />
        {vm.showAnalytics$.value && (
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
// COMPONENTS - Assignment Display (now VM-driven)
// ============================================================================

export const PersonalAssignmentDisplay: React.FC<{ vm: LandingPageVM }> = ({ vm }) => {
  useSignals()

  return Option.match(vm.myAssignment$.value, {
    onNone: () => null,
    onSome: (assignment) => (
      <Card className="max-w-2xl border-0 shadow-lg bg-primary text-primary-foreground">
        <CardContent className="text-center p-12">
          <h1 className="text-3xl font-bold tracking-tight mb-4">
            Your Assignment
          </h1>
          <p className="text-lg opacity-90 mb-6">
            You have been assigned to:
          </p>
          <h2 className="text-4xl font-bold">
            {assignment.topicTitle}
          </h2>
          {assignment.topicDescription && (
            <p className="mt-4 text-base opacity-80">
              {assignment.topicDescription}
            </p>
          )}
        </CardContent>
      </Card>
    )
  })
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

export const AllAssignmentsDisplay: React.FC<{ vm: LandingPageVM; periodId: Id<"selectionPeriods"> }> = ({ vm, periodId }) => {
  useSignals()
  const router = useRouter()
  const currentPeriod = vm.currentPeriod$.value

  const handleBackToHome = () => {
    // Clear student ID from localStorage and VM
    clearStudentId()
    vm.setStudentId(null)
    // Navigate to home page (will show portal view)
    router.push("/")
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-start mb-6">
        <Button 
          variant="outline" 
          size="lg"
          onClick={handleBackToHome}
          className="border-2 hover:bg-accent hover:border-primary/50 transition-colors shadow-sm"
        >
          <Home className="mr-2 h-5 w-5" />
          Back to Portal
        </Button>
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Assignment Results</h2>
        {currentPeriod && (
          <p className="text-lg font-semibold text-primary mb-2">
            {currentPeriod.title}
          </p>
        )}
        <p className="text-muted-foreground">
          {Option.match(vm.studentId$.value, {
            onNone: () => "Enter your student ID to view your assignment",
            onSome: (id) => `Student ID: ${id}`
          })}
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
          <AssignmentDisplay periodId={periodId} studentId={Option.getOrUndefined(vm.studentId$.value)} />
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// LOADING STATES (VM-aware)
// ============================================================================

export const LoadingState: React.FC<{ vm: LandingPageVM }> = ({ vm }) => {
  useSignals()

  if (!vm.isLoading$.value) return null

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse space-y-4">
        <div className="h-12 w-48 bg-primary/20 rounded"></div>
        <div className="h-4 w-32 bg-primary/20 rounded"></div>
      </div>
    </div>
  )
}

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