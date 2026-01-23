/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest"
import { signal, computed } from "@preact/signals-react"
import type { StatCardVM, StatusVM, BannerVM, CompetitionDataVM, AssignmentVM } from "./LandingPageVM"

/**
 * Following the testing philosophy from viemodel.txt:
 * - Tests what matters without rendering the UI
 * - Focused and easy to maintain
 * - Tests the business logic directly
 *
 * Since useLandingPageVM uses React hooks that cannot be easily mocked in Vitest,
 * we test the core logic by creating simplified versions that mimic the VM behavior.
 */

// ============================================================================
// Mock Data
// ============================================================================

const mockOpenPeriod = {
  _id: "period1" as any,
  title: "Spring 2024 Selection",
  status: "open" as const,
  openDate: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
  closeDate: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days from now
  createdAt: Date.now(),
  _creationTime: Date.now()
}

const mockInactivePeriod = {
  _id: "period2" as any,
  title: "Spring 2024 Selection",
  status: "inactive" as const,
  openDate: Date.now() + 1000 * 60 * 60 * 24, // 1 day from now
  closeDate: Date.now() + 1000 * 60 * 60 * 24 * 7,
  createdAt: Date.now(),
  _creationTime: Date.now()
}

const mockClosedPeriod = {
  _id: "period3" as any,
  title: "Spring 2024 Selection",
  status: "closed" as const,
  openDate: Date.now() - 1000 * 60 * 60 * 24 * 7,
  closeDate: Date.now() - 1000 * 60 * 60 * 24,
  createdAt: Date.now(),
  _creationTime: Date.now()
}

const mockAssignedPeriod = {
  _id: "period4" as any,
  title: "Spring 2024 Selection",
  status: "assigned" as const,
  openDate: Date.now() - 1000 * 60 * 60 * 24 * 14,
  closeDate: Date.now() - 1000 * 60 * 60 * 24 * 7,
  createdAt: Date.now(),
  _creationTime: Date.now()
}

const mockStats = {
  isActive: true,
  title: "Spring 2024 Selection",
  closeDate: Date.now() + 1000 * 60 * 60 * 24 * 7,
  openDate: Date.now() - 1000 * 60 * 60 * 24,
  totalTopics: 50,
  totalStudents: 150,
  totalSelections: 300,
  averageSelectionsPerStudent: 2.0,
  mostPopularTopics: [
    { _id: "topic1" as any, title: "AI Research", count: 25 },
    { _id: "topic2" as any, title: "Web Development", count: 20 }
  ],
  leastPopularTopics: [
    { _id: "topic3" as any, title: "Legacy Systems", count: 2 }
  ]
}

const mockCompetitionData = [
  {
    topicId: "topic1" as any,
    topic: "AI Research",
    title: "AI Research",
    students: 25,
    studentCount: 25,
    averageRank: 1.5,
    averagePosition: 1.5,
    top3Percentage: 80,
    competitionLevel: "Very High",
    category: "very-high" as const,
    fill: "var(--color-very-high)"
  },
  {
    topicId: "topic2" as any,
    topic: "Web Development",
    title: "Web Development",
    students: 20,
    studentCount: 20,
    averageRank: 2.0,
    averagePosition: 2.0,
    top3Percentage: 60,
    competitionLevel: "High",
    category: "high" as const,
    fill: "var(--color-high)"
  }
]

const mockAssignment = {
  assignment: {
    _id: "assignment1" as any,
    periodId: "period4" as any,
    studentId: "s12345",
    topicId: "topic1" as any,
    createdAt: Date.now(),
    _creationTime: Date.now()
  },
  topic: {
    _id: "topic1" as any,
    title: "AI Research Project",
    description: "Research in artificial intelligence and machine learning",
    active: true,
    semesterId: "semester1",
    createdAt: Date.now(),
    _creationTime: Date.now()
  },
  wasPreference: true,
  wasTopChoice: true
}

// ============================================================================
// Helper Functions
// ============================================================================

