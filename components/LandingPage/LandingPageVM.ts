import { signal, computed, ReadonlySignal } from "@preact/signals-react"
import type { Id, Doc } from "@/convex/_generated/dataModel"
import * as SelectionPeriod from "@/convex/schemas/SelectionPeriod"
import * as Option from "effect/Option"

// ============================================================================
// View Model Types
// ============================================================================

export interface StatCardVM {
  readonly label: string
  readonly value: string
  readonly subtitle: string
  readonly iconName: "fileText" | "users" | "calendar"
}

export interface TimerVM {
  readonly targetDate: number | null
  readonly display: string
}

export interface StatusVM {
  readonly status: "open" | "upcoming" | "closed" | "assigned" | "none"
  readonly statusText: string
  readonly statusColor: string
  readonly iconName: "checkCircle" | "clock" | "xCircle" | "users" | "alertCircle"
}

export interface PopularTopicVM {
  readonly key: string
  readonly title: string
  readonly countDisplay: string
}

export interface CompetitionDataVM {
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

export interface AssignmentVM {
  readonly topicTitle: string
  readonly topicDescription: string | null
  readonly wasPreference: boolean
  readonly wasTopChoice: boolean
}

export interface BannerVM {
  readonly isVisible: boolean
  readonly title: string
  readonly status: StatusVM
  readonly timer: TimerVM
}

export interface LandingPageVM {
  // Reactive state
  readonly isActive$: ReadonlySignal<boolean>
  readonly isLoading$: ReadonlySignal<boolean>
  readonly status$: ReadonlySignal<StatusVM>
  readonly banner$: ReadonlySignal<Option.Option<BannerVM>>
  readonly stats$: ReadonlySignal<readonly StatCardVM[]>
  readonly competitionData$: ReadonlySignal<readonly CompetitionDataVM[]>
  readonly studentId$: ReadonlySignal<Option.Option<string>>
  readonly myAssignment$: ReadonlySignal<Option.Option<AssignmentVM>>
  readonly showAnalytics$: ReadonlySignal<boolean>
  readonly currentPeriodId$: ReadonlySignal<Option.Option<Id<"selectionPeriods">>>
  readonly currentPeriod$: ReadonlySignal<Doc<"selectionPeriods"> | null | undefined>

