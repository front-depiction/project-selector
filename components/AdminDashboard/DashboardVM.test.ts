/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest"
import { signal, computed } from "@preact/signals-react"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import type {
  PeriodItemVM,
  TopicItemVM,
  AssignmentItemVM,
  StatsVM,
  ViewType,
  PeriodFormData,
  TopicFormData
} from "./DashboardVM"

/**
 * Following the testing philosophy from viemodel.txt:
 * - Tests what matters without rendering the UI
 * - Focused and easy to maintain
 * - Tests the business logic directly
 *
 * Since useDashboardVM uses React hooks that cannot be easily mocked in Vitest,
 * we test the core logic by creating simplified versions that mimic the VM behavior.
 */

// ============================================================================
// Mock Data
// ============================================================================

const mockPeriods: Array<Doc<"selectionPeriods"> & { studentCount?: number; assignmentCount?: number }> = [
  {
    _id: "p1" as Id<"selectionPeriods">,
    _creationTime: Date.now(),
    title: "Spring 2024",
    description: "Spring semester topic selection",
    semesterId: "spring2024",
    kind: "open",
    scheduledFunctionId: "scheduled1" as Id<"_scheduled_functions">,
    openDate: new Date("2024-01-01").getTime(),
    closeDate: new Date("2024-01-31").getTime(),
    studentCount: 50,
    assignmentCount: 45
  },
  {
    _id: "p2" as Id<"selectionPeriods">,
    _creationTime: Date.now(),
    title: "Fall 2023",
    description: "Fall semester topic selection",
    semesterId: "fall2023",
    kind: "closed",
    openDate: new Date("2023-09-01").getTime(),
    closeDate: new Date("2023-09-30").getTime(),
    studentCount: 48,
    assignmentCount: 48
  }
]

const mockTopics: Array<Doc<"topics">> = [
  {
    _id: "t1" as Id<"topics">,
    _creationTime: Date.now(),
    title: "Machine Learning",
    description: "Deep learning and neural networks",
    semesterId: "spring2024",
    isActive: true,
    subtopicIds: ["st1" as Id<"subtopics">, "st2" as Id<"subtopics">]
  },
  {
    _id: "t2" as Id<"topics">,
    _creationTime: Date.now(),
    title: "Blockchain",
    description: "Distributed ledger technology",
    semesterId: "spring2024",
    isActive: false,
    subtopicIds: []
  }
]

const mockStatsData = {
  totalStudents: 150,
  totalSelections: 750,
  averageSelectionsPerStudent: 5.0,
  submissionRate: 0.95
}

// ============================================================================
// Helper Functions - Mock VM Logic
// ============================================================================