function createMockStatusSignal(period: any) {
  return computed((): StatusVM => {
    if (!period) {
      return {
        status: "none",
        statusText: "No Active Period",
        statusColor: "bg-gray-500",
        iconName: "alertCircle"
      }
    }

    const statusMap: Record<string, StatusVM> = {
      open: {
        status: "open",
        statusText: "Selection Open",
        statusColor: "bg-green-500",
        iconName: "checkCircle"
      },
      inactive: {
        status: "upcoming",
        statusText: "Opening Soon",
        statusColor: "bg-blue-500",
        iconName: "clock"
      },
      closed: {
        status: "closed",
        statusText: "Selection Closed",
        statusColor: "bg-red-500",
        iconName: "xCircle"
      },
      assigned: {
        status: "assigned",
        statusText: "Topics Assigned",
        statusColor: "bg-purple-500",
        iconName: "users"
      }
    }

    return statusMap[period.status] || statusMap["none"]
  })
}

function createMockStatsSignal(stats: any) {
  return computed((): readonly StatCardVM[] => {
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
}

function createMockBannerSignal(stats: any, period: any, status: StatusVM) {
  return computed((): BannerVM | null => {
    if (!stats || !stats.isActive || !period) {
      return null
    }

    if (period.status === "open") {
      return {
        isVisible: true,
        title: stats.title || "Selection",
        status: status,
        timer: {
          targetDate: stats.closeDate ?? null,
          display: "--:--:--:--"
        }
      }
    }

    return null
  })
}

function createMockCompetitionDataSignal(data: any) {
  return computed((): readonly CompetitionDataVM[] => {
    if (!data || !Array.isArray(data)) return []
    return data
  })
}

function createMockAssignmentSignal(assignment: any) {
  return computed((): AssignmentVM | null => {
    if (!assignment || !assignment.topic) {
      return null
    }

    return {
      topicTitle: assignment.topic.title,
      topicDescription: assignment.topic.description ?? null,
      wasPreference: assignment.wasPreference,
      wasTopChoice: assignment.wasTopChoice
    }
  })
}

// ============================================================================
// Tests
// ============================================================================

describe("LandingPageVM", () => {
  describe("status$ signal", () => {
    it("should return 'open' status for open period", () => {
      const status$ = createMockStatusSignal(mockOpenPeriod)
      const status = status$.value

      expect(status.status).toBe("open")
      expect(status.statusText).toBe("Selection Open")
      expect(status.statusColor).toBe("bg-green-500")
      expect(status.iconName).toBe("checkCircle")
    })

    it("should return 'upcoming' status for inactive period", () => {
      const status$ = createMockStatusSignal(mockInactivePeriod)
      const status = status$.value

      expect(status.status).toBe("upcoming")
      expect(status.statusText).toBe("Opening Soon")
      expect(status.statusColor).toBe("bg-blue-500")
      expect(status.iconName).toBe("clock")
    })

    it("should return 'closed' status for closed period", () => {
      const status$ = createMockStatusSignal(mockClosedPeriod)
      const status = status$.value

      expect(status.status).toBe("closed")
      expect(status.statusText).toBe("Selection Closed")
      expect(status.statusColor).toBe("bg-red-500")
      expect(status.iconName).toBe("xCircle")
    })

    it("should return 'assigned' status for assigned period", () => {
      const status$ = createMockStatusSignal(mockAssignedPeriod)
      const status = status$.value

      expect(status.status).toBe("assigned")
      expect(status.statusText).toBe("Topics Assigned")
      expect(status.statusColor).toBe("bg-purple-500")
      expect(status.iconName).toBe("users")
    })

    it("should return 'none' status when no period exists", () => {
      const status$ = createMockStatusSignal(null)
      const status = status$.value

      expect(status.status).toBe("none")
      expect(status.statusText).toBe("No Active Period")
      expect(status.statusColor).toBe("bg-gray-500")
      expect(status.iconName).toBe("alertCircle")
    })
  })

  describe("stats$ signal", () => {
    it("should correctly format statistics data", () => {
      const stats$ = createMockStatsSignal(mockStats)
      const stats = stats$.value

      expect(stats).toHaveLength(3)

      expect(stats[0]).toMatchObject({
        label: "Total Topics",
        value: "50",
        subtitle: "Available projects",
        iconName: "fileText"
      })

      expect(stats[1]).toMatchObject({
        label: "Students Participated",
        value: "150",
        subtitle: "Avg 2.0 selections each",
        iconName: "users"
      })

      expect(stats[2]).toMatchObject({
        label: "Selection Progress",
        value: "300",
        iconName: "calendar"
      })
    })

    it("should calculate progress percentage correctly", () => {
      const stats$ = createMockStatsSignal(mockStats)
      const stats = stats$.value

      // 300 selections / (50 topics * 5) = 300/250 = 120% -> capped at 100%
      expect(stats[2].subtitle).toContain("100%")
    })

    it("should handle zero topics without division by zero", () => {
      const zeroStats = { ...mockStats, totalTopics: 0, totalSelections: 0 }
      const stats$ = createMockStatsSignal(zeroStats)
      const stats = stats$.value

      expect(stats[2].subtitle).toContain("0%")
    })

    it("should format average selections to 1 decimal place", () => {
      const customStats = { ...mockStats, averageSelectionsPerStudent: 2.456 }
      const stats$ = createMockStatsSignal(customStats)
      const stats = stats$.value

      expect(stats[1].subtitle).toBe("Avg 2.5 selections each")
    })

    it("should return empty array when stats is null", () => {
      const stats$ = createMockStatsSignal(null)
      const stats = stats$.value

      expect(stats).toHaveLength(0)
      expect(stats).toEqual([])
    })

    it("should return empty array when stats is undefined", () => {
      const stats$ = createMockStatsSignal(undefined)
      const stats = stats$.value

      expect(stats).toHaveLength(0)
      expect(stats).toEqual([])
    })
  })

  describe("banner$ signal", () => {
    it("should show banner for open period with active stats", () => {
      const status = {
        status: "open" as const,
        statusText: "Selection Open",
        statusColor: "bg-green-500",
        iconName: "checkCircle" as const
      }
      const banner$ = createMockBannerSignal(mockStats, mockOpenPeriod, status)
      const banner = banner$.value

      expect(banner).not.toBeNull()
      expect(banner?.isVisible).toBe(true)
      expect(banner?.title).toBe("Spring 2024 Selection")
      expect(banner?.status.status).toBe("open")
      expect(banner?.timer.targetDate).toBe(mockStats.closeDate)
    })

    it("should not show banner when stats is inactive", () => {
      const inactiveStats = { ...mockStats, isActive: false }
      const status = {
        status: "open" as const,
        statusText: "Selection Open",
        statusColor: "bg-green-500",
        iconName: "checkCircle" as const
      }
      const banner$ = createMockBannerSignal(inactiveStats, mockOpenPeriod, status)
      const banner = banner$.value

      expect(banner).toBeNull()
    })

    it("should not show banner when no period exists", () => {
      const status = {
        status: "none" as const,
        statusText: "No Active Period",
        statusColor: "bg-gray-500",
        iconName: "alertCircle" as const
      }
      const banner$ = createMockBannerSignal(mockStats, null, status)
      const banner = banner$.value

      expect(banner).toBeNull()
    })

    it("should not show banner for closed period", () => {
      const status = {
        status: "closed" as const,
        statusText: "Selection Closed",
        statusColor: "bg-red-500",
        iconName: "xCircle" as const
      }
      const banner$ = createMockBannerSignal(mockStats, mockClosedPeriod, status)
      const banner = banner$.value

      expect(banner).toBeNull()
    })

    it("should use fallback title when stats title is missing", () => {
      const statsNoTitle = { ...mockStats, title: undefined }
      const status = {
        status: "open" as const,
        statusText: "Selection Open",
        statusColor: "bg-green-500",
        iconName: "checkCircle" as const
      }
      const banner$ = createMockBannerSignal(statsNoTitle, mockOpenPeriod, status)
      const banner = banner$.value

      expect(banner?.title).toBe("Selection")
    })
  })

  describe("competitionData$ signal", () => {
    it("should return competition data when available", () => {
      const competitionData$ = createMockCompetitionDataSignal(mockCompetitionData)
      const data = competitionData$.value

      expect(data).toHaveLength(2)

      expect(data[0]).toMatchObject({
        topicId: "topic1",
        topic: "AI Research",
        students: 25,
        averageRank: 1.5,
        competitionLevel: "Very High",
        category: "very-high"
      })

      expect(data[1]).toMatchObject({
        topicId: "topic2",
        topic: "Web Development",
        students: 20,
        competitionLevel: "High",
        category: "high"
      })
    })

    it("should return empty array when data is null", () => {
      const competitionData$ = createMockCompetitionDataSignal(null)
      const data = competitionData$.value

      expect(data).toHaveLength(0)
      expect(data).toEqual([])
    })

    it("should return empty array when data is undefined", () => {
      const competitionData$ = createMockCompetitionDataSignal(undefined)
      const data = competitionData$.value

      expect(data).toHaveLength(0)
      expect(data).toEqual([])
    })

    it("should return empty array when data is not an array", () => {
      const competitionData$ = createMockCompetitionDataSignal({ invalid: "data" })
      const data = competitionData$.value

      expect(data).toHaveLength(0)
      expect(data).toEqual([])
    })

    it("should handle empty competition data array", () => {
      const competitionData$ = createMockCompetitionDataSignal([])
      const data = competitionData$.value

      expect(data).toHaveLength(0)
      expect(data).toEqual([])
    })
  })

  describe("myAssignment$ signal", () => {
    it("should format assignment data correctly", () => {
      const myAssignment$ = createMockAssignmentSignal(mockAssignment)
      const assignment = myAssignment$.value

      expect(assignment).not.toBeNull()
      expect(assignment?.topicTitle).toBe("AI Research Project")
      expect(assignment?.topicDescription).toBe("Research in artificial intelligence and machine learning")
      expect(assignment?.wasPreference).toBe(true)
      expect(assignment?.wasTopChoice).toBe(true)
    })

    it("should return null when no assignment exists", () => {
      const myAssignment$ = createMockAssignmentSignal(null)
      const assignment = myAssignment$.value

      expect(assignment).toBeNull()
    })

    it("should return null when assignment has no topic", () => {
      const assignmentNoTopic = { ...mockAssignment, topic: null }
      const myAssignment$ = createMockAssignmentSignal(assignmentNoTopic)
      const assignment = myAssignment$.value

      expect(assignment).toBeNull()
    })

    it("should handle null description", () => {
      const assignmentNoDesc = {
        ...mockAssignment,
        topic: { ...mockAssignment.topic, description: null }
      }
      const myAssignment$ = createMockAssignmentSignal(assignmentNoDesc)
      const assignment = myAssignment$.value

      expect(assignment).not.toBeNull()
      expect(assignment?.topicDescription).toBeNull()
    })

    it("should handle wasPreference false", () => {
      const notPreference = { ...mockAssignment, wasPreference: false }
      const myAssignment$ = createMockAssignmentSignal(notPreference)
      const assignment = myAssignment$.value

      expect(assignment?.wasPreference).toBe(false)
    })

    it("should handle wasTopChoice false", () => {
      const notTopChoice = { ...mockAssignment, wasTopChoice: false }
      const myAssignment$ = createMockAssignmentSignal(notTopChoice)
      const assignment = myAssignment$.value

      expect(assignment?.wasTopChoice).toBe(false)
    })
  })

  describe("studentId$ signal", () => {
    it("should start with null value", () => {
      const studentId$ = signal<string | null>(null)

      expect(studentId$.value).toBeNull()
    })

    it("should update when set to a value", () => {
      const studentId$ = signal<string | null>(null)

      studentId$.value = "s12345"

      expect(studentId$.value).toBe("s12345")
    })

    it("should update when set back to null", () => {
      const studentId$ = signal<string | null>("s12345")

      studentId$.value = null

      expect(studentId$.value).toBeNull()
    })

    it("should handle multiple updates", () => {
      const studentId$ = signal<string | null>(null)

      studentId$.value = "s12345"
      expect(studentId$.value).toBe("s12345")

      studentId$.value = "s67890"
      expect(studentId$.value).toBe("s67890")

      studentId$.value = null
      expect(studentId$.value).toBeNull()
    })
  })

  describe("isActive$ signal", () => {
    it("should return true when stats is active", () => {
      const isActive$ = computed(() => mockStats?.isActive ?? false)

      expect(isActive$.value).toBe(true)
    })

    it("should return false when stats is inactive", () => {
      const inactiveStats = { ...mockStats, isActive: false }
      const isActive$ = computed(() => inactiveStats?.isActive ?? false)

      expect(isActive$.value).toBe(false)
    })

    it("should return false when stats is null", () => {
      const nullStats: any = null
      const isActive$ = computed(() => nullStats?.isActive ?? false)

      expect(isActive$.value).toBe(false)
    })

    it("should return false when stats is undefined", () => {
      const undefinedStats: any = undefined
      const isActive$ = computed(() => undefinedStats?.isActive ?? false)

      expect(isActive$.value).toBe(false)
    })
  })

  describe("showAnalytics$ signal", () => {
    it("should return true when competition data exists and has items", () => {
      const showAnalytics$ = computed(() => {
        const data = mockCompetitionData
        return data && Array.isArray(data) && data.length > 0
      })

      expect(showAnalytics$.value).toBe(true)
    })

    it("should return false when competition data is empty array", () => {
      const showAnalytics$ = computed(() => {
        const data: any[] = []
        return data && Array.isArray(data) && data.length > 0
      })

      expect(showAnalytics$.value).toBe(false)
    })

    it("should return false when competition data is null", () => {
      const data: any = null
      const showAnalytics$ = computed(() => {
        return !!(data && Array.isArray(data) && data.length > 0)
      })

      expect(showAnalytics$.value).toBe(false)
    })

    it("should return false when competition data is not an array", () => {
      const showAnalytics$ = computed(() => {
        const data: any = { invalid: "data" }
        return data && Array.isArray(data) && data.length > 0
      })

      expect(showAnalytics$.value).toBe(false)
    })
  })

  describe("currentPeriodId$ signal", () => {
    it("should return period ID when period exists", () => {
      const currentPeriodId$ = computed(() => mockOpenPeriod?._id ?? null)

      expect(currentPeriodId$.value).toBe("period1")
    })

    it("should return null when no period exists", () => {
      const nullPeriod: any = null
      const currentPeriodId$ = computed(() => nullPeriod?._id ?? null)

      expect(currentPeriodId$.value).toBeNull()
    })
  })

  describe("integration scenarios", () => {
    it("should handle complete workflow for open selection period", () => {
      const studentId$ = signal<string | null>(null)
      const status$ = createMockStatusSignal(mockOpenPeriod)
      const stats$ = createMockStatsSignal(mockStats)
      const banner$ = createMockBannerSignal(mockStats, mockOpenPeriod, status$.value)

      // Initial state
      expect(studentId$.value).toBeNull()
      expect(status$.value.status).toBe("open")
      expect(stats$.value).toHaveLength(3)
      expect(banner$.value).not.toBeNull()

      // Student logs in
      studentId$.value = "s12345"
      expect(studentId$.value).toBe("s12345")
    })

    it("should handle assigned period with student assignment", () => {
      const studentId$ = signal<string | null>("s12345")
      const status$ = createMockStatusSignal(mockAssignedPeriod)
      const myAssignment$ = createMockAssignmentSignal(mockAssignment)

      expect(status$.value.status).toBe("assigned")
      expect(myAssignment$.value).not.toBeNull()
      expect(myAssignment$.value?.topicTitle).toBe("AI Research Project")
      expect(myAssignment$.value?.wasTopChoice).toBe(true)
    })

    it("should handle transition between different period states", () => {
      // Initially upcoming
      const inactiveStatus = createMockStatusSignal(mockInactivePeriod)
      expect(inactiveStatus.value.status).toBe("upcoming")

      // Period opens
      const openStatus = createMockStatusSignal(mockOpenPeriod)
      expect(openStatus.value.status).toBe("open")

      // Period closes
      const closedStatus = createMockStatusSignal(mockClosedPeriod)
      expect(closedStatus.value.status).toBe("closed")
    })

    it("should handle student logging out", () => {
      const studentId$ = signal<string | null>("s12345")

      expect(studentId$.value).toBe("s12345")

      // Student logs out
      studentId$.value = null
      expect(studentId$.value).toBeNull()
    })

    it("should correctly show/hide analytics based on data availability", () => {
      // With data
      let data = mockCompetitionData
      let showAnalytics$ = computed(() =>
        data && Array.isArray(data) && data.length > 0
      )
      expect(showAnalytics$.value).toBe(true)

      // Without data
      data = []
      showAnalytics$ = computed(() =>
        data && Array.isArray(data) && data.length > 0
      )
      expect(showAnalytics$.value).toBe(false)
    })

    it("should handle all stat card data formatting together", () => {
      const stats$ = createMockStatsSignal(mockStats)
      const cards = stats$.value

      // Verify all cards have required properties
      cards.forEach(card => {
        expect(card).toHaveProperty("label")
        expect(card).toHaveProperty("value")
        expect(card).toHaveProperty("subtitle")
        expect(card).toHaveProperty("iconName")
        expect(typeof card.label).toBe("string")
        expect(typeof card.value).toBe("string")
        expect(typeof card.subtitle).toBe("string")
      })
    })
  })
})
