"use client"
import { signal, computed, ReadonlySignal } from "@preact/signals-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import type { SelectionPeriod } from "@/convex/schemas/SelectionPeriod"
import * as SelectionPeriodModule from "@/convex/schemas/SelectionPeriod"
import { format } from "date-fns"

// ============================================================================
// View Model Types
// ============================================================================

export type ViewType = "overview" | "periods" | "topics" | "students" | "analytics" | "questionnaires" | "settings"

export interface PeriodItemVM {
  readonly key: string
  readonly title: string
  readonly statusDisplay: string
  readonly statusVariant: "default" | "secondary" | "outline"
  readonly statusColor: string
  readonly openDateDisplay: string
  readonly closeDateDisplay: string
  readonly studentCount: number
  readonly assignmentCount: number
  readonly setActive: () => void
  readonly edit: () => void
  readonly remove: () => void
  readonly canSetActive: boolean
}

export interface TopicItemVM {
  readonly key: string
  readonly title: string
  readonly description: string
  readonly statusDisplay: string
  readonly statusVariant: "default" | "secondary"
  readonly subtopicCount: number
  readonly selectionCount: number
  readonly toggleActive: () => void
  readonly edit: () => void
  readonly remove: () => void
}

export interface AssignmentItemVM {
  readonly key: string
  readonly studentId: string
  readonly topicTitle: string
  readonly preferenceRank: number
  readonly isMatched: boolean
  readonly matchDisplay: string
  readonly matchVariant: "outline"
  readonly matchColor: string
  readonly rankDisplay: string
  readonly rankVariant: "default" | "secondary"
  readonly statusDisplay: string
  readonly statusColor: string
}

export interface StatsVM {
  readonly totalTopicsDisplay: string
  readonly activeTopicsDisplay: string
  readonly totalStudentsDisplay: string
  readonly averageSelectionsDisplay: string
  readonly matchRateDisplay: string
  readonly topChoiceRateDisplay: string
  readonly currentPeriodDisplay: string
  readonly currentPeriodVariant: string
}

export interface DashboardVM {
  readonly activeView$: ReadonlySignal<ViewType>
  readonly periods$: ReadonlySignal<readonly PeriodItemVM[]>
  readonly topics$: ReadonlySignal<readonly TopicItemVM[]>
  readonly assignments$: ReadonlySignal<readonly AssignmentItemVM[]>
  readonly currentPeriod$: ReadonlySignal<Doc<"selectionPeriods"> | null | undefined>
  readonly stats$: ReadonlySignal<StatsVM>
  readonly hasAssignments$: ReadonlySignal<boolean>
  readonly hasPeriods$: ReadonlySignal<boolean>
  readonly hasTopics$: ReadonlySignal<boolean>

  // Actions
  readonly setActiveView: (view: ViewType) => void
  readonly createPeriod: (data: PeriodFormData) => void
  readonly updatePeriod: (id: Id<"selectionPeriods">, updates: Partial<PeriodFormData>) => void
  readonly deletePeriod: (id: Id<"selectionPeriods">) => void
  readonly setActivePeriod: (id: Id<"selectionPeriods">) => void
  readonly createTopic: (data: TopicFormData) => void
  readonly updateTopic: (id: Id<"topics">, updates: Partial<TopicFormData>) => void
  readonly toggleTopicActive: (id: Id<"topics">) => void
  readonly deleteTopic: (id: Id<"topics">) => void
  readonly assignTopics: (periodId: Id<"selectionPeriods">) => void
  readonly seedTestData: () => void
  readonly clearAllData: () => void

  // For dialog management (child components need these)
  readonly onEditPeriod: (period: PeriodItemVM) => void
  readonly onEditTopic: (topic: TopicItemVM) => void

  // Raw data for child components that need full objects
  readonly subtopics: readonly Doc<"subtopics">[] | undefined
  readonly topicAnalytics: readonly unknown[] | undefined
}

export interface PeriodFormData {
  readonly title: string
  readonly description: string
  readonly semesterId: string
  readonly openDate: Date
  readonly closeDate: Date
  readonly setAsActive?: boolean
}

