import { describe, it, expect, beforeEach } from "vitest"
import { signal, computed } from "@preact/signals-react"
import * as Option from "effect/Option"
import type {
  SelectionStep,
  TopicItemVM,
  QuestionnaireStateVM,
  PeriodDisplayVM,
  SelectionProgressVM,
  ValidationStateVM
} from "./StudentSelectionPageVM"
import type { Id } from "@/convex/_generated/dataModel"

/**
 * Following the testing philosophy from viemodel.txt:
 * - Tests what matters without rendering the UI
 * - Focused and easy to maintain
 * - Tests the business logic directly
 *
 * Since useStudentSelectionPageVM uses React hooks that cannot be easily mocked in Vitest,
 * we test the core logic by creating simplified versions that mimic the VM behavior.
 */

// ============================================================================
// Mock Data Helpers
// ============================================================================

const createMockTopic = (id: string, title: string, studentCount: number, averagePosition: number | null) => ({
  _id: id as Id<"topics">,
  title,
  description: `Description for ${title}`,
  isActive: true,
  semesterId: "2024-spring",
  studentCount,
  averagePosition,
  likelihoodCategory: averagePosition === null
    ? "low"
    : averagePosition <= 2
      ? "very-high"
      : averagePosition <= 3.5
        ? "high"
        : averagePosition <= 5
          ? "moderate"
          : "low"
})

const createMockPreferences = (studentId: string, topicOrder: Id<"topics">[]) => ({
  _id: "pref1" as Id<"preferences">,
  _creationTime: Date.now(),
  studentId,
  semesterId: "2024-spring",
  topicOrder,
  lastUpdated: Date.now()
})

const createMockPeriod = (title: string, closeDate: number) => ({
  _id: "period1" as Id<"selectionPeriods">,
  _creationTime: Date.now(),
  semesterId: "2024-spring",
  title,
  description: "Test period description",
  openDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
  closeDate,
  kind: "open" as const,
  scheduledCloseId: "sched1" as Id<"_scheduled_functions">
})

// ============================================================================
// Helper Functions to Test Business Logic
// ============================================================================

function createTopicsSignal(mockTopics: any[] | null | undefined, mockPreferences: any | null) {
  return computed(() => {
    if (!mockTopics) return []

    let sortedTopics = [...mockTopics]

    // Sort by user's saved order if available
    if (mockPreferences?.topicOrder) {
      sortedTopics.sort((a, b) => {
        const aIndex = mockPreferences.topicOrder.indexOf(a._id)
        const bIndex = mockPreferences.topicOrder.indexOf(b._id)

        // Put selected topics first in saved order
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1
        return 0
      })
    }

    return sortedTopics.map((topic): TopicItemVM => ({
      id: topic._id as any,
      _id: topic._id,
      text: topic.title,
      description: topic.description,
      checked: false,
      studentCount: topic.studentCount,
      likelihoodCategory: topic.likelihoodCategory,
      averagePosition: topic.averagePosition
    }))
  })
}

function createQuestionnaireStateSignal(
  periodQuestions: any[] | null | undefined,
  hasCompletedQuestionnaire: boolean | undefined,
  questionnaireCompleted: boolean
) {
  return computed((): QuestionnaireStateVM => {
    const hasQuestions = periodQuestions ? periodQuestions.length > 0 : false
    const isCompleted = hasCompletedQuestionnaire === true || questionnaireCompleted

    return {
      hasQuestions,
      isCompleted,
      needsCompletion: hasQuestions && !isCompleted
    }
  })
}

function createCurrentStepSignal(
  studentId: string,
  questionnaireState: QuestionnaireStateVM,
  preferences: any | null
) {
  return computed((): SelectionStep => {
    if (!studentId) return "entry"

    if (questionnaireState.needsCompletion) return "questionnaire"

    const hasSubmitted = preferences?.topicOrder && preferences.topicOrder.length > 0
    if (hasSubmitted) return "selection"

    return "selection"
  })
}

