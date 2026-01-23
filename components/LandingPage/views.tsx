"use client"

import * as React from "react"
import { signal } from "@preact/signals-react"
import { useQuery } from "convex-helpers/react/cache/hooks"
import { api } from "@/convex/_generated/api"
import { getStudentId } from "@/lib/student"
import * as LP from "./LandingPage"
import { Separator } from "@/components/ui/separator"
import { Id } from "@/convex/_generated/dataModel"
import * as SelectionPeriod from "@/convex/schemas/SelectionPeriod"
import * as Option from "effect/Option"
import { createLandingPageVM } from "./LandingPageVM"

// ============================================================================
// Hook to create VM with Convex queries
// ============================================================================

function useLandingPageVM() {
  // Convex queries - already reactive!
  const stats = useQuery(api.stats.getLandingStats)
  const competitionData = useQuery(api.analytics.getTopicCompetitionLevels)
  const currentPeriod = useQuery(api.admin.getCurrentPeriod)

  // Get initial student ID from localStorage
  const [initialStudentId] = React.useState(() => getStudentId())

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

  // Query assignment only when we have a period and student ID
  const studentIdRef = React.useRef<string | null>(initialStudentId)

  const myAssignment = useQuery(
    api.assignments.getMyAssignment,
    currentPeriod && SelectionPeriod.isAssigned(currentPeriod) && studentIdRef.current
      ? { periodId: currentPeriod._id, studentId: studentIdRef.current }
      : "skip"
  )

  React.useEffect(() => {
    myAssignment$.value = myAssignment
  }, [myAssignment, myAssignment$])

  // Create VM once with stable dependencies
  const vm = React.useMemo(
    () => createLandingPageVM({
      stats$,
      competitionData$,
      currentPeriod$,
      myAssignment$,
      initialStudentId
    }),
    [stats$, competitionData$, currentPeriod$, myAssignment$, initialStudentId]
  )

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

export const AllAssignmentsView: React.FC<AllAssignmentsViewProps> = ({ vm, periodId }) => (
  <LP.Frame>
    <LP.Header>
      <LP.HeaderDescription>
        Topics have been assigned to all students
      </LP.HeaderDescription>
    </LP.Header>
    <LP.AllAssignmentsDisplay vm={vm} periodId={periodId} />
    <LP.Footer />
  </LP.Frame>
)

// ============================================================================
// MAIN LANDING PAGE COMPONENT
// ============================================================================

interface LandingPageContentProps {
  readonly vm: ReturnType<typeof createLandingPageVM>
}

export const LandingPageContent: React.FC<LandingPageContentProps> = ({ vm }) => {
  const { stats, currentPeriod, studentId, myAssignment } = LP.useLandingPage()

  // Loading state
  if (stats === undefined || currentPeriod === undefined) {
    return <LP.LoadingState vm={vm} />
  }

  // No active period
  if (currentPeriod === null) {
    return <InactivePeriodView />
  }

  // Use pattern matching for different period states
  return SelectionPeriod.match(currentPeriod)({
    inactive: () => <InactivePeriodView />,

    open: () => <SelectionView vm={vm} />,

    closed: () => <InactivePeriodView />,

    assigned: (period) => {
      if (!studentId)
        return <AllAssignmentsView vm={vm} periodId={period._id} />

      switch (myAssignment) {
        case undefined:
          return <LP.LoadingAssignment studentId={studentId} />
        case null:
          return <LP.NoAssignmentFound studentId={studentId} />
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