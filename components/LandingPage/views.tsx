"use client"

import * as React from "react"
import { signal } from "@preact/signals-react"
import { useQuery } from "convex-helpers/react/cache/hooks"
import { api } from "@/convex/_generated/api"
import * as LP from "./LandingPage"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, FileText, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Id } from "@/convex/_generated/dataModel"
import * as SelectionPeriod from "@/convex/schemas/SelectionPeriod"
import * as Option from "effect/Option"
import { createLandingPageVM } from "./LandingPageVM"

// ============================================================================
// Hook to create VM with Convex queries
// ============================================================================

function useLandingPageVM() {
  // Convex queries - already reactive!
  const stats = useQuery(api.stats.getLandingStats, {})
  const competitionData = useQuery(api.analytics.getTopicCompetitionLevels)
  
  // Get student ID from localStorage after mount (client-side only to avoid hydration mismatch)
  const [studentIdFromStorage, setStudentIdFromStorage] = React.useState<string | null>(null)
  
  React.useEffect(() => {
    try {
      const storedId = localStorage.getItem("studentId")
      if (storedId) {
        setStudentIdFromStorage(storedId)
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Get the period - use student-specific period if studentId is available, otherwise get current period
  const studentPeriod = useQuery(
    api.periodStudentAccessCodes.getPeriodForAccessCode,
    studentIdFromStorage ? { code: studentIdFromStorage } : "skip"
  )
  const currentPeriodGeneral = useQuery(api.admin.getCurrentPeriod)
  
  // Use student's specific period if available, otherwise fall back to general current period
  const currentPeriod = studentPeriod ?? currentPeriodGeneral

  // Create reactive signals for the VM dependencies
  const stats$ = React.useMemo(() => signal(stats), [])
  const competitionData$ = React.useMemo(() => signal(competitionData), [])
  const currentPeriod$ = React.useMemo(() => signal(currentPeriod), [])
  const myAssignment$ = React.useMemo(() => signal<any>(null), [])

  // Update signals when query data changes
  React.useEffect(() => {
    stats$.value = stats
  }, [stats, stats$])

  React.useEffect(() => {
    competitionData$.value = competitionData
  }, [competitionData, competitionData$])

  React.useEffect(() => {
    currentPeriod$.value = currentPeriod
  }, [currentPeriod, currentPeriod$])

  // Create VM once with stable dependencies (start with null studentId to avoid hydration mismatch)
  const vm = React.useMemo(
    () => createLandingPageVM({
      stats$,
      competitionData$,
      currentPeriod$,
      myAssignment$,
      initialStudentId: null // Always start with null, update from localStorage after mount
    }),
    [stats$, competitionData$, currentPeriod$, myAssignment$]
  )

  // Query assignment only when we have a period and student ID
  const studentIdRef = React.useRef<string | null>(null)

  // Read from localStorage after mount (client-side only to avoid hydration mismatch)
  // This allows students who logged in via portal to see their assignments
  React.useEffect(() => {
    if (studentIdFromStorage) {
      vm.setStudentId(studentIdFromStorage)
      studentIdRef.current = studentIdFromStorage
    }
  }, [vm, studentIdFromStorage])

  const myAssignment = useQuery(
    api.assignments.getMyAssignment,
    currentPeriod && SelectionPeriod.isAssigned(currentPeriod) && studentIdRef.current
      ? { periodId: currentPeriod._id, studentId: studentIdRef.current }
      : "skip"
  )

  React.useEffect(() => {
    myAssignment$.value = myAssignment
  }, [myAssignment, myAssignment$])

  // Update student ID ref when VM's studentId changes
  React.useEffect(() => {
    const unsubscribe = vm.studentId$.subscribe((studentIdOption) => {
      studentIdRef.current = Option.getOrNull(studentIdOption)
    })
    return unsubscribe
  }, [vm.studentId$])

  return vm
}

// ============================================================================
// COMPOSED VIEWS - Built from atomic components
// ============================================================================

export const InactivePeriodView: React.FC = () => (
  <LP.Frame>
    <LP.Header>
      <LP.HeaderDescription>
        No active selection period at this time
      </LP.HeaderDescription>
    </LP.Header>
    <LP.InactivePeriodCard />
    <LP.Footer />
  </LP.Frame>
)

interface SelectionViewProps {
  readonly vm: ReturnType<typeof createLandingPageVM>
}

export const SelectionView: React.FC<SelectionViewProps> = ({ vm }) => (
  <LP.Frame>
    <LP.Header>
      <LP.HeaderDescription>
        Choose your preferred project topics with real-time congestion feedback
        to maximize your chances of getting your top choices.
      </LP.HeaderDescription>
    </LP.Header>
    <LP.StatusBanner vm={vm} />
    <LP.ActionCards />
    <Separator className="my-8" />
    <LP.StatisticsCards vm={vm} />
    <LP.AnalyticsSection vm={vm} />
    <LP.FooterWithTagline />
  </LP.Frame>
)

interface PersonalAssignmentViewProps {
  readonly vm: ReturnType<typeof createLandingPageVM>
}

export const PersonalAssignmentView: React.FC<PersonalAssignmentViewProps> = ({ vm }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LP.PersonalAssignmentDisplay vm={vm} />
    </div>
  )
}

interface AllAssignmentsViewProps {
  readonly vm: ReturnType<typeof createLandingPageVM>
  readonly periodId: Id<"selectionPeriods">
}

export const AllAssignmentsView: React.FC<AllAssignmentsViewProps> = ({ vm, periodId }) => {
  const currentPeriod = vm.currentPeriod$.value
  
  return (
  <LP.Frame>
    <LP.Header>
      <LP.HeaderDescription>
          {currentPeriod 
            ? `Topics have been assigned for "${currentPeriod.title}"`
            : "Topics have been assigned to all students"
          }
      </LP.HeaderDescription>
    </LP.Header>
    <LP.AllAssignmentsDisplay vm={vm} periodId={periodId} />
    <LP.Footer />
  </LP.Frame>
)
}

// ============================================================================
// MAIN LANDING PAGE COMPONENT
// ============================================================================

interface LandingPageContentProps {
  readonly vm: ReturnType<typeof createLandingPageVM>
}

// Portal view for choosing between admin and student access
export const PortalView: React.FC = () => (
  <LP.Frame>
    <LP.Header>
      <LP.HeaderDescription>
        Welcome to the Project Topic Selection System
      </LP.HeaderDescription>
    </LP.Header>
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Admin Dashboard Card */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Admin Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Access the admin dashboard to manage project assignments, topics, and view analytics.
            </p>
            <Link href="/admin">
              <Button className="w-full" size="lg">
                Go to Admin Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Student Portal Card */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Student Portal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your access code to view topics, make selections, and check your assignment.
            </p>
            <Link href="/student">
              <Button className="w-full" size="lg" variant="outline">
                Go to Student Portal
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
    <LP.Footer />
  </LP.Frame>
)

export const LandingPageContent: React.FC<LandingPageContentProps> = ({ vm }) => {
  const { stats, currentPeriod, studentId, myAssignment } = LP.useLandingPage()

  // Loading state
  if (stats === undefined || currentPeriod === undefined) {
    return <LP.LoadingState vm={vm} />
  }

  // Show portal if no student ID is set (don't auto-load from localStorage)
  if (!studentId) {
    // No active period - show portal
    if (currentPeriod === null) {
      return <PortalView />
    }

    // Use pattern matching for different period states (without student ID)
    return SelectionPeriod.match(currentPeriod)({
      inactive: () => <PortalView />,
      open: () => <SelectionView vm={vm} />,
      closed: () => <PortalView />,
      assigned: () => <PortalView /> // Don't show assignments to non-logged-in users
    })
  }

  // Student ID is set - show student-specific views
  // No active period
  if (currentPeriod === null) {
    return <InactivePeriodView />
  }

  // Use pattern matching for different period states (with student ID)
  return SelectionPeriod.match(currentPeriod)({
    inactive: () => <InactivePeriodView />,
    open: () => <SelectionView vm={vm} />,
    closed: () => <InactivePeriodView />,
    assigned: (period) => {
      // Show assignment results for logged-in students when period is assigned
      switch (myAssignment) {
        case undefined:
          return <LP.LoadingAssignment studentId={studentId} />
        case null:
          // Show all assignments view even if student has no assignment
          return <AllAssignmentsView vm={vm} periodId={period._id} />
        default:
          return <PersonalAssignmentView vm={vm} />
      }
    }
  })
}

// ============================================================================
// ROOT COMPONENT WITH PROVIDER
// ============================================================================

export const LandingPage: React.FC = () => {
  const vm = useLandingPageVM()

  return (
    <LP.Provider vm={vm}>
      <LandingPageContent vm={vm} />
    </LP.Provider>
  )
}