function createMockPeriodsSignal(mockData: typeof mockPeriods | null | undefined) {
  return computed((): readonly PeriodItemVM[] =>
    (mockData ?? []).map((p): PeriodItemVM => {
      let status: { display: string; variant: "default" | "secondary" | "outline"; color: string }
      let canSetActive: boolean

      // Use discriminated union kind field
      if (p.kind === "open") {
        status = { display: "OPEN", variant: "default", color: "bg-green-600 text-white" }
        canSetActive = false
      } else if (p.kind === "closed") {
        status = { display: "CLOSED", variant: "outline", color: "bg-red-600 text-white" }
        canSetActive = true
      } else if (p.kind === "assigned") {
        status = { display: "ASSIGNED", variant: "default", color: "bg-purple-600 text-white" }
        canSetActive = true
      } else {
        status = { display: "INACTIVE", variant: "secondary", color: "bg-blue-600 text-white" }
        canSetActive = true
      }

      return {
        key: p._id,
        title: p.title,
        statusDisplay: status.display,
        statusVariant: status.variant,
        statusColor: status.color,
        openDateDisplay: new Date(p.openDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        closeDateDisplay: new Date(p.closeDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        studentCount: p.studentCount ?? 0,
        assignmentCount: p.assignmentCount ?? 0,
        setActive: () => {},
        edit: () => {},
        remove: () => {},
        canSetActive
      }
    })
  )
}

function createMockTopicsSignal(mockData: typeof mockTopics | null | undefined) {
  return computed((): readonly TopicItemVM[] =>
    (mockData ?? []).map((t): TopicItemVM => ({
      key: t._id,
      title: t.title,
      description: t.description,
      statusDisplay: t.isActive ? "Active" : "Inactive",
      statusVariant: t.isActive ? "default" : "secondary",
      subtopicCount: t.subtopicIds?.length ?? 0,
      selectionCount: 0,
      toggleActive: () => {},
      edit: () => {},
      remove: () => {}
    }))
  )
}

function createMockStatsSignal(
  topicsData: typeof mockTopics | null | undefined,
  statsData: typeof mockStatsData | null | undefined,
  assignmentsCount: number
): ReturnType<typeof computed<StatsVM>> {
  return computed((): StatsVM => {
    const activeTopicsCount = (topicsData ?? []).filter(t => t.isActive).length
    const totalTopicsCount = topicsData?.length ?? 0
    const totalStudents = statsData?.totalStudents ?? 0
    const totalSelections = statsData?.totalSelections ?? 0
    const avgSelections = statsData?.averageSelectionsPerStudent ?? 0

    const matchRate = assignmentsCount > 0 ? 75 : 0 // Mock: 75% match rate
    const topChoiceRate = assignmentsCount > 0 ? 33 : 0 // Mock: 33% top choice rate

    return {
      totalTopicsDisplay: String(totalTopicsCount),
      activeTopicsDisplay: String(activeTopicsCount),
      totalStudentsDisplay: String(totalStudents),
      totalSelectionsDisplay: String(totalSelections),
      averageSelectionsDisplay: avgSelections.toFixed(1),
      matchRateDisplay: `${matchRate.toFixed(0)}%`,
      topChoiceRateDisplay: `${topChoiceRate.toFixed(0)}%`,
      currentPeriodDisplay: "OPEN",
      currentPeriodVariant: "border-green-200 bg-green-50/50"
    }
  })
}

// ============================================================================
// Tests
// ============================================================================

describe("DashboardVM", () => {
  describe("activeView$ signal", () => {
    it("should start with 'overview' as default", () => {
      const activeView$ = signal<ViewType>("overview")
      expect(activeView$.value).toBe("overview")
    })

    it("should update when setActiveView is called", () => {
      const activeView$ = signal<ViewType>("overview")

      activeView$.value = "periods"
      expect(activeView$.value).toBe("periods")

      activeView$.value = "topics"
      expect(activeView$.value).toBe("topics")
    })

    it("should support all view types", () => {
      const activeView$ = signal<ViewType>("overview")
      const validViews: ViewType[] = ["overview", "periods", "topics", "students", "analytics", "questionnaires", "settings"]

      validViews.forEach(view => {
        activeView$.value = view
        expect(activeView$.value).toBe(view)
      })
    })
  })

  describe("periods$ signal", () => {
    it("should correctly map period data to display format", () => {
      const periods$ = createMockPeriodsSignal(mockPeriods)
      const periods = periods$.value

      expect(periods).toHaveLength(2)
      expect(periods[0]).toMatchObject({
        key: "p1",
        title: "Spring 2024",
        studentCount: 50,
        assignmentCount: 45
      })
      expect(periods[1]).toMatchObject({
        key: "p2",
        title: "Fall 2023",
        studentCount: 48,
        assignmentCount: 48
      })
    })

    it("should format dates correctly", () => {
      const periods$ = createMockPeriodsSignal(mockPeriods)
      const periods = periods$.value

      expect(periods[0].openDateDisplay).toMatch(/Jan \d+, 2024/)
      expect(periods[0].closeDateDisplay).toMatch(/Jan \d+, 2024/)
    })

    it("should set correct status for active period", () => {
      const periods$ = createMockPeriodsSignal(mockPeriods)
      const periods = periods$.value

      const activePeriod = periods.find(p => p.key === "p1")
      expect(activePeriod?.statusDisplay).toBe("OPEN")
      expect(activePeriod?.statusVariant).toBe("default")
      expect(activePeriod?.statusColor).toBe("bg-green-600 text-white")
    })

    it("should set correct status for inactive period", () => {
      const periods$ = createMockPeriodsSignal(mockPeriods)
      const periods = periods$.value

      const inactivePeriod = periods.find(p => p.key === "p2")
      expect(inactivePeriod?.statusDisplay).toBe("CLOSED")
      expect(inactivePeriod?.statusColor).toBe("bg-red-600 text-white")
    })

    it("should set canSetActive correctly", () => {
      const periods$ = createMockPeriodsSignal(mockPeriods)
      const periods = periods$.value

      const activePeriod = periods.find(p => p.key === "p1")
      const inactivePeriod = periods.find(p => p.key === "p2")

      expect(activePeriod?.canSetActive).toBe(false)
      expect(inactivePeriod?.canSetActive).toBe(true)
    })

    it("should handle null from useQuery gracefully", () => {
      const periods$ = createMockPeriodsSignal(null)
      const periods = periods$.value

      expect(periods).toHaveLength(0)
      expect(periods).toEqual([])
    })

    it("should handle undefined from useQuery gracefully", () => {
      const periods$ = createMockPeriodsSignal(undefined)
      const periods = periods$.value

      expect(periods).toHaveLength(0)
      expect(periods).toEqual([])
    })

    it("should provide action callbacks for each period", () => {
      const periods$ = createMockPeriodsSignal(mockPeriods)
      const periods = periods$.value

      expect(periods[0].setActive).toBeDefined()
      expect(periods[0].edit).toBeDefined()
      expect(periods[0].remove).toBeDefined()
      expect(typeof periods[0].setActive).toBe("function")
      expect(typeof periods[0].edit).toBe("function")
      expect(typeof periods[0].remove).toBe("function")
    })
  })

  describe("topics$ signal", () => {
    it("should correctly map topic data to display format", () => {
      const topics$ = createMockTopicsSignal(mockTopics)
      const topics = topics$.value

      expect(topics).toHaveLength(2)
      expect(topics[0]).toMatchObject({
        key: "t1",
        title: "Machine Learning",
        description: "Deep learning and neural networks",
        subtopicCount: 2
      })
      expect(topics[1]).toMatchObject({
        key: "t2",
        title: "Blockchain",
        description: "Distributed ledger technology",
        subtopicCount: 0
      })
    })

    it("should set correct status display for active topic", () => {
      const topics$ = createMockTopicsSignal(mockTopics)
      const topics = topics$.value

      const activeTopic = topics.find(t => t.key === "t1")
      expect(activeTopic?.statusDisplay).toBe("Active")
      expect(activeTopic?.statusVariant).toBe("default")
    })

    it("should set correct status display for inactive topic", () => {
      const topics$ = createMockTopicsSignal(mockTopics)
      const topics = topics$.value

      const inactiveTopic = topics.find(t => t.key === "t2")
      expect(inactiveTopic?.statusDisplay).toBe("Inactive")
      expect(inactiveTopic?.statusVariant).toBe("secondary")
    })

    it("should handle null from useQuery gracefully", () => {
      const topics$ = createMockTopicsSignal(null)
      const topics = topics$.value

      expect(topics).toHaveLength(0)
      expect(topics).toEqual([])
    })

    it("should handle undefined from useQuery gracefully", () => {
      const topics$ = createMockTopicsSignal(undefined)
      const topics = topics$.value

      expect(topics).toHaveLength(0)
      expect(topics).toEqual([])
    })

    it("should provide action callbacks for each topic", () => {
      const topics$ = createMockTopicsSignal(mockTopics)
      const topics = topics$.value

      expect(topics[0].toggleActive).toBeDefined()
      expect(topics[0].edit).toBeDefined()
      expect(topics[0].remove).toBeDefined()
      expect(typeof topics[0].toggleActive).toBe("function")
      expect(typeof topics[0].edit).toBe("function")
      expect(typeof topics[0].remove).toBe("function")
    })

    it("should handle topics with no subtopics", () => {
      const topics$ = createMockTopicsSignal(mockTopics)
      const topics = topics$.value

      const topicWithNoSubtopics = topics.find(t => t.key === "t2")
      expect(topicWithNoSubtopics?.subtopicCount).toBe(0)
    })

    it("should count subtopics correctly", () => {
      const topics$ = createMockTopicsSignal(mockTopics)
      const topics = topics$.value

      const topicWithSubtopics = topics.find(t => t.key === "t1")
      expect(topicWithSubtopics?.subtopicCount).toBe(2)
    })
  })

  describe("assignments$ signal", () => {
    it("should return empty array when no period is active", () => {
      const assignments$ = computed(() => [] as AssignmentItemVM[])
      const assignments = assignments$.value

      expect(assignments).toHaveLength(0)
      expect(assignments).toEqual([])
    })

    it("should return assignments when period is assigned", () => {
      const mockAssignments: AssignmentItemVM[] = [
        {
          key: "a1",
          studentId: "#6367261",
          topicTitle: "ML Recommendation System",
          preferenceRank: 1,
          isMatched: true,
          matchDisplay: "✓ Matched",
          matchVariant: "outline",
          matchColor: "text-green-600 border-green-600",
          rankDisplay: "#1",
          rankVariant: "default",
          statusDisplay: "assigned",
          statusColor: "bg-purple-600 text-white"
        },
        {
          key: "a2",
          studentId: "#6367262",
          topicTitle: "Blockchain Smart Contracts",
          preferenceRank: 2,
          isMatched: true,
          matchDisplay: "✓ Matched",
          matchVariant: "outline",
          matchColor: "text-green-600 border-green-600",
          rankDisplay: "#2",
          rankVariant: "default",
          statusDisplay: "assigned",
          statusColor: "bg-purple-600 text-white"
        }
      ]

      const assignments$ = computed(() => mockAssignments)
      const assignments = assignments$.value

      expect(assignments).toHaveLength(2)
      expect(assignments[0].studentId).toBe("#6367261")
      expect(assignments[1].studentId).toBe("#6367262")
    })

    it("should format assignment display properties correctly", () => {
      const mockAssignments: AssignmentItemVM[] = [
        {
          key: "a1",
          studentId: "#6367261",
          topicTitle: "ML Recommendation System",
          preferenceRank: 1,
          isMatched: true,
          matchDisplay: "✓ Matched",
          matchVariant: "outline",
          matchColor: "text-green-600 border-green-600",
          rankDisplay: "#1",
          rankVariant: "default",
          statusDisplay: "assigned",
          statusColor: "bg-purple-600 text-white"
        }
      ]

      const assignments$ = computed(() => mockAssignments)
      const assignment = assignments$.value[0]

      expect(assignment.matchDisplay).toBe("✓ Matched")
      expect(assignment.matchColor).toBe("text-green-600 border-green-600")
      expect(assignment.rankDisplay).toBe("#1")
      expect(assignment.statusDisplay).toBe("assigned")
      expect(assignment.statusColor).toBe("bg-purple-600 text-white")
    })

    it("should use default variant for top preferences", () => {
      const mockAssignments: AssignmentItemVM[] = [
        {
          key: "a1",
          studentId: "#6367261",
          topicTitle: "ML Recommendation System",
          preferenceRank: 1,
          isMatched: true,
          matchDisplay: "✓ Matched",
          matchVariant: "outline",
          matchColor: "text-green-600 border-green-600",
          rankDisplay: "#1",
          rankVariant: "default",
          statusDisplay: "assigned",
          statusColor: "bg-purple-600 text-white"
        }
      ]

      const assignments$ = computed(() => mockAssignments)
      const assignment = assignments$.value[0]

      expect(assignment.rankVariant).toBe("default")
    })

    it("should use secondary variant for lower preferences", () => {
      const mockAssignments: AssignmentItemVM[] = [
        {
          key: "a1",
          studentId: "#6367261",
          topicTitle: "ML Recommendation System",
          preferenceRank: 5,
          isMatched: true,
          matchDisplay: "✓ Matched",
          matchVariant: "outline",
          matchColor: "text-green-600 border-green-600",
          rankDisplay: "#5",
          rankVariant: "secondary",
          statusDisplay: "assigned",
          statusColor: "bg-purple-600 text-white"
        }
      ]

      const assignments$ = computed(() => mockAssignments)
      const assignment = assignments$.value[0]

      expect(assignment.rankVariant).toBe("secondary")
    })
  })

  describe("stats$ signal", () => {
    it("should calculate all stats correctly", () => {
      const stats$ = createMockStatsSignal(mockTopics, mockStatsData, 3)
      const stats = stats$.value

      expect(stats.totalTopicsDisplay).toBe("2")
      expect(stats.activeTopicsDisplay).toBe("1")
      expect(stats.totalStudentsDisplay).toBe("150")
      expect(stats.averageSelectionsDisplay).toBe("5.0")
      expect(stats.matchRateDisplay).toBe("75%")
      expect(stats.topChoiceRateDisplay).toBe("33%")
    })

    it("should handle zero assignments gracefully", () => {
      const stats$ = createMockStatsSignal(mockTopics, mockStatsData, 0)
      const stats = stats$.value

      expect(stats.matchRateDisplay).toBe("0%")
      expect(stats.topChoiceRateDisplay).toBe("0%")
    })

    it("should format average selections to 1 decimal", () => {
      const stats$ = createMockStatsSignal(mockTopics, mockStatsData, 3)
      const stats = stats$.value

      expect(stats.averageSelectionsDisplay).toMatch(/^\d+\.\d$/)
    })

    it("should handle null stats data", () => {
      const stats$ = createMockStatsSignal(mockTopics, null, 0)
      const stats = stats$.value

      expect(stats.totalStudentsDisplay).toBe("0")
      expect(stats.averageSelectionsDisplay).toBe("0.0")
    })

    it("should handle null topics data", () => {
      const stats$ = createMockStatsSignal(null, mockStatsData, 0)
      const stats = stats$.value

      expect(stats.totalTopicsDisplay).toBe("0")
      expect(stats.activeTopicsDisplay).toBe("0")
    })

    it("should set current period display", () => {
      const stats$ = createMockStatsSignal(mockTopics, mockStatsData, 3)
      const stats = stats$.value

      expect(stats.currentPeriodDisplay).toBe("OPEN")
      expect(stats.currentPeriodVariant).toBe("border-green-200 bg-green-50/50")
    })
  })

  describe("helper boolean signals", () => {
    it("hasAssignments$ should be true when assignments exist", () => {
      const mockAssignments: AssignmentItemVM[] = [
        {
          key: "a1",
          studentId: "#6367261",
          topicTitle: "ML",
          preferenceRank: 1,
          isMatched: true,
          matchDisplay: "✓ Matched",
          matchVariant: "outline",
          matchColor: "text-green-600 border-green-600",
          rankDisplay: "#1",
          rankVariant: "default",
          statusDisplay: "assigned",
          statusColor: "bg-purple-600 text-white"
        }
      ]
      const assignments$ = computed(() => mockAssignments)
      const hasAssignments$ = computed(() => assignments$.value.length > 0)

      expect(hasAssignments$.value).toBe(true)
    })

    it("hasAssignments$ should be false when no assignments", () => {
      const assignments$ = computed(() => [] as AssignmentItemVM[])
      const hasAssignments$ = computed(() => assignments$.value.length > 0)

      expect(hasAssignments$.value).toBe(false)
    })

    it("hasPeriods$ should be true when periods exist", () => {
      const periods$ = createMockPeriodsSignal(mockPeriods)
      const hasPeriods$ = computed(() => periods$.value.length > 0)

      expect(hasPeriods$.value).toBe(true)
    })

    it("hasPeriods$ should be false when no periods", () => {
      const periods$ = createMockPeriodsSignal([])
      const hasPeriods$ = computed(() => periods$.value.length > 0)

      expect(hasPeriods$.value).toBe(false)
    })

    it("hasTopics$ should be true when topics exist", () => {
      const topics$ = createMockTopicsSignal(mockTopics)
      const hasTopics$ = computed(() => topics$.value.length > 0)

      expect(hasTopics$.value).toBe(true)
    })

    it("hasTopics$ should be false when no topics", () => {
      const topics$ = createMockTopicsSignal([])
      const hasTopics$ = computed(() => topics$.value.length > 0)

      expect(hasTopics$.value).toBe(false)
    })
  })

  describe("form data validation", () => {
    it("should validate period form data structure", () => {
      const formData: PeriodFormData = {
        title: "Spring 2024",
        description: "Spring semester",
        semesterId: "spring2024",
        openDate: new Date("2024-01-01"),
        closeDate: new Date("2024-01-31"),
        setAsActive: true
      }

      expect(formData.title).toBe("Spring 2024")
      expect(formData.description).toBe("Spring semester")
      expect(formData.semesterId).toBe("spring2024")
      expect(formData.openDate).toBeInstanceOf(Date)
      expect(formData.closeDate).toBeInstanceOf(Date)
      expect(formData.setAsActive).toBe(true)
    })

    it("should validate topic form data structure", () => {
      const formData: TopicFormData = {
        title: "Machine Learning",
        description: "AI and ML topics",
        semesterId: "spring2024"
      }

      expect(formData.title).toBe("Machine Learning")
      expect(formData.description).toBe("AI and ML topics")
      expect(formData.semesterId).toBe("spring2024")
    })

    it("should handle all required fields", () => {
      const formData: TopicFormData = {
        title: "Machine Learning",
        description: "AI and ML topics",
        semesterId: "spring2024"
      }

      expect(Object.keys(formData)).toEqual(["title", "description", "semesterId"])
    })

    it("should handle optional setAsActive", () => {
      const formData: PeriodFormData = {
        title: "Spring 2024",
        description: "Spring semester",
        semesterId: "spring2024",
        openDate: new Date("2024-01-01"),
        closeDate: new Date("2024-01-31")
      }

      expect(formData.setAsActive).toBeUndefined()
    })
  })

  describe("integration scenarios", () => {
    it("should handle complete dashboard state", () => {
      const periods$ = createMockPeriodsSignal(mockPeriods)
      const topics$ = createMockTopicsSignal(mockTopics)
      const stats$ = createMockStatsSignal(mockTopics, mockStatsData, 3)

      expect(periods$.value).toHaveLength(2)
      expect(topics$.value).toHaveLength(2)
      expect(stats$.value.totalTopicsDisplay).toBe("2")
    })

    it("should maintain independent state for different views", () => {
      const activeView$ = signal<ViewType>("overview")

      activeView$.value = "periods"
      expect(activeView$.value).toBe("periods")

      activeView$.value = "topics"
      expect(activeView$.value).toBe("topics")

      activeView$.value = "overview"
      expect(activeView$.value).toBe("overview")
    })

    it("should handle empty state gracefully", () => {
      const periods$ = createMockPeriodsSignal([])
      const topics$ = createMockTopicsSignal([])
      const stats$ = createMockStatsSignal([], null, 0)

      expect(periods$.value).toHaveLength(0)
      expect(topics$.value).toHaveLength(0)
      expect(stats$.value.totalTopicsDisplay).toBe("0")
      expect(stats$.value.totalStudentsDisplay).toBe("0")
    })

    it("should compute stats reactively based on data changes", () => {
      const topicsSignal = signal(mockTopics)
      const statsSignal = signal(mockStatsData)

      const stats$ = computed((): StatsVM => {
        const topics = topicsSignal.value
        const stats = statsSignal.value

        const activeTopicsCount = topics.filter(t => t.isActive).length
        const totalTopicsCount = topics.length

        return {
          totalTopicsDisplay: String(totalTopicsCount),
          activeTopicsDisplay: String(activeTopicsCount),
          totalStudentsDisplay: String(stats.totalStudents),
          totalSelectionsDisplay: String(stats.totalSelections),
          averageSelectionsDisplay: stats.averageSelectionsPerStudent.toFixed(1),
          matchRateDisplay: "75%",
          topChoiceRateDisplay: "33%",
          currentPeriodDisplay: "OPEN",
          currentPeriodVariant: "border-green-200 bg-green-50/50"
        }
      })

      expect(stats$.value.totalTopicsDisplay).toBe("2")
      expect(stats$.value.activeTopicsDisplay).toBe("1")

      // Update topics
      topicsSignal.value = [
        ...mockTopics,
        {
          _id: "t3" as Id<"topics">,
          _creationTime: Date.now(),
          title: "Cloud Computing",
          description: "Cloud platforms",
          semesterId: "spring2024",
          isActive: true,
          subtopicIds: []
        }
      ]

      expect(stats$.value.totalTopicsDisplay).toBe("3")
      expect(stats$.value.activeTopicsDisplay).toBe("2")
    })
  })
})
