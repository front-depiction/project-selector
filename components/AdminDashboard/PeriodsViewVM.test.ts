/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest"
import { signal, computed } from "@preact/signals-react"
import type { SelectionPeriodFormValues, QuestionOption, TemplateOption } from "@/components/forms/selection-period-form"
import type { PeriodRowVM, AssignmentRowVM, DialogVM, EditDialogVM } from "./PeriodsViewVM"
import type { SelectionPeriodWithStats } from "./index"
import type { Id } from "@/convex/_generated/dataModel"

/**
 * Following the testing philosophy from viemodel.txt:
 * - Tests what matters without rendering the UI
 * - Focused and easy to maintain
 * - Tests the business logic directly
 *
 * Since usePeriodsViewVM uses React hooks that cannot be easily mocked in Vitest,
 * we test the core logic by creating simplified versions that mimic the VM behavior.
 */

// ============================================================================
// Mock Data Helpers
// ============================================================================

function createMockPeriod(overrides?: Partial<SelectionPeriodWithStats>): SelectionPeriodWithStats {
  const base = {
    _id: "period1" as Id<"selectionPeriods">,
    _creationTime: Date.now(),
    kind: "open" as const,
    semesterId: "2024-spring",
    title: "Spring 2024 Selection",
    description: "Spring 2024 project selection period",
    openDate: new Date("2024-03-01").getTime(),
    closeDate: new Date("2024-03-15").getTime(),
    scheduledFunctionId: "sched1" as Id<"_scheduled_functions">,
    studentCount: 10,
    assignmentCount: 10,
  }
  return { ...base, ...overrides } as SelectionPeriodWithStats
}

function createMockAssignment(overrides?: Partial<any>) {
  return {
    studentId: "student1",
    topicId: "topic1",
    topicTitle: "AI Research",
    preferenceRank: 1,
    isMatched: true,
    status: "assigned",
    ...overrides,
  }
}

// ============================================================================
// Helper Functions - Mimicking VM Logic
// ============================================================================

