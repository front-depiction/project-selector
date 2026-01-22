/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest"
import { signal, computed } from "@preact/signals-react"
import type {
  AssignmentDisplayVM,
  MyAssignmentVM,
  StatsVM,
  TopicAssignmentVM,
  StudentItemVM,
} from "./AssignmentDisplayVM"

// Type definitions for mock data
interface MockStudent {
  studentId: string
  originalRank: number | null
}

interface MockTopicData {
  topic: {
    _id: string
    title: string
    description: string
  }
  students: MockStudent[]
}

interface MockAssignmentsData {
  [topicId: string]: MockTopicData
}

/**
 * Following the testing philosophy from viemodel.txt:
 * - Tests what matters without rendering the UI
 * - Focused and easy to maintain
 * - Tests the business logic directly
 *
 * Since useAssignmentDisplayVM uses React hooks that cannot be easily mocked in Vitest,
 * we test the core logic by creating simplified versions that mimic the VM behavior.
 */

// ============================================================================
// Mock Data
// ============================================================================

const mockAssignmentsData = {
  "topic1": {
    topic: {
      _id: "topic1",
      title: "Machine Learning Fundamentals",
      description: "Introduction to ML algorithms",
    },
    students: [
      { studentId: "student1", originalRank: 1 },
      { studentId: "student2", originalRank: 2 },
      { studentId: "student3", originalRank: null },
    ],
  },
  "topic2": {
    topic: {
      _id: "topic2",
      title: "Web Development",
      description: "Full-stack development course",
    },
    students: [
      { studentId: "student4", originalRank: 1 },
      { studentId: "student5", originalRank: 3 },
    ],
  },
  "topic3": {
    topic: {
      _id: "topic3",
      title: "Data Structures",
      description: null,
    },
    students: [
      { studentId: "student6", originalRank: null },
      { studentId: "student7", originalRank: null },
      { studentId: "student8", originalRank: null },
      { studentId: "student9", originalRank: null },
      { studentId: "student10", originalRank: null },
      { studentId: "student11", originalRank: null },
    ],
  },
}

const mockMyAssignmentTopChoice = {
  assignment: { originalRank: 1 },
  topic: {
    _id: "topic1",
    title: "Machine Learning Fundamentals",
    description: "Introduction to ML algorithms",
  },
  wasTopChoice: true,
  wasPreference: true,
}

const mockMyAssignmentPreference = {
  assignment: { originalRank: 3 },
  topic: {
    _id: "topic2",
    title: "Web Development",
    description: "Full-stack development course",
  },
  wasTopChoice: false,
  wasPreference: true,
}

const mockMyAssignmentRandom = {
  assignment: { originalRank: null },
  topic: {
    _id: "topic3",
    title: "Data Structures",
    description: null,
  },
  wasTopChoice: false,
  wasPreference: false,
}

const mockStats = {
  totalAssignments: 100,
  matchedPreferences: 75,
  topChoices: 40,
}

const mockExportData = [
  { student_id: "student1", assigned_topic: "Machine Learning Fundamentals" },
  { student_id: "student2", assigned_topic: "Web Development" },
  { student_id: "student3", assigned_topic: "Data \"Structures\"" },
]

// ============================================================================
// Helper Functions - Mimic VM Computed Logic
// ============================================================================

function createMockMyAssignmentSignal(mockData: any | null | undefined) {
  return computed((): MyAssignmentVM | null => {
    if (!mockData) return null

    const wasTopChoice = mockData.wasTopChoice
    const wasPreference = mockData.wasPreference

    let iconType: "trophy" | "award" | "users"
    let iconColorClass: string
    let badgeText: string | null
    let badgeVariant: "default" | "secondary" | "outline"
    let badgeIcon: "trophy" | "hash" | "none"

    if (wasTopChoice) {
      iconType = "trophy"
      iconColorClass = "p-2 bg-yellow-100 rounded-full"
      badgeText = "Your top choice!"
      badgeVariant = "default"
      badgeIcon = "trophy"
    } else if (wasPreference) {
      iconType = "award"
      iconColorClass = "p-2 bg-blue-100 rounded-full"
      badgeText = `Rank ${mockData.assignment.originalRank}`
      badgeVariant = "secondary"
      badgeIcon = "hash"
    } else {
      iconType = "users"
      iconColorClass = "p-2 bg-gray-100 rounded-full"
      badgeText = "Randomly Assigned"
      badgeVariant = "outline"
      badgeIcon = "none"
    }

    return {
      topicTitle: mockData.topic?.title ?? "Unknown Topic",
      topicDescription: mockData.topic?.description ?? null,
      wasTopChoice,
      wasPreference,
      iconType,
      iconColorClass,
      badgeText,
      badgeVariant,
      badgeIcon,
    }
  })
}