export interface TopicFormData {
  readonly title: string
  readonly description: string
  readonly semesterId: string
  readonly subtopicIds?: readonly Id<"subtopics">[]
}

// ============================================================================
// Hook - uses Convex as reactive primitive directly
// ============================================================================

export function useDashboardVM(options?: {
  onEditPeriod?: (period: Doc<"selectionPeriods"> & { studentCount?: number; assignmentCount?: number }) => void
  onEditTopic?: (topic: Doc<"topics">) => void
}): DashboardVM {
  // Reactive state
  const activeView$ = signal<ViewType>("overview")

  // Convex queries - already reactive!
  const periodsData = useQuery(api.selectionPeriods.getAllPeriodsWithStats)
  const topicsData = useQuery(api.topics.getAllTopics, {})
  const subtopicsData = useQuery(api.subtopics.getAllSubtopics, {})
  const currentPeriodData = useQuery(api.admin.getCurrentPeriod)
  const statsData = useQuery(api.stats.getLandingStats)
  const topicAnalyticsData = useQuery(api.topicAnalytics.getTopicPerformanceAnalytics, {})

  // Convex mutations
  const createPeriodMutation = useMutation(api.selectionPeriods.createPeriod)
  const updatePeriodMutation = useMutation(api.selectionPeriods.updatePeriod)
  const deletePeriodMutation = useMutation(api.selectionPeriods.deletePeriod)
  const setActivePeriodMutation = useMutation(api.selectionPeriods.setActivePeriod)
  const createTopicMutation = useMutation(api.admin.createTopic)
  const updateTopicMutation = useMutation(api.admin.updateTopic)
  const deleteTopicMutation = useMutation(api.admin.deleteTopic)
  const toggleTopicActiveMutation = useMutation(api.admin.toggleTopicActive)
  const seedTestDataMutation = useMutation(api.admin.seedTestData)
  const clearAllDataMutation = useMutation(api.admin.clearAllData)

  // Computed: mock assignments based on current period
  // (Will be replaced with real data when available)
  const assignments$ = computed((): readonly AssignmentItemVM[] => {
    const period = currentPeriodData
    if (!period) return []

    return SelectionPeriodModule.match(period)({
      assigned: () => [
        {
          key: "a1",
          studentId: "#6367261",
          topicTitle: "ML Recommendation System",
          preferenceRank: 5,
          isMatched: true,
          matchDisplay: "✓ Matched",
          matchVariant: "outline" as const,
          matchColor: "text-green-600 border-green-600",
          rankDisplay: "#5",
          rankVariant: "secondary" as const,
          statusDisplay: "assigned",
          statusColor: "bg-purple-600 text-white"
        },
        {
          key: "a2",
          studentId: "#6367262",
          topicTitle: "Blockchain Smart Contracts",
          preferenceRank: 1,
          isMatched: true,
          matchDisplay: "✓ Matched",
          matchVariant: "outline" as const,
          matchColor: "text-green-600 border-green-600",
          rankDisplay: "#1",
          rankVariant: "default" as const,
          statusDisplay: "assigned",
          statusColor: "bg-purple-600 text-white"
        },
        {
          key: "a3",
          studentId: "#6367263",
          topicTitle: "Cloud Migration Strategy",
          preferenceRank: 2,
          isMatched: true,
          matchDisplay: "✓ Matched",
          matchVariant: "outline" as const,
          matchColor: "text-green-600 border-green-600",
          rankDisplay: "#2",
          rankVariant: "default" as const,
          statusDisplay: "assigned",
          statusColor: "bg-purple-600 text-white"
        },
      ],
      open: () => [],
      inactive: () => [],
      closed: () => []
    })
  })

  // Computed: periods list for table
  const periods$ = computed((): readonly PeriodItemVM[] =>
    (periodsData ?? []).map((p): PeriodItemVM => {
      const status: { display: string; variant: "default" | "secondary" | "outline"; color: string } = SelectionPeriodModule.match(p)({
        open: () => ({ display: "OPEN", variant: "default" as "default" | "secondary" | "outline", color: "bg-green-600 text-white" }),
        inactive: () => ({ display: "INACTIVE", variant: "secondary" as "default" | "secondary" | "outline", color: "bg-blue-600 text-white" }),
        closed: () => ({ display: "CLOSED", variant: "outline" as "default" | "secondary" | "outline", color: "bg-red-600 text-white" }),
        assigned: () => ({ display: "ASSIGNED", variant: "secondary" as "default" | "secondary" | "outline", color: "bg-purple-600 text-white" })
      })

      const canSetActive = SelectionPeriodModule.match(p)({
        open: () => false,
        inactive: () => true,
        closed: () => true,
        assigned: () => true
      })

      return {
        key: p._id,
        title: p.title,
        statusDisplay: status.display,
        statusVariant: status.variant,
        statusColor: status.color,
        openDateDisplay: format(p.openDate, "MMM d, yyyy"),
        closeDateDisplay: format(p.closeDate, "MMM d, yyyy"),
        studentCount: p.studentCount ?? 0,
        assignmentCount: p.assignmentCount ?? 0,
        setActive: () => {
          setActivePeriodMutation({ periodId: p._id }).catch(console.error)
        },
        edit: () => {
          options?.onEditPeriod?.(p)
        },
        remove: () => {
          deletePeriodMutation({ periodId: p._id }).catch(console.error)
        },
        canSetActive
      }
    })
  )

  // Computed: topics list for table
  const topics$ = computed((): readonly TopicItemVM[] =>
    (topicsData ?? []).map((t): TopicItemVM => ({
      key: t._id,
      title: t.title,
      description: t.description,
      statusDisplay: t.isActive ? "Active" : "Inactive",
      statusVariant: t.isActive ? "default" : "secondary",
      subtopicCount: t.subtopicIds?.length ?? 0,
      selectionCount: 0, // TODO: Add real selection count when available
      toggleActive: () => {
        toggleTopicActiveMutation({ id: t._id }).catch(console.error)
      },
      edit: () => {
        options?.onEditTopic?.(t)
      },
      remove: () => {
        deleteTopicMutation({ id: t._id }).catch(console.error)
      }
    }))
  )

  // Computed: current period signal (readonly wrapper)
  const currentPeriod$ = computed(() => currentPeriodData)

  // Computed: stats with pre-formatted displays
  const stats$ = computed((): StatsVM => {
    const activeTopicsCount = (topicsData ?? []).filter(t => t.isActive).length
    const totalTopicsCount = topicsData?.length ?? 0
    const totalStudents = statsData?.totalStudents ?? 0
    const totalSelections = statsData?.totalSelections ?? 0
    const avgSelections = statsData?.averageSelectionsPerStudent ?? 0

    const assignmentsArray = assignments$.value
    const matchedAssignments = assignmentsArray.filter(a => a.isMatched).length
    const topChoiceAssignments = assignmentsArray.filter(a => a.preferenceRank === 1).length
    const matchRate = assignmentsArray.length > 0 ? (matchedAssignments / assignmentsArray.length) * 100 : 0
    const topChoiceRate = assignmentsArray.length > 0 ? (topChoiceAssignments / assignmentsArray.length) * 100 : 0

    const currentPeriodDisplay = currentPeriodData
      ? SelectionPeriodModule.match(currentPeriodData)({
          open: () => "OPEN",
          assigned: () => "ASSIGNED",
          inactive: () => "INACTIVE",
          closed: () => "CLOSED"
        })
      : "NONE"

    const currentPeriodVariant = currentPeriodData
      ? SelectionPeriodModule.match(currentPeriodData)({
          open: () => "border-green-200 bg-green-50/50",
          assigned: () => "border-purple-200 bg-purple-50/50",
          inactive: () => "",
          closed: () => ""
        })
      : ""

    return {
      totalTopicsDisplay: String(totalTopicsCount),
      activeTopicsDisplay: String(activeTopicsCount),
      totalStudentsDisplay: String(totalStudents),
      averageSelectionsDisplay: avgSelections.toFixed(1),
      matchRateDisplay: `${matchRate.toFixed(0)}%`,
      topChoiceRateDisplay: `${topChoiceRate.toFixed(0)}%`,
      currentPeriodDisplay,
      currentPeriodVariant
    }
  })

  // Computed: helper booleans
  const hasAssignments$ = computed(() => assignments$.value.length > 0)
  const hasPeriods$ = computed(() => (periodsData ?? []).length > 0)
  const hasTopics$ = computed(() => (topicsData ?? []).length > 0)

  // Actions
  const setActiveView = (view: ViewType): void => {
    activeView$.value = view
  }

  const createPeriod = (data: PeriodFormData): void => {
    createPeriodMutation({
      title: data.title,
      description: data.description,
      semesterId: data.semesterId,
      openDate: data.openDate.getTime(),
      closeDate: data.closeDate.getTime(),
      setAsActive: data.setAsActive
    }).catch(console.error)
  }

  const updatePeriod = (id: Id<"selectionPeriods">, updates: Partial<PeriodFormData>): void => {
    updatePeriodMutation({
      periodId: id,
      title: updates.title,
      description: updates.description,
      openDate: updates.openDate?.getTime(),
      closeDate: updates.closeDate?.getTime()
    }).catch(console.error)
  }

  const deletePeriod = (id: Id<"selectionPeriods">): void => {
    deletePeriodMutation({ periodId: id }).catch(console.error)
  }

  const setActivePeriod = (id: Id<"selectionPeriods">): void => {
    setActivePeriodMutation({ periodId: id }).catch(console.error)
  }

  const createTopic = (data: TopicFormData): void => {
    createTopicMutation({
      title: data.title,
      description: data.description,
      semesterId: data.semesterId,
      subtopicIds: data.subtopicIds ? [...data.subtopicIds] : undefined
    }).catch(console.error)
  }

  const updateTopic = (id: Id<"topics">, updates: Partial<TopicFormData>): void => {
    updateTopicMutation({
      id,
      title: updates.title,
      description: updates.description,
      subtopicIds: updates.subtopicIds ? [...updates.subtopicIds] : undefined
    }).catch(console.error)
  }

  const toggleTopicActive = (id: Id<"topics">): void => {
    toggleTopicActiveMutation({ id }).catch(console.error)
  }

  const deleteTopic = (id: Id<"topics">): void => {
    deleteTopicMutation({ id }).catch(console.error)
  }

  const assignTopics = (_periodId: Id<"selectionPeriods">): void => {
    // TODO: Implement actual assignment logic
    console.log("Assign topics not yet implemented")
  }

  const seedTestData = (): void => {
    seedTestDataMutation({}).catch(console.error)
  }

  const clearAllData = (): void => {
    clearAllDataMutation({}).catch(console.error)
  }

  const onEditPeriod = (period: PeriodItemVM): void => {
    // Find the original period data and pass it to the callback
    const originalPeriod = periodsData?.find(p => p._id === period.key)
    if (originalPeriod && options?.onEditPeriod) {
      options.onEditPeriod(originalPeriod)
    }
  }

  const onEditTopic = (topic: TopicItemVM): void => {
    // Find the original topic data and pass it to the callback
    const originalTopic = topicsData?.find(t => t._id === topic.key)
    if (originalTopic && options?.onEditTopic) {
      options.onEditTopic(originalTopic)
    }
  }

  return {
    activeView$,
    periods$,
    topics$,
    assignments$,
    currentPeriod$,
    stats$,
    hasAssignments$,
    hasPeriods$,
    hasTopics$,
    setActiveView,
    createPeriod,
    updatePeriod,
    deletePeriod,
    setActivePeriod,
    createTopic,
    updateTopic,
    toggleTopicActive,
    deleteTopic,
    assignTopics,
    seedTestData,
    clearAllData,
    onEditPeriod,
    onEditTopic,
    subtopics: subtopicsData,
    topicAnalytics: topicAnalyticsData
  }
}