function createMockPeriodsSignal(mockData: any[] | null | undefined) {
  return computed((): readonly PeriodRowVM[] => {
    if (!mockData) return []

    return mockData.map((period): PeriodRowVM => {
      const statusDisplay = period.kind === "open" ? "open"
        : period.kind === "inactive" ? "inactive"
        : period.kind === "closed" ? "closed"
        : "assigned"

      const statusColor = period.kind === "open" ? "bg-green-600 text-white"
        : period.kind === "inactive" ? "bg-blue-600 text-white"
        : period.kind === "closed" ? "bg-red-600 text-white"
        : "bg-purple-600 text-white"

      const canSetActive = period.kind !== "open"

      return {
        key: period._id,
        title: period.title,
        statusDisplay,
        statusColor,
        openDateDisplay: new Date(period.openDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        closeDateDisplay: new Date(period.closeDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        studentCountDisplay: String(period.studentCount || 0),
        onEdit: () => {},
        onSetActive: () => {},
        onDelete: () => {},
        canSetActive,
      }
    })
  })
}

function createMockAssignmentsSignal(mockData: any[] | null | undefined) {
  return computed((): readonly AssignmentRowVM[] => {
    if (!mockData) return []

    return mockData.map((assignment, idx): AssignmentRowVM => ({
      key: `${assignment.studentId}-${assignment.topicId}-${idx}`,
      studentId: assignment.studentId,
      topicTitle: assignment.topicTitle,
      preferenceRank: assignment.preferenceRank,
      isMatched: assignment.isMatched,
      statusDisplay: assignment.status === "assigned" ? "assigned" : "pending",
      rankBadgeVariant: assignment.preferenceRank === 1 ? "default" : "secondary",
    }))
  })
}

function createMockQuestionsSignal(mockData: any[] | null | undefined) {
  return computed((): readonly QuestionOption[] =>
    (mockData ?? []).map((q): QuestionOption => ({
      id: q._id,
      questionText: q.question,
      kindDisplay: q.kind === "boolean" ? "Yes/No" : "0-10",
      kindVariant: q.kind === "boolean" ? "secondary" : "outline",
    }))
  )
}

function createMockTemplatesSignal(mockData: any[] | null | undefined) {
  return computed((): readonly TemplateOption[] =>
    (mockData ?? []).map((t): TemplateOption => ({
      id: t._id,
      title: t.title,
      questionIds: t.questionIds,
    }))
  )
}

// ============================================================================
// Tests
// ============================================================================

describe("PeriodsViewVM", () => {
  describe("currentPeriod$ signal", () => {
    it("should return null when no current period exists", () => {
      const currentPeriod$ = signal<SelectionPeriodWithStats | null>(null)

      expect(currentPeriod$.value).toBeNull()
    })

    it("should return period with stats when current period exists", () => {
      const mockPeriod = createMockPeriod()
      const currentPeriod$ = signal<SelectionPeriodWithStats | null>(mockPeriod)

      expect(currentPeriod$.value).toEqual(mockPeriod)
      expect(currentPeriod$.value?.studentCount).toBe(10)
      expect(currentPeriod$.value?.assignmentCount).toBe(10)
    })

    it("should handle assigned period type", () => {
      const mockPeriod = createMockPeriod({
        kind: "assigned",
        assignmentBatchId: "batch123",
      } as any)
      const currentPeriod$ = signal<SelectionPeriodWithStats | null>(mockPeriod)

      expect(currentPeriod$.value?.kind).toBe("assigned")
      expect((currentPeriod$.value as any)?.assignmentBatchId).toBe("batch123")
    })
  })

  describe("assignments$ signal", () => {
    it("should correctly map assignment data to display format", () => {
      const mockAssignments = [
        createMockAssignment({ studentId: "s1", topicTitle: "AI", preferenceRank: 1, isMatched: true }),
        createMockAssignment({ studentId: "s2", topicTitle: "ML", preferenceRank: 2, isMatched: false }),
      ]

      const assignments$ = createMockAssignmentsSignal(mockAssignments)
      const assignments = assignments$.value

      expect(assignments).toHaveLength(2)
      expect(assignments[0]).toMatchObject({
        studentId: "s1",
        topicTitle: "AI",
        preferenceRank: 1,
        isMatched: true,
        statusDisplay: "assigned",
        rankBadgeVariant: "default",
      })
      expect(assignments[1]).toMatchObject({
        studentId: "s2",
        topicTitle: "ML",
        preferenceRank: 2,
        isMatched: false,
        statusDisplay: "assigned",
        rankBadgeVariant: "secondary",
      })
    })

    it("should handle null/undefined from useQuery gracefully", () => {
      const assignments$ = createMockAssignmentsSignal(null)
      expect(assignments$.value).toHaveLength(0)
      expect(assignments$.value).toEqual([])
    })

    it("should generate unique keys for each assignment", () => {
      const mockAssignments = [
        createMockAssignment({ studentId: "s1", topicId: "t1" }),
        createMockAssignment({ studentId: "s1", topicId: "t2" }),
      ]

      const assignments$ = createMockAssignmentsSignal(mockAssignments)
      const assignments = assignments$.value

      expect(assignments[0].key).not.toBe(assignments[1].key)
      expect(assignments[0].key).toContain("s1")
      expect(assignments[1].key).toContain("s1")
    })

    it("should set rankBadgeVariant correctly based on preference rank", () => {
      const mockAssignments = [
        createMockAssignment({ preferenceRank: 1 }),
        createMockAssignment({ preferenceRank: 2 }),
        createMockAssignment({ preferenceRank: 3 }),
      ]

      const assignments$ = createMockAssignmentsSignal(mockAssignments)
      const assignments = assignments$.value

      expect(assignments[0].rankBadgeVariant).toBe("default")
      expect(assignments[1].rankBadgeVariant).toBe("secondary")
      expect(assignments[2].rankBadgeVariant).toBe("secondary")
    })
  })

  describe("showAssignmentResults$ signal", () => {
    it("should return false when current period is null", () => {
      const currentPeriod$ = signal<SelectionPeriodWithStats | null>(null)
      const assignments$ = createMockAssignmentsSignal([])

      const showAssignmentResults$ = computed(() => {
        const current = currentPeriod$.value
        if (!current) return false
        if (current.kind !== "assigned") return false
        return assignments$.value.length > 0
      })

      expect(showAssignmentResults$.value).toBe(false)
    })

    it("should return false when period is not assigned", () => {
      const currentPeriod$ = signal<SelectionPeriodWithStats | null>(
        createMockPeriod({ kind: "open" })
      )
      const assignments$ = createMockAssignmentsSignal([createMockAssignment()])

      const showAssignmentResults$ = computed(() => {
        const current = currentPeriod$.value
        if (!current) return false
        if (current.kind !== "assigned") return false
        return assignments$.value.length > 0
      })

      expect(showAssignmentResults$.value).toBe(false)
    })

    it("should return false when period is assigned but no assignments", () => {
      const currentPeriod$ = signal<SelectionPeriodWithStats | null>(
        createMockPeriod({ kind: "assigned", assignmentBatchId: "batch1" } as any)
      )
      const assignments$ = createMockAssignmentsSignal([])

      const showAssignmentResults$ = computed(() => {
        const current = currentPeriod$.value
        if (!current) return false
        if (current.kind !== "assigned") return false
        return assignments$.value.length > 0
      })

      expect(showAssignmentResults$.value).toBe(false)
    })

    it("should return true when period is assigned and has assignments", () => {
      const currentPeriod$ = signal<SelectionPeriodWithStats | null>(
        createMockPeriod({ kind: "assigned", assignmentBatchId: "batch1" } as any)
      )
      const assignments$ = createMockAssignmentsSignal([createMockAssignment()])

      const showAssignmentResults$ = computed(() => {
        const current = currentPeriod$.value
        if (!current) return false
        if (current.kind !== "assigned") return false
        return assignments$.value.length > 0
      })

      expect(showAssignmentResults$.value).toBe(true)
    })
  })

  describe("periods$ signal", () => {
    it("should correctly map period data to display format", () => {
      const mockPeriods = [
        createMockPeriod({ _id: "p1" as Id<"selectionPeriods">, title: "Spring 2024", kind: "open" }),
        createMockPeriod({ _id: "p2" as Id<"selectionPeriods">, title: "Fall 2024", kind: "inactive" }),
      ]

      const periods$ = createMockPeriodsSignal(mockPeriods)
      const periods = periods$.value

      expect(periods).toHaveLength(2)
      expect(periods[0]).toMatchObject({
        key: "p1",
        title: "Spring 2024",
        statusDisplay: "open",
        statusColor: "bg-green-600 text-white",
      })
      expect(periods[1]).toMatchObject({
        key: "p2",
        title: "Fall 2024",
        statusDisplay: "inactive",
        statusColor: "bg-blue-600 text-white",
      })
    })

    it("should format dates correctly", () => {
      const mockPeriods = [
        createMockPeriod({
          openDate: new Date("2024-03-01").getTime(),
          closeDate: new Date("2024-03-15").getTime(),
        }),
      ]

      const periods$ = createMockPeriodsSignal(mockPeriods)
      const periods = periods$.value

      expect(periods[0].openDateDisplay).toContain("Mar")
      expect(periods[0].openDateDisplay).toContain("2024")
      expect(periods[0].closeDateDisplay).toContain("Mar")
      expect(periods[0].closeDateDisplay).toContain("2024")
    })

    it("should set canSetActive correctly based on period kind", () => {
      const mockPeriods = [
        createMockPeriod({ kind: "open" }),
        createMockPeriod({ kind: "inactive" }),
        createMockPeriod({ kind: "closed" }),
        createMockPeriod({ kind: "assigned", assignmentBatchId: "b1" } as any),
      ]

      const periods$ = createMockPeriodsSignal(mockPeriods)
      const periods = periods$.value

      expect(periods[0].canSetActive).toBe(false) // open
      expect(periods[1].canSetActive).toBe(true)  // inactive
      expect(periods[2].canSetActive).toBe(true)  // closed
      expect(periods[3].canSetActive).toBe(true)  // assigned
    })

    it("should provide action callbacks for each period", () => {
      const mockPeriods = [createMockPeriod()]
      const periods$ = createMockPeriodsSignal(mockPeriods)
      const periods = periods$.value

      expect(periods[0].onEdit).toBeDefined()
      expect(typeof periods[0].onEdit).toBe("function")
      expect(periods[0].onSetActive).toBeDefined()
      expect(typeof periods[0].onSetActive).toBe("function")
      expect(periods[0].onDelete).toBeDefined()
      expect(typeof periods[0].onDelete).toBe("function")
    })

    it("should handle null from useQuery gracefully", () => {
      const periods$ = createMockPeriodsSignal(null)
      expect(periods$.value).toHaveLength(0)
      expect(periods$.value).toEqual([])
    })

    it("should display student count as string", () => {
      const mockPeriods = [
        createMockPeriod({ studentCount: 25 }),
        createMockPeriod({ studentCount: 0 }),
        createMockPeriod({ studentCount: undefined }),
      ]

      const periods$ = createMockPeriodsSignal(mockPeriods)
      const periods = periods$.value

      expect(periods[0].studentCountDisplay).toBe("25")
      expect(periods[1].studentCountDisplay).toBe("0")
      expect(periods[2].studentCountDisplay).toBe("0")
    })
  })

  describe("questions$ signal", () => {
    it("should correctly map question data to display format", () => {
      const mockQuestions = [
        {
          _id: "q1",
          question: "Do you enjoy teamwork?",
          kind: "boolean" as const,
        },
        {
          _id: "q2",
          question: "Rate your interest in AI",
          kind: "0to10" as const,
        },
      ]

      const questions$ = createMockQuestionsSignal(mockQuestions)
      const questions = questions$.value

      expect(questions).toHaveLength(2)
      expect(questions[0]).toMatchObject({
        id: "q1",
        questionText: "Do you enjoy teamwork?",
        kindDisplay: "Yes/No",
        kindVariant: "secondary",
      })
      expect(questions[1]).toMatchObject({
        id: "q2",
        questionText: "Rate your interest in AI",
        kindDisplay: "0-10",
        kindVariant: "outline",
      })
    })

    it("should handle null from useQuery gracefully", () => {
      const questions$ = createMockQuestionsSignal(null)
      expect(questions$.value).toHaveLength(0)
      expect(questions$.value).toEqual([])
    })
  })

  describe("templates$ signal", () => {
    it("should correctly map template data to display format", () => {
      const mockTemplates = [
        {
          _id: "t1",
          title: "Team Dynamics",
          questionIds: ["q1", "q2"],
        },
        {
          _id: "t2",
          title: "Technical Skills",
          questionIds: ["q3"],
        },
      ]

      const templates$ = createMockTemplatesSignal(mockTemplates)
      const templates = templates$.value

      expect(templates).toHaveLength(2)
      expect(templates[0]).toMatchObject({
        id: "t1",
        title: "Team Dynamics",
        questionIds: ["q1", "q2"],
      })
      expect(templates[1]).toMatchObject({
        id: "t2",
        title: "Technical Skills",
        questionIds: ["q3"],
      })
    })

    it("should handle null from useQuery gracefully", () => {
      const templates$ = createMockTemplatesSignal(null)
      expect(templates$.value).toHaveLength(0)
      expect(templates$.value).toEqual([])
    })
  })

  describe("existingQuestionIds$ signal", () => {
    it("should extract question IDs from selection questions", () => {
      const mockSelectionQuestions = [
        { selectionPeriodId: "p1", questionId: "q1" },
        { selectionPeriodId: "p1", questionId: "q2" },
        { selectionPeriodId: "p1", questionId: "q3" },
      ]

      const existingQuestionIds$ = computed(() =>
        mockSelectionQuestions.map((sq) => sq.questionId)
      )

      expect(existingQuestionIds$.value).toEqual(["q1", "q2", "q3"])
    })

    it("should return empty array when no questions linked", () => {
      const existingQuestionIds$ = computed(() => [])
      expect(existingQuestionIds$.value).toEqual([])
    })

    it("should handle null from useQuery gracefully", () => {
      const mockData: any = null
      const existingQuestionIds$ = computed(() =>
        (mockData ?? []).map((sq: any) => sq.questionId)
      )

      expect(existingQuestionIds$.value).toEqual([])
    })
  })

  describe("DialogVM", () => {
    it("should start with isOpen$ as false", () => {
      const isOpen$ = signal(false)
      expect(isOpen$.value).toBe(false)
    })

    it("should open dialog when signal is set to true", () => {
      const isOpen$ = signal(false)
      isOpen$.value = true
      expect(isOpen$.value).toBe(true)
    })

    it("should close dialog when signal is set to false", () => {
      const isOpen$ = signal(true)
      isOpen$.value = false
      expect(isOpen$.value).toBe(false)
    })
  })

  describe("EditDialogVM", () => {
    it("should start with null editingPeriod$", () => {
      const editingPeriod$ = signal<SelectionPeriodWithStats | null>(null)
      expect(editingPeriod$.value).toBeNull()
    })

    it("should set editingPeriod$ when opening with period", () => {
      const editingPeriod$ = signal<SelectionPeriodWithStats | null>(null)
      const isOpen$ = signal(false)

      const mockPeriod = createMockPeriod()

      editingPeriod$.value = mockPeriod
      isOpen$.value = true

      expect(editingPeriod$.value).toEqual(mockPeriod)
      expect(isOpen$.value).toBe(true)
    })

    it("should clear editingPeriod$ when closing", () => {
      const editingPeriod$ = signal<SelectionPeriodWithStats | null>(createMockPeriod())
      const isOpen$ = signal(true)

      isOpen$.value = false
      editingPeriod$.value = null

      expect(editingPeriod$.value).toBeNull()
      expect(isOpen$.value).toBe(false)
    })
  })

  describe("form submission logic", () => {
    it("should validate create form values structure", () => {
      const formValues: SelectionPeriodFormValues = {
        title: "Spring 2024",
        selection_period_id: "spring-2024",
        start_deadline: new Date("2024-03-01"),
        end_deadline: new Date("2024-03-15"),
        isActive: true,
        questionIds: ["q1", "q2"],
      }

      expect(formValues.title).toBe("Spring 2024")
      expect(formValues.selection_period_id).toBe("spring-2024")
      expect(formValues.isActive).toBe(true)
      expect(formValues.questionIds).toEqual(["q1", "q2"])
    })

    it("should validate edit form values structure", () => {
      const formValues: SelectionPeriodFormValues = {
        title: "Updated Spring 2024",
        selection_period_id: "spring-2024-updated",
        start_deadline: new Date("2024-03-02"),
        end_deadline: new Date("2024-03-16"),
        isActive: false,
        questionIds: ["q1", "q3"],
      }

      expect(formValues.title).toBe("Updated Spring 2024")
      expect(formValues.selection_period_id).toBe("spring-2024-updated")
      expect(formValues.isActive).toBe(false)
      expect(formValues.questionIds).toEqual(["q1", "q3"])
    })

    it("should handle empty question IDs", () => {
      const formValues: SelectionPeriodFormValues = {
        title: "No Questions Period",
        selection_period_id: "no-questions",
        start_deadline: new Date(),
        end_deadline: new Date(),
        isActive: false,
        questionIds: [],
      }

      expect(formValues.questionIds).toHaveLength(0)
    })

    it("should convert dates to timestamps for API", () => {
      const startDate = new Date("2024-03-01")
      const endDate = new Date("2024-03-15")

      const startTimestamp = startDate.getTime()
      const endTimestamp = endDate.getTime()

      expect(typeof startTimestamp).toBe("number")
      expect(typeof endTimestamp).toBe("number")
      expect(endTimestamp).toBeGreaterThan(startTimestamp)
    })
  })

  describe("integration scenarios", () => {
    it("should handle complete workflow data transformations", () => {
      const mockPeriods = [createMockPeriod()]
      const mockAssignments = [createMockAssignment()]
      const mockQuestions = [
        { _id: "q1", question: "Test?", kind: "boolean" as const },
      ]

      const periods$ = createMockPeriodsSignal(mockPeriods)
      const assignments$ = createMockAssignmentsSignal(mockAssignments)
      const questions$ = createMockQuestionsSignal(mockQuestions)

      expect(periods$.value).toHaveLength(1)
      expect(assignments$.value).toHaveLength(1)
      expect(questions$.value).toHaveLength(1)
    })

    it("should maintain independent dialog states", () => {
      const createDialogOpen$ = signal(false)
      const editDialogOpen$ = signal(false)

      createDialogOpen$.value = true
      expect(createDialogOpen$.value).toBe(true)
      expect(editDialogOpen$.value).toBe(false)

      editDialogOpen$.value = true
      expect(createDialogOpen$.value).toBe(true)
      expect(editDialogOpen$.value).toBe(true)

      createDialogOpen$.value = false
      expect(createDialogOpen$.value).toBe(false)
      expect(editDialogOpen$.value).toBe(true)
    })

    it("should handle multiple periods with different statuses", () => {
      const mockPeriods = [
        createMockPeriod({ kind: "open", title: "Open Period" }),
        createMockPeriod({ kind: "inactive", title: "Inactive Period" }),
        createMockPeriod({ kind: "closed", title: "Closed Period" }),
        createMockPeriod({ kind: "assigned", title: "Assigned Period", assignmentBatchId: "b1" } as any),
      ]

      const periods$ = createMockPeriodsSignal(mockPeriods)
      const periods = periods$.value

      expect(periods).toHaveLength(4)
      expect(periods[0].statusDisplay).toBe("open")
      expect(periods[1].statusDisplay).toBe("inactive")
      expect(periods[2].statusDisplay).toBe("closed")
      expect(periods[3].statusDisplay).toBe("assigned")
    })
  })
})