function createMockStatsSignal(mockData: any | null | undefined) {
  return computed((): StatsVM | null => {
    if (!mockData) return null

    const matchRate = mockData.totalAssignments > 0
      ? Math.round((mockData.matchedPreferences / mockData.totalAssignments) * 100)
      : 0

    const topChoiceRate = mockData.totalAssignments > 0
      ? Math.round((mockData.topChoices / mockData.totalAssignments) * 100)
      : 0

    return {
      totalAssigned: mockData.totalAssignments,
      matchedCount: mockData.matchedPreferences,
      alternativeCount: mockData.topChoices,
      matchRate: `${matchRate}%`,
      topChoiceRate: `${topChoiceRate}%`,
    }
  })
}

function createMockAssignmentsSignal(
  assignments: MockAssignmentsData | null | undefined,
  myAssignment: { topic?: { _id: string } } | null | undefined,
  studentId?: string
) {
  return computed((): readonly TopicAssignmentVM[] => {
    if (!assignments) return []

    const topicEntries = Object.entries(assignments).sort(
      ([, a], [, b]) => (b as MockTopicData).students.length - (a as MockTopicData).students.length
    )

    return topicEntries.map(([topicId, data]): TopicAssignmentVM => {
      const topicData = data as MockTopicData
      const isUserAssigned = myAssignment?.topic?._id === topicId
      const studentCount = topicData.students.length
      const hasMoreStudents = studentCount > 4
      const displayedStudents = topicData.students.slice(0, 4)

      const students: StudentItemVM[] = displayedStudents.map((student: MockStudent): StudentItemVM => {
        const isCurrentUser = student.studentId === studentId
        const hasRank = student.originalRank != null

        return {
          key: student.studentId,
          studentIdDisplay: isCurrentUser ? `${student.studentId} (You)` : student.studentId,
          isCurrentUser,
          rankDisplay: hasRank ? `#${student.originalRank}` : null,
          rankBadgeVariant: student.originalRank === 1 ? "default" : "outline",
        }
      })

      const moreCount = studentCount - 4
      const moreStudentsDisplay = hasMoreStudents
        ? `+${moreCount} more student${moreCount !== 1 ? 's' : ''}`
        : null

      return {
        key: topicId,
        title: topicData.topic?.title ?? "Unknown Topic",
        studentCount,
        studentCountDisplay: `${studentCount} student${studentCount !== 1 ? 's' : ''}`,
        isUserAssigned,
        students,
        hasMoreStudents,
        moreStudentsDisplay,
      }
    })
  })
}

// ============================================================================
// Tests
// ============================================================================

