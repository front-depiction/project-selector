"use client"
import { signal, computed, ReadonlySignal } from "@preact/signals-react"
import { useQuery } from "convex-helpers/react/cache/hooks"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { getStudentId } from "@/lib/student"
import * as SelectionPeriod from "@/convex/schemas/SelectionPeriod"
import { useEffect } from "react"

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
  readonly banner$: ReadonlySignal<BannerVM | null>
  readonly stats$: ReadonlySignal<readonly StatCardVM[]>
  readonly competitionData$: ReadonlySignal<readonly CompetitionDataVM[]>
  readonly studentId$: ReadonlySignal<string | null>
  readonly myAssignment$: ReadonlySignal<AssignmentVM | null>
  readonly showAnalytics$: ReadonlySignal<boolean>
  readonly currentPeriodId$: ReadonlySignal<Id<"selectionPeriods"> | null>

  // Actions
  readonly setStudentId: (id: string | null) => void
}

// ============================================================================
// Hook - uses Convex as reactive primitive directly
// ============================================================================

export function useLandingPageVM(): LandingPageVM {
  // Convex queries - already reactive!
  const stats = useQuery(api.stats.getLandingStats)
  const competitionData = useQuery(api.analytics.getTopicCompetitionLevels)
  const currentPeriod = useQuery(api.admin.getCurrentPeriod)

  // Student ID state
  const studentId$ = signal<string | null>(null)

  // Initialize student ID from localStorage on mount
  useEffect(() => {
    const id = getStudentId()
    studentId$.value = id
  }, [])

  // Query assignment only when we have a period and student ID
  const myAssignment = useQuery(
    api.assignments.getMyAssignment,
    currentPeriod && SelectionPeriod.isAssigned(currentPeriod) && studentId$.value
      ? { periodId: currentPeriod._id, studentId: studentId$.value }
      : "skip"
  )

  // ============================================================================
  // Computed: Loading state
  // ============================================================================

  const isLoading$ = computed(() => {
    return stats === undefined || competitionData === undefined || currentPeriod === undefined
  })

  // ============================================================================
  // Computed: Status
  // ============================================================================

  const status$ = computed((): StatusVM => {
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
    return stats?.isActive ?? false
  })

  // ============================================================================
  // Computed: Banner
  // ============================================================================

  const banner$ = computed((): BannerVM | null => {
    if (!stats || !stats.isActive || !currentPeriod) {
      return null
    }

    return SelectionPeriod.matchOptional(currentPeriod)({
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
  })

  // ============================================================================
  // Computed: Statistics Cards
  // ============================================================================

  const stats$ = computed((): readonly StatCardVM[] => {
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

  const competitionData$ = computed((): readonly CompetitionDataVM[] => {
    if (!competitionData || !Array.isArray(competitionData)) return []
    return competitionData
  })

  // ============================================================================
  // Computed: Show Analytics
  // ============================================================================

  const showAnalytics$ = computed(() => {
    return !!(competitionData && Array.isArray(competitionData) && competitionData.length > 0)
  })

  // ============================================================================
  // Computed: Current Period ID
  // ============================================================================

  const currentPeriodId$ = computed((): Id<"selectionPeriods"> | null => {
    return currentPeriod?._id ?? null
  })

  // ============================================================================
  // Computed: My Assignment
  // ============================================================================

  const myAssignment$ = computed((): AssignmentVM | null => {
    if (!myAssignment || !myAssignment.topic) {
      return null
    }

    return {
      topicTitle: myAssignment.topic.title,
      topicDescription: myAssignment.topic.description ?? null,
      wasPreference: myAssignment.wasPreference,
      wasTopChoice: myAssignment.wasTopChoice
    }
  })

  // ============================================================================
  // Actions
  // ============================================================================

  const setStudentId = (id: string | null): void => {
    studentId$.value = id
  }

  return {
    isActive$,
    isLoading$,
    status$,
    banner$,
    stats$,
    competitionData$,
    studentId$,
    myAssignment$,
    showAnalytics$,
    currentPeriodId$,
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