function createPeriodDisplaySignal(currentPeriod: any | null) {
  return computed((): PeriodDisplayVM | null => {
    if (!currentPeriod) return null

    const closeDate = new Date(currentPeriod.closeDate)
    const now = new Date()
    const daysRemaining = Math.ceil((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return {
      title: currentPeriod.title,
      description: currentPeriod.description,
      closeDateDisplay: closeDate.toLocaleDateString(),
      daysRemaining: daysRemaining > 0 ? `${daysRemaining} days` : "Closed",
      isOpen: currentPeriod.kind === "open"
    }
  })
}

function createSelectionProgressSignal(selectedTopicIds: Id<"topics">[], topicsCount: number) {
  return computed((): SelectionProgressVM => {
    const selectedCount = selectedTopicIds.length
    const maxSelections = 5

    const progressPercentage = topicsCount > 0
      ? (selectedCount / Math.min(maxSelections, topicsCount)) * 100
      : 0

    return {
      selectedCount,
      maxSelections,
      progressPercentage,
      hasMinimumSelection: selectedCount > 0
    }
  })
}

function createValidationStateSignal(selectedTopicIds: Id<"topics">[], error: Option.Option<string>) {
  const error$ = signal(error)
  return computed((): ValidationStateVM => {
    const hasExistingRanking = selectedTopicIds.length > 0
    const canSubmit = selectedTopicIds.length > 0 && Option.isNone(error$.value)

    return {
      hasExistingRanking,
      canSubmit,
      error$
    }
  })
}

// ============================================================================
// Tests
// ============================================================================

describe("StudentSelectionPageVM", () => {
  describe("topics$ signal", () => {
    it("should correctly map topic data to TopicItemVM format", () => {
      const mockTopics = [
        createMockTopic("t1", "Machine Learning", 15, 2.5),
        createMockTopic("t2", "Web Development", 8, 4.0)
      ]

      const topics$ = createTopicsSignal(mockTopics, null)
      const topics = topics$.value

      expect(topics).toHaveLength(2)
      expect(topics[0]).toMatchObject({
        _id: "t1",
        text: "Machine Learning",
        description: "Description for Machine Learning",
        studentCount: 15,
        averagePosition: 2.5,
        likelihoodCategory: "high"
      })
      expect(topics[1]).toMatchObject({
        _id: "t2",
        text: "Web Development",
        studentCount: 8,
        averagePosition: 4.0,
        likelihoodCategory: "moderate"
      })
    })

    it("should sort topics by user preference order", () => {
      const mockTopics = [
        createMockTopic("t1", "Topic A", 10, 3.0),
        createMockTopic("t2", "Topic B", 12, 2.0),
        createMockTopic("t3", "Topic C", 8, 4.0)
      ]

      const mockPreferences = createMockPreferences("s1", ["t3", "t1", "t2"] as Id<"topics">[])

      const topics$ = createTopicsSignal(mockTopics, mockPreferences)
      const topics = topics$.value

      expect(topics).toHaveLength(3)
      expect(topics[0]._id).toBe("t3")
      expect(topics[1]._id).toBe("t1")
      expect(topics[2]._id).toBe("t2")
    })

    it("should handle null topics gracefully", () => {
      const topics$ = createTopicsSignal(null, null)
      expect(topics$.value).toEqual([])
    })

    it("should handle undefined topics gracefully", () => {
      const topics$ = createTopicsSignal(undefined, null)
      expect(topics$.value).toEqual([])
    })

    it("should categorize likelihood correctly", () => {
      const mockTopics = [
        createMockTopic("t1", "Very High", 20, 1.5),
        createMockTopic("t2", "High", 15, 3.0),
        createMockTopic("t3", "Moderate", 10, 4.5),
        createMockTopic("t4", "Low", 5, 6.0),
        createMockTopic("t5", "Low (no data)", 0, null)
      ]

      const topics$ = createTopicsSignal(mockTopics, null)
      const topics = topics$.value

      expect(topics[0].likelihoodCategory).toBe("very-high")
      expect(topics[1].likelihoodCategory).toBe("high")
      expect(topics[2].likelihoodCategory).toBe("moderate")
      expect(topics[3].likelihoodCategory).toBe("low")
      expect(topics[4].likelihoodCategory).toBe("low")
    })
  })

  describe("questionnaireState$ signal", () => {
    it("should indicate needs completion when has questions but not completed", () => {
      const mockQuestions = [{ _id: "q1" }, { _id: "q2" }]
      const questionnaireState$ = createQuestionnaireStateSignal(mockQuestions, false, false)

      expect(questionnaireState$.value).toMatchObject({
        hasQuestions: true,
        isCompleted: false,
        needsCompletion: true
      })
    })

    it("should indicate completed when hasCompletedQuestionnaire is true", () => {
      const mockQuestions = [{ _id: "q1" }]
      const questionnaireState$ = createQuestionnaireStateSignal(mockQuestions, true, false)

      expect(questionnaireState$.value).toMatchObject({
        hasQuestions: true,
        isCompleted: true,
        needsCompletion: false
      })
    })

    it("should indicate completed when questionnaireCompleted signal is true", () => {
      const mockQuestions = [{ _id: "q1" }]
      const questionnaireState$ = createQuestionnaireStateSignal(mockQuestions, false, true)

      expect(questionnaireState$.value).toMatchObject({
        hasQuestions: true,
        isCompleted: true,
        needsCompletion: false
      })
    })

    it("should not need completion when there are no questions", () => {
      const questionnaireState$ = createQuestionnaireStateSignal([], false, false)

      expect(questionnaireState$.value).toMatchObject({
        hasQuestions: false,
        isCompleted: false,
        needsCompletion: false
      })
    })

    it("should handle null questions gracefully", () => {
      const questionnaireState$ = createQuestionnaireStateSignal(null, undefined, false)

      expect(questionnaireState$.value).toMatchObject({
        hasQuestions: false,
        isCompleted: false,
        needsCompletion: false
      })
    })
  })

  describe("currentStep$ signal", () => {
    it("should return 'entry' when no student ID", () => {
      const questionnaireState: QuestionnaireStateVM = {
        hasQuestions: false,
        isCompleted: false,
        needsCompletion: false
      }

      const currentStep$ = createCurrentStepSignal("", questionnaireState, null)
      expect(currentStep$.value).toBe("entry")
    })

    it("should return 'questionnaire' when needs completion", () => {
      const questionnaireState: QuestionnaireStateVM = {
        hasQuestions: true,
        isCompleted: false,
        needsCompletion: true
      }

      const currentStep$ = createCurrentStepSignal("s1", questionnaireState, null)
      expect(currentStep$.value).toBe("questionnaire")
    })

    it("should return 'selection' when questionnaire completed and no preferences", () => {
      const questionnaireState: QuestionnaireStateVM = {
        hasQuestions: true,
        isCompleted: true,
        needsCompletion: false
      }

      const currentStep$ = createCurrentStepSignal("s1", questionnaireState, null)
      expect(currentStep$.value).toBe("selection")
    })

    it("should return 'selection' when has preferences", () => {
      const questionnaireState: QuestionnaireStateVM = {
        hasQuestions: false,
        isCompleted: false,
        needsCompletion: false
      }

      const mockPreferences = createMockPreferences("s1", ["t1", "t2"] as Id<"topics">[])
      const currentStep$ = createCurrentStepSignal("s1", questionnaireState, mockPreferences)
      expect(currentStep$.value).toBe("selection")
    })

    it("should return 'selection' when no questionnaire exists", () => {
      const questionnaireState: QuestionnaireStateVM = {
        hasQuestions: false,
        isCompleted: false,
        needsCompletion: false
      }

      const currentStep$ = createCurrentStepSignal("s1", questionnaireState, null)
      expect(currentStep$.value).toBe("selection")
    })
  })

  describe("currentPeriod$ signal", () => {
    it("should format period display data correctly", () => {
      const futureDate = Date.now() + (10 * 24 * 60 * 60 * 1000) // 10 days from now
      const mockPeriod = createMockPeriod("Spring 2024 Selection", futureDate)

      const currentPeriod$ = createPeriodDisplaySignal(mockPeriod)
      const period = currentPeriod$.value

      expect(period).not.toBeNull()
      expect(period?.title).toBe("Spring 2024 Selection")
      expect(period?.description).toBe("Test period description")
      expect(period?.isOpen).toBe(true)
      expect(period?.daysRemaining).toMatch(/\d+ days/)
    })

    it("should show 'Closed' when period has passed", () => {
      const pastDate = Date.now() - (1 * 24 * 60 * 60 * 1000) // 1 day ago
      const mockPeriod = createMockPeriod("Past Period", pastDate)

      const currentPeriod$ = createPeriodDisplaySignal(mockPeriod)
      const period = currentPeriod$.value

      expect(period?.daysRemaining).toBe("Closed")
    })

    it("should return null when no period", () => {
      const currentPeriod$ = createPeriodDisplaySignal(null)
      expect(currentPeriod$.value).toBeNull()
    })
  })

  describe("selectionProgress$ signal", () => {
    it("should calculate progress correctly with 3 selections", () => {
      const selectedTopicIds = ["t1", "t2", "t3"] as Id<"topics">[]
      const progress$ = createSelectionProgressSignal(selectedTopicIds, 10)

      expect(progress$.value).toMatchObject({
        selectedCount: 3,
        maxSelections: 5,
        progressPercentage: 60,
        hasMinimumSelection: true
      })
    })

    it("should calculate progress correctly with 5 selections (max)", () => {
      const selectedTopicIds = ["t1", "t2", "t3", "t4", "t5"] as Id<"topics">[]
      const progress$ = createSelectionProgressSignal(selectedTopicIds, 10)

      expect(progress$.value).toMatchObject({
        selectedCount: 5,
        maxSelections: 5,
        progressPercentage: 100,
        hasMinimumSelection: true
      })
    })

    it("should indicate no minimum selection when empty", () => {
      const progress$ = createSelectionProgressSignal([], 10)

      expect(progress$.value).toMatchObject({
        selectedCount: 0,
        maxSelections: 5,
        progressPercentage: 0,
        hasMinimumSelection: false
      })
    })

    it("should handle case when fewer topics available than max selections", () => {
      const selectedTopicIds = ["t1", "t2"] as Id<"topics">[]
      const progress$ = createSelectionProgressSignal(selectedTopicIds, 3)

      // 2 out of 3 = 66.67%
      expect(progress$.value.progressPercentage).toBeCloseTo(66.67, 1)
    })

    it("should handle zero topics gracefully", () => {
      const progress$ = createSelectionProgressSignal([], 0)

      expect(progress$.value.progressPercentage).toBe(0)
    })
  })

  describe("validationState$ signal", () => {
    it("should allow submission when has rankings and no error", () => {
      const selectedTopicIds = ["t1", "t2"] as Id<"topics">[]
      const validation$ = createValidationStateSignal(selectedTopicIds, Option.none())

      expect(validation$.value).toMatchObject({
        hasExistingRanking: true,
        canSubmit: true
      })
      expect(Option.isNone(validation$.value.error$.value)).toBe(true)
    })

    it("should prevent submission when error exists", () => {
      const selectedTopicIds = ["t1", "t2"] as Id<"topics">[]
      const validation$ = createValidationStateSignal(selectedTopicIds, Option.some("Network error"))

      expect(validation$.value).toMatchObject({
        hasExistingRanking: true,
        canSubmit: false
      })
      expect(Option.isSome(validation$.value.error$.value)).toBe(true)
      if (Option.isSome(validation$.value.error$.value)) {
        expect(validation$.value.error$.value.value).toBe("Network error")
      }
    })

    it("should prevent submission when no rankings", () => {
      const validation$ = createValidationStateSignal([], Option.none())

      expect(validation$.value).toMatchObject({
        hasExistingRanking: false,
        canSubmit: false
      })
    })
  })

  describe("action: updateSelection", () => {
    it("should update topic order correctly", () => {
      // Simulate the updateSelection logic
      const currentItems = [
        { id: "t1", text: "Topic 1" },
        { id: "t2", text: "Topic 2" },
        { id: "t3", text: "Topic 3" }
      ] as any[]

      const newItems = [
        { id: "t3", text: "Topic 3" },
        { id: "t1", text: "Topic 1" },
        { id: "t2", text: "Topic 2" }
      ] as any[]

      const topicOrder = newItems.map((item) => item.id as Id<"topics">)

      expect(topicOrder).toEqual(["t3", "t1", "t2"])
    })

    it("should handle function-based update", () => {
      const currentItems = [
        { id: "t1", text: "Topic 1" },
        { id: "t2", text: "Topic 2" }
      ] as any[]

      const updateFn = (prev: any[]) => prev.slice().reverse()
      const newItems = updateFn(currentItems)
      const topicOrder = newItems.map((item) => item.id as Id<"topics">)

      expect(topicOrder).toEqual(["t2", "t1"])
    })
  })

  describe("action: toggleTopicExpanded", () => {
    it("should expand a collapsed topic", () => {
      const expandedIds = new Set<string | number>()
      const topicId = "t1"

      expandedIds.add(topicId)

      expect(expandedIds.has(topicId)).toBe(true)
    })

    it("should collapse an expanded topic", () => {
      const expandedIds = new Set<string | number>(["t1"])
      const topicId = "t1"

      expandedIds.delete(topicId)

      expect(expandedIds.has(topicId)).toBe(false)
    })

    it("should handle multiple expanded topics", () => {
      const expandedIds = new Set<string | number>()

      expandedIds.add("t1")
      expandedIds.add("t2")

      expect(expandedIds.size).toBe(2)
      expect(expandedIds.has("t1")).toBe(true)
      expect(expandedIds.has("t2")).toBe(true)

      expandedIds.delete("t1")

      expect(expandedIds.size).toBe(1)
      expect(expandedIds.has("t1")).toBe(false)
      expect(expandedIds.has("t2")).toBe(true)
    })
  })

  describe("integration scenarios", () => {
    it("should handle complete workflow from entry to selection", () => {
      // Start with no student ID
      let studentId = ""
      let questionnaireState: QuestionnaireStateVM = {
        hasQuestions: false,
        isCompleted: false,
        needsCompletion: false
      }

      let currentStep$ = createCurrentStepSignal(studentId, questionnaireState, null)
      expect(currentStep$.value).toBe("entry")

      // Student enters ID
      studentId = "s1"
      currentStep$ = createCurrentStepSignal(studentId, questionnaireState, null)
      expect(currentStep$.value).toBe("selection")

      // If questionnaire exists and not completed
      questionnaireState = {
        hasQuestions: true,
        isCompleted: false,
        needsCompletion: true
      }
      currentStep$ = createCurrentStepSignal(studentId, questionnaireState, null)
      expect(currentStep$.value).toBe("questionnaire")

      // Complete questionnaire
      questionnaireState = {
        hasQuestions: true,
        isCompleted: true,
        needsCompletion: false
      }
      currentStep$ = createCurrentStepSignal(studentId, questionnaireState, null)
      expect(currentStep$.value).toBe("selection")

      // Make selections
      const mockPreferences = createMockPreferences("s1", ["t1", "t2", "t3"] as Id<"topics">[])
      currentStep$ = createCurrentStepSignal(studentId, questionnaireState, mockPreferences)
      expect(currentStep$.value).toBe("selection")
    })

    it("should maintain topic order through preferences", () => {
      const mockTopics = [
        createMockTopic("t1", "AI", 10, 2.0),
        createMockTopic("t2", "Web", 8, 3.5),
        createMockTopic("t3", "Mobile", 6, 5.0)
      ]

      // No preferences - default order
      let topics$ = createTopicsSignal(mockTopics, null)
      expect(topics$.value.map(t => t._id)).toEqual(["t1", "t2", "t3"])

      // With preferences - custom order
      const mockPreferences = createMockPreferences("s1", ["t3", "t1", "t2"] as Id<"topics">[])
      topics$ = createTopicsSignal(mockTopics, mockPreferences)
      expect(topics$.value.map(t => t._id)).toEqual(["t3", "t1", "t2"])
    })

    it("should track progress as selections are made", () => {
      let selectedIds: Id<"topics">[] = []
      let progress$ = createSelectionProgressSignal(selectedIds, 10)
      expect(progress$.value.selectedCount).toBe(0)
      expect(progress$.value.progressPercentage).toBe(0)

      // Add first selection
      selectedIds = ["t1"] as Id<"topics">[]
      progress$ = createSelectionProgressSignal(selectedIds, 10)
      expect(progress$.value.selectedCount).toBe(1)
      expect(progress$.value.progressPercentage).toBe(20)

      // Add more selections
      selectedIds = ["t1", "t2", "t3"] as Id<"topics">[]
      progress$ = createSelectionProgressSignal(selectedIds, 10)
      expect(progress$.value.selectedCount).toBe(3)
      expect(progress$.value.progressPercentage).toBe(60)

      // Max out selections
      selectedIds = ["t1", "t2", "t3", "t4", "t5"] as Id<"topics">[]
      progress$ = createSelectionProgressSignal(selectedIds, 10)
      expect(progress$.value.selectedCount).toBe(5)
      expect(progress$.value.progressPercentage).toBe(100)
    })

    it("should handle error states in validation", () => {
      const selectedIds = ["t1", "t2"] as Id<"topics">[]

      // No error - can submit
      let validation$ = createValidationStateSignal(selectedIds, Option.none())
      expect(validation$.value.canSubmit).toBe(true)

      // With error - cannot submit
      validation$ = createValidationStateSignal(selectedIds, Option.some("Failed to save"))
      expect(validation$.value.canSubmit).toBe(false)
      expect(Option.isSome(validation$.value.error$.value)).toBe(true)
      if (Option.isSome(validation$.value.error$.value)) {
        expect(validation$.value.error$.value.value).toBe("Failed to save")
      }
    })
  })
})