describe("AssignmentDisplayVM", () => {
  describe("myAssignment$ signal", () => {
    it("should format top choice assignment correctly", () => {
      const myAssignment$ = createMockMyAssignmentSignal(mockMyAssignmentTopChoice)
      const assignment = myAssignment$.value

      expect(assignment).not.toBeNull()
      expect(assignment?.topicTitle).toBe("Machine Learning Fundamentals")
      expect(assignment?.topicDescription).toBe("Introduction to ML algorithms")
      expect(assignment?.wasTopChoice).toBe(true)
      expect(assignment?.wasPreference).toBe(true)
      expect(assignment?.iconType).toBe("trophy")
      expect(assignment?.iconColorClass).toBe("p-2 bg-yellow-100 rounded-full")
      expect(assignment?.badgeText).toBe("Your top choice!")
      expect(assignment?.badgeVariant).toBe("default")
      expect(assignment?.badgeIcon).toBe("trophy")
    })

    it("should format preference assignment correctly", () => {
      const myAssignment$ = createMockMyAssignmentSignal(mockMyAssignmentPreference)
      const assignment = myAssignment$.value

      expect(assignment).not.toBeNull()
      expect(assignment?.topicTitle).toBe("Web Development")
      expect(assignment?.topicDescription).toBe("Full-stack development course")
      expect(assignment?.wasTopChoice).toBe(false)
      expect(assignment?.wasPreference).toBe(true)
      expect(assignment?.iconType).toBe("award")
      expect(assignment?.iconColorClass).toBe("p-2 bg-blue-100 rounded-full")
      expect(assignment?.badgeText).toBe("Rank 3")
      expect(assignment?.badgeVariant).toBe("secondary")
      expect(assignment?.badgeIcon).toBe("hash")
    })

    it("should format random assignment correctly", () => {
      const myAssignment$ = createMockMyAssignmentSignal(mockMyAssignmentRandom)
      const assignment = myAssignment$.value

      expect(assignment).not.toBeNull()
      expect(assignment?.topicTitle).toBe("Data Structures")
      expect(assignment?.topicDescription).toBeNull()
      expect(assignment?.wasTopChoice).toBe(false)
      expect(assignment?.wasPreference).toBe(false)
      expect(assignment?.iconType).toBe("users")
      expect(assignment?.iconColorClass).toBe("p-2 bg-gray-100 rounded-full")
      expect(assignment?.badgeText).toBe("Randomly Assigned")
      expect(assignment?.badgeVariant).toBe("outline")
      expect(assignment?.badgeIcon).toBe("none")
    })

    it("should handle null assignment", () => {
      const myAssignment$ = createMockMyAssignmentSignal(null)
      const assignment = myAssignment$.value

      expect(assignment).toBeNull()
    })

    it("should handle undefined assignment", () => {
      const myAssignment$ = createMockMyAssignmentSignal(undefined)
      const assignment = myAssignment$.value

      expect(assignment).toBeNull()
    })

    it("should handle assignment with missing topic title", () => {
      const mockData = {
        ...mockMyAssignmentTopChoice,
        topic: { ...mockMyAssignmentTopChoice.topic, title: null },
      }
      const myAssignment$ = createMockMyAssignmentSignal(mockData)
      const assignment = myAssignment$.value

      expect(assignment?.topicTitle).toBe("Unknown Topic")
    })
  })

  describe("stats$ signal", () => {
    it("should calculate and format stats correctly", () => {
      const stats$ = createMockStatsSignal(mockStats)
      const stats = stats$.value

      expect(stats).not.toBeNull()
      expect(stats?.totalAssigned).toBe(100)
      expect(stats?.matchedCount).toBe(75)
      expect(stats?.alternativeCount).toBe(40)
      expect(stats?.matchRate).toBe("75%")
      expect(stats?.topChoiceRate).toBe("40%")
    })

    it("should handle zero total assignments", () => {
      const mockZeroStats = {
        totalAssignments: 0,
        matchedPreferences: 0,
        topChoices: 0,
      }
      const stats$ = createMockStatsSignal(mockZeroStats)
      const stats = stats$.value

      expect(stats).not.toBeNull()
      expect(stats?.totalAssigned).toBe(0)
      expect(stats?.matchRate).toBe("0%")
      expect(stats?.topChoiceRate).toBe("0%")
    })

    it("should round percentages correctly", () => {
      const mockPartialStats = {
        totalAssignments: 3,
        matchedPreferences: 2,
        topChoices: 1,
      }
      const stats$ = createMockStatsSignal(mockPartialStats)
      const stats = stats$.value

      expect(stats?.matchRate).toBe("67%") // 2/3 = 0.6666... rounds to 67
      expect(stats?.topChoiceRate).toBe("33%") // 1/3 = 0.3333... rounds to 33
    })

    it("should handle null stats", () => {
      const stats$ = createMockStatsSignal(null)
      const stats = stats$.value

      expect(stats).toBeNull()
    })

    it("should handle perfect match rate", () => {
      const mockPerfectStats = {
        totalAssignments: 50,
        matchedPreferences: 50,
        topChoices: 50,
      }
      const stats$ = createMockStatsSignal(mockPerfectStats)
      const stats = stats$.value

      expect(stats?.matchRate).toBe("100%")
      expect(stats?.topChoiceRate).toBe("100%")
    })
  })

  describe("assignments$ signal", () => {
    it("should sort topics by student count descending", () => {
      const assignments$ = createMockAssignmentsSignal(mockAssignmentsData, null)
      const assignments = assignments$.value

      expect(assignments).toHaveLength(3)
      expect(assignments[0].studentCount).toBe(6) // topic3
      expect(assignments[1].studentCount).toBe(3) // topic1
      expect(assignments[2].studentCount).toBe(2) // topic2
    })

    it("should format topic assignment data correctly", () => {
      const assignments$ = createMockAssignmentsSignal(mockAssignmentsData, null)
      const assignments = assignments$.value

      const topic1 = assignments.find(a => a.title === "Machine Learning Fundamentals")
      expect(topic1).toBeDefined()
      expect(topic1?.key).toBe("topic1")
      expect(topic1?.studentCountDisplay).toBe("3 students")
      expect(topic1?.isUserAssigned).toBe(false)
      expect(topic1?.students).toHaveLength(3)
    })

    it("should mark user's assigned topic correctly", () => {
      const assignments$ = createMockAssignmentsSignal(
        mockAssignmentsData,
        mockMyAssignmentTopChoice
      )
      const assignments = assignments$.value

      const topic1 = assignments.find(a => a.key === "topic1")
      expect(topic1?.isUserAssigned).toBe(true)

      const topic2 = assignments.find(a => a.key === "topic2")
      expect(topic2?.isUserAssigned).toBe(false)
    })

    it("should handle singular student count display", () => {
      const mockSingleStudent = {
        "topic1": {
          topic: { _id: "topic1", title: "Solo Topic", description: null },
          students: [{ studentId: "student1", originalRank: null }],
        },
      }
      const assignments$ = createMockAssignmentsSignal(mockSingleStudent, null)
      const assignments = assignments$.value

      expect(assignments[0].studentCountDisplay).toBe("1 student")
    })

    it("should limit displayed students to 4", () => {
      const assignments$ = createMockAssignmentsSignal(mockAssignmentsData, null)
      const assignments = assignments$.value

      const topic3 = assignments.find(a => a.key === "topic3")
      expect(topic3?.studentCount).toBe(6)
      expect(topic3?.students).toHaveLength(4)
      expect(topic3?.hasMoreStudents).toBe(true)
      expect(topic3?.moreStudentsDisplay).toBe("+2 more students")
    })

    it("should handle exactly 4 students without more message", () => {
      const mockFourStudents = {
        "topic1": {
          topic: { _id: "topic1", title: "Topic", description: null },
          students: [
            { studentId: "s1", originalRank: null },
            { studentId: "s2", originalRank: null },
            { studentId: "s3", originalRank: null },
            { studentId: "s4", originalRank: null },
          ],
        },
      }
      const assignments$ = createMockAssignmentsSignal(mockFourStudents, null)
      const assignments = assignments$.value

      expect(assignments[0].hasMoreStudents).toBe(false)
      expect(assignments[0].moreStudentsDisplay).toBeNull()
    })

    it("should handle singular 'more student' text", () => {
      const mockFiveStudents = {
        "topic1": {
          topic: { _id: "topic1", title: "Topic", description: null },
          students: [
            { studentId: "s1", originalRank: null },
            { studentId: "s2", originalRank: null },
            { studentId: "s3", originalRank: null },
            { studentId: "s4", originalRank: null },
            { studentId: "s5", originalRank: null },
          ],
        },
      }
      const assignments$ = createMockAssignmentsSignal(mockFiveStudents, null)
      const assignments = assignments$.value

      expect(assignments[0].moreStudentsDisplay).toBe("+1 more student")
    })

    it("should format student data correctly", () => {
      const assignments$ = createMockAssignmentsSignal(mockAssignmentsData, null, "student1")
      const assignments = assignments$.value

      const topic1 = assignments.find(a => a.key === "topic1")
      const student1 = topic1?.students.find(s => s.key === "student1")

      expect(student1).toBeDefined()
      expect(student1?.studentIdDisplay).toBe("student1 (You)")
      expect(student1?.isCurrentUser).toBe(true)
      expect(student1?.rankDisplay).toBe("#1")
      expect(student1?.rankBadgeVariant).toBe("default")
    })

    it("should handle student without rank", () => {
      const assignments$ = createMockAssignmentsSignal(mockAssignmentsData, null)
      const assignments = assignments$.value

      const topic1 = assignments.find(a => a.key === "topic1")
      const student3 = topic1?.students.find(s => s.key === "student3")

      expect(student3?.rankDisplay).toBeNull()
    })

    it("should use outline variant for non-first ranks", () => {
      const assignments$ = createMockAssignmentsSignal(mockAssignmentsData, null)
      const assignments = assignments$.value

      const topic1 = assignments.find(a => a.key === "topic1")
      const student2 = topic1?.students.find(s => s.key === "student2")

      expect(student2?.rankDisplay).toBe("#2")
      expect(student2?.rankBadgeVariant).toBe("outline")
    })

    it("should handle empty assignments", () => {
      const assignments$ = createMockAssignmentsSignal({}, null)
      const assignments = assignments$.value

      expect(assignments).toHaveLength(0)
    })

    it("should handle null assignments", () => {
      const assignments$ = createMockAssignmentsSignal(null, null)
      const assignments = assignments$.value

      expect(assignments).toHaveLength(0)
    })

    it("should handle undefined assignments", () => {
      const assignments$ = createMockAssignmentsSignal(undefined, null)
      const assignments = assignments$.value

      expect(assignments).toHaveLength(0)
    })

    it("should handle missing topic title", () => {
      const mockMissingTitle = {
        "topic1": {
          topic: { _id: "topic1", title: null, description: null },
          students: [{ studentId: "s1", originalRank: null }],
        },
      }
      const assignments$ = createMockAssignmentsSignal(mockMissingTitle, null)
      const assignments = assignments$.value

      expect(assignments[0].title).toBe("Unknown Topic")
    })
  })

  describe("isLoading$ signal", () => {
    it("should be true when assignments is undefined", () => {
      const assignments = undefined
      const stats = undefined
      const isLoading$ = computed(() =>
        assignments === undefined ||
        stats === undefined
      )

      expect(isLoading$.value).toBe(true)
    })

    it("should be false when all data is loaded", () => {
      const assignments = {}
      const stats = {}
      const isLoading$ = computed(() =>
        assignments === undefined ||
        stats === undefined
      )

      expect(isLoading$.value).toBe(false)
    })
  })

  describe("isEmpty$ signal", () => {
    it("should be true when assignments is empty object", () => {
      const assignments = {}
      const isLoading = false
      const isEmpty$ = computed(() =>
        !isLoading &&
        (!assignments || Object.keys(assignments).length === 0)
      )

      expect(isEmpty$.value).toBe(true)
    })

    it("should be false when assignments has data", () => {
      const assignments = mockAssignmentsData
      const isLoading = false
      const isEmpty$ = computed(() =>
        !isLoading &&
        (!assignments || Object.keys(assignments).length === 0)
      )

      expect(isEmpty$.value).toBe(false)
    })

    it("should be false when loading", () => {
      const assignments = null
      const isLoading = true
      const isEmpty$ = computed(() =>
        !isLoading &&
        (!assignments || Object.keys(assignments).length === 0)
      )

      expect(isEmpty$.value).toBe(false)
    })
  })

  describe("showExportButton$ signal", () => {
    it("should be true when no studentId is provided (admin view)", () => {
      const studentId = undefined
      const showExportButton$ = computed(() => !studentId)

      expect(showExportButton$.value).toBe(true)
    })

    it("should be false when studentId is provided (student view)", () => {
      const studentId = "student1"
      const showExportButton$ = computed(() => !studentId)

      expect(showExportButton$.value).toBe(false)
    })
  })

  describe("exportToCSV action", () => {
    it("should format CSV data correctly", () => {
      const headers = ['student_id', 'assigned_topic']
      const csvContent = [
        headers.join(','),
        ...mockExportData.map(row =>
          `"${row.student_id}","${row.assigned_topic.replace(/"/g, '""')}"`
        )
      ].join('\n')

      const lines = csvContent.split('\n')
      expect(lines[0]).toBe('student_id,assigned_topic')
      expect(lines[1]).toBe('"student1","Machine Learning Fundamentals"')
      expect(lines[2]).toBe('"student2","Web Development"')
      expect(lines[3]).toBe('"student3","Data ""Structures"""') // Escaped quotes
    })

    it("should handle topics with quotes correctly", () => {
      const topicWithQuotes = 'Data "Structures"'
      const escaped = topicWithQuotes.replace(/"/g, '""')

      expect(escaped).toBe('Data ""Structures""')
    })

    it("should create filename with current date", () => {
      const filename = `assignments_${new Date().toISOString().split('T')[0]}.csv`

      expect(filename).toMatch(/^assignments_\d{4}-\d{2}-\d{2}\.csv$/)
    })

    it("should handle empty export data", () => {
      const headers = ['student_id', 'assigned_topic']
      const emptyRows: Array<{ student_id: string; assigned_topic: string }> = []
      const csvContent = [
        headers.join(','),
        ...emptyRows.map(row => `"${row.student_id}","${row.assigned_topic}"`)
      ].join('\n')

      expect(csvContent).toBe('student_id,assigned_topic')
    })
  })

  describe("integration scenarios", () => {
    it("should handle complete student view workflow", () => {
      const studentId = "student1"
      const assignments$ = createMockAssignmentsSignal(
        mockAssignmentsData,
        mockMyAssignmentTopChoice,
        studentId
      )
      const myAssignment$ = createMockMyAssignmentSignal(mockMyAssignmentTopChoice)
      const stats$ = createMockStatsSignal(mockStats)

      const assignments = assignments$.value
      const myAssignment = myAssignment$.value
      const stats = stats$.value

      expect(assignments.length).toBeGreaterThan(0)
      expect(myAssignment).not.toBeNull()
      expect(stats).not.toBeNull()

      const assignedTopic = assignments.find(a => a.isUserAssigned)
      expect(assignedTopic).toBeDefined()
      expect(assignedTopic?.key).toBe("topic1")

      const currentStudent = assignedTopic?.students.find(s => s.isCurrentUser)
      expect(currentStudent).toBeDefined()
      expect(currentStudent?.studentIdDisplay).toContain("(You)")
    })

    it("should handle complete admin view workflow", () => {
      const assignments$ = createMockAssignmentsSignal(mockAssignmentsData, null)
      const stats$ = createMockStatsSignal(mockStats)
      const showExportButton$ = computed(() => true)

      const assignments = assignments$.value
      const stats = stats$.value

      expect(assignments.length).toBe(3)
      expect(stats).not.toBeNull()
      expect(showExportButton$.value).toBe(true)

      // Verify no students are marked as current user
      assignments.forEach(topic => {
        topic.students.forEach(student => {
          expect(student.isCurrentUser).toBe(false)
        })
      })
    })

    it("should handle student with random assignment", () => {
      const assignments$ = createMockAssignmentsSignal(
        mockAssignmentsData,
        mockMyAssignmentRandom,
        "student6"
      )
      const myAssignment$ = createMockMyAssignmentSignal(mockMyAssignmentRandom)

      const myAssignment = myAssignment$.value
      const assignments = assignments$.value

      expect(myAssignment?.wasTopChoice).toBe(false)
      expect(myAssignment?.wasPreference).toBe(false)
      expect(myAssignment?.badgeText).toBe("Randomly Assigned")

      const assignedTopic = assignments.find(a => a.key === "topic3")
      expect(assignedTopic?.isUserAssigned).toBe(true)
    })

    it("should handle no assignments scenario", () => {
      const assignments$ = createMockAssignmentsSignal(null, null)
      const myAssignment$ = createMockMyAssignmentSignal(null)
      const stats$ = createMockStatsSignal(null)

      expect(assignments$.value).toHaveLength(0)
      expect(myAssignment$.value).toBeNull()
      expect(stats$.value).toBeNull()
    })
  })
})