  // Actions
  readonly setStudentId: (id: string | null) => void
}

// ============================================================================
// Dependency Types
// ============================================================================

export interface LandingStats {
  readonly isActive: boolean
  readonly title?: string
  readonly closeDate?: number
  readonly openDate?: number
  readonly totalTopics: number
  readonly totalStudents: number
  readonly totalSelections: number
  readonly averageSelectionsPerStudent: number
}

export interface AssignmentData {
  readonly topic: {
    readonly title: string
    readonly description?: string
  }
  readonly wasPreference: boolean
  readonly wasTopChoice: boolean
}

export interface LandingPageVMDeps {
  readonly stats$: ReadonlySignal<LandingStats | null | undefined>
  readonly competitionData$: ReadonlySignal<readonly CompetitionDataVM[] | null | undefined>
  readonly currentPeriod$: ReadonlySignal<Doc<"selectionPeriods"> | null | undefined>
  readonly myAssignment$: ReadonlySignal<AssignmentData | null | undefined>
  readonly initialStudentId: string | null
}

// ============================================================================
// Factory Function - creates VM with dependencies
// ============================================================================

export function createLandingPageVM(deps: LandingPageVMDeps): LandingPageVM {
  const { stats$, competitionData$, currentPeriod$, myAssignment$, initialStudentId } = deps

  // Student ID state
  const studentId$ = signal<Option.Option<string>>(Option.fromNullable(initialStudentId))

  // ============================================================================
  // Computed: Loading state
  // ============================================================================

  const isLoading$ = computed(() => {
    return stats$.value === undefined || competitionData$.value === undefined || currentPeriod$.value === undefined
  })

  // ============================================================================
  // Computed: Status
  // ============================================================================

  const status$ = computed((): StatusVM => {
    const currentPeriod = currentPeriod$.value

    if (!currentPeriod) {
      return {
        status: "none" as const,
        statusText: "No Active Period",
        statusColor: "bg-gray-500",
        iconName: "alertCircle" as const
      }
    }

    const result = SelectionPeriod.matchOptional(currentPeriod)({
      open: (): StatusVM => ({
        status: "open" as const,
        statusText: "Selection Open",
        statusColor: "bg-green-500",
        iconName: "checkCircle" as const
      }),
      inactive: (): StatusVM => ({
        status: "upcoming" as const,
        statusText: "Opening Soon",
        statusColor: "bg-blue-500",
        iconName: "clock" as const
      }),
      closed: (): StatusVM => ({
        status: "closed" as const,
        statusText: "Selection Closed",
        statusColor: "bg-red-500",
        iconName: "xCircle" as const
      }),
      assigned: (): StatusVM => ({
        status: "assigned" as const,
        statusText: "Topics Assigned",
        statusColor: "bg-purple-500",
        iconName: "users" as const
      }),
      none: (): StatusVM => ({
        status: "none" as const,
        statusText: "No Active Period",
        statusColor: "bg-gray-500",
        iconName: "alertCircle" as const
      })
    })

    return result
  })

  // ============================================================================
  // Computed: Active state
  // ============================================================================

  const isActive$ = computed(() => {
    return stats$.value?.isActive ?? false
  })

  // ============================================================================
  // Computed: Banner
  // ============================================================================

  const banner$ = computed((): Option.Option<BannerVM> => {
    const stats = stats$.value
    const currentPeriod = currentPeriod$.value

    if (!stats || !stats.isActive || !currentPeriod) {
      return Option.none()
    }

    const bannerOrNull = SelectionPeriod.matchOptional(currentPeriod)({
      open: () => ({
        isVisible: true,
        title: stats.title || "Selection",
        status: status$.value,
        timer: {
          targetDate: stats.closeDate ?? null,
          display: formatCountdown(stats.closeDate ?? null)
        }
      }),
      inactive: () => null,
      closed: () => null,
      assigned: () => null,
      none: () => null
    })

    return Option.fromNullable(bannerOrNull)
  })

  // ============================================================================
  // Computed: Statistics Cards
  // ============================================================================

  const stats_computed$ = computed((): readonly StatCardVM[] => {
    const stats = stats$.value
    if (!stats) return []

    const progressPercentage = stats.totalTopics > 0
      ? Math.min(100, Math.round((stats.totalSelections / (stats.totalTopics * 5)) * 100))
      : 0

    return [
      {
        label: "Total Topics",
        value: stats.totalTopics.toString(),
        subtitle: "Available projects",
        iconName: "fileText"
      },
      {
        label: "Students Participated",
        value: stats.totalStudents.toString(),
        subtitle: `Avg ${stats.averageSelectionsPerStudent.toFixed(1)} selections each`,
        iconName: "users"
      },
      {
        label: "Selection Progress",
        value: stats.totalSelections.toString(),
        subtitle: `${progressPercentage}% complete`,
        iconName: "calendar"
      }
    ]
  })

  // ============================================================================
  // Computed: Competition Data
  // ============================================================================

  const competitionData_computed$ = computed((): readonly CompetitionDataVM[] => {
    const competitionData = competitionData$.value
    if (!competitionData || !Array.isArray(competitionData)) return []
    return competitionData
  })

  // ============================================================================
  // Computed: Show Analytics
  // ============================================================================

  const showAnalytics$ = computed(() => {
    const competitionData = competitionData$.value
    return !!(competitionData && Array.isArray(competitionData) && competitionData.length > 0)
  })

  // ============================================================================
  // Computed: Current Period ID
  // ============================================================================

  const currentPeriodId$ = computed((): Option.Option<Id<"selectionPeriods">> => {
    return Option.fromNullable(currentPeriod$.value?._id)
  })

  // ============================================================================
  // Computed: My Assignment
  // ============================================================================

  const myAssignment_computed$ = computed((): Option.Option<AssignmentVM> => {
    const myAssignment = myAssignment$.value

    if (!myAssignment || !myAssignment.topic) {
      return Option.none()
    }

    return Option.some({
      topicTitle: myAssignment.topic.title,
      topicDescription: myAssignment.topic.description ?? null,
      wasPreference: myAssignment.wasPreference,
      wasTopChoice: myAssignment.wasTopChoice
    })
  })

  // ============================================================================
  // Actions
  // ============================================================================

  const setStudentId = (id: string | null): void => {
    studentId$.value = Option.fromNullable(id)
  }

  return {
    isActive$,
    isLoading$,
    status$,
    banner$,
    stats$: stats_computed$,
    competitionData$: competitionData_computed$,
    studentId$,
    myAssignment$: myAssignment_computed$,
    showAnalytics$,
    currentPeriodId$,
    currentPeriod$,
    setStudentId
  }
}

// ============================================================================
// Helpers
// ============================================================================

function formatCountdown(targetMs: number | null): string {
  if (!targetMs) return "--:--:--:--"

  const now = Date.now()
  const remaining = Math.max(0, targetMs - now)
  const totalSeconds = Math.floor(remaining / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${days.toString().padStart(2, "0")}:${hours
    .toString()
    .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`
}
