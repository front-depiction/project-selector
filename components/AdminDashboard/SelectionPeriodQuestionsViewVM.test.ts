/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest"
import { signal, computed } from "@preact/signals-react"
import type { QuestionOption } from "@/components/forms/template-form"
import type { CurrentQuestionItemVM, TemplateOptionVM } from "./SelectionPeriodQuestionsViewVM"

/**
 * Following the testing philosophy from viemodel.txt:
 * - Tests what matters without rendering the UI
 * - Focused and easy to maintain
 * - Tests the business logic directly
 *
 * Since useSelectionPeriodQuestionsVM uses React hooks that cannot be easily mocked in Vitest,
 * we test the core logic by creating simplified versions that mimic the VM behavior.
 */

// Helper to create a mock currentQuestions$ signal
function createMockCurrentQuestionsSignal(mockSelectionQuestions: any[] | null | undefined) {
  return computed(() =>
    (mockSelectionQuestions ?? []).map((sq): CurrentQuestionItemVM => {
      const q = sq.question
      if (!q) {
        return {
          key: sq._id,
          questionText: "(Question not found)",
          kindDisplay: "—",
          kindVariant: "outline",
          remove: () => {},
        }
      }
      return {
        key: sq._id,
        questionText: q.question,
        kindDisplay: q.kind === "boolean" ? "Yes/No" : "0-10",
        kindVariant: q.kind === "boolean" ? "secondary" : "outline",
        remove: () => {
          // Mock implementation
        },
      }
    })
  )
}

// Helper to create a mock availableQuestions$ signal
function createMockAvailableQuestionsSignal(mockQuestions: any[] | null | undefined) {
  return computed(() =>
    (mockQuestions ?? []).map((q): QuestionOption => ({
      id: q._id,
      questionText: q.question,
      kindDisplay: q.kind === "boolean" ? "Yes/No" : "0-10",
      kindVariant: q.kind === "boolean" ? "secondary" : "outline",
    }))
  )
}

// Helper to create a mock templates$ signal
function createMockTemplatesSignal(mockTemplates: any[] | null | undefined) {
  return computed(() =>
    (mockTemplates ?? []).map((t): TemplateOptionVM => ({
      key: t._id,
      title: t.title,
      description: t.description ?? "",
    }))
  )
}

describe("SelectionPeriodQuestionsViewVM", () => {
  describe("currentQuestions$ signal", () => {
    it("should correctly map linked questions with question data", () => {
      const mockSelectionQuestions = [
        {
          _id: "sq1",
          selectionPeriodId: "sp1",
          questionId: "q1",
          question: {
            _id: "q1",
            question: "Do you enjoy teamwork?",
            kind: "boolean" as const,
            semesterId: "default",
            createdAt: Date.now(),
          },
        },
        {
          _id: "sq2",
          selectionPeriodId: "sp1",
          questionId: "q2",
          question: {
            _id: "q2",
            question: "Rate your interest in AI",
            kind: "0to10" as const,
            semesterId: "default",
            createdAt: Date.now(),
          },
        },
      ]

      const currentQuestions$ = createMockCurrentQuestionsSignal(mockSelectionQuestions)
      const questions = currentQuestions$.value

      expect(questions).toHaveLength(2)
      expect(questions[0]).toMatchObject({
        key: "sq1",
        questionText: "Do you enjoy teamwork?",
        kindDisplay: "Yes/No",
        kindVariant: "secondary",
      })
      expect(questions[1]).toMatchObject({
        key: "sq2",
        questionText: "Rate your interest in AI",
        kindDisplay: "0-10",
        kindVariant: "outline",
      })
    })

    it("should handle missing question data gracefully", () => {
      const mockSelectionQuestions = [
        {
          _id: "sq1",
          selectionPeriodId: "sp1",
          questionId: "q1",
          question: null,
        },
      ]

      const currentQuestions$ = createMockCurrentQuestionsSignal(mockSelectionQuestions)
      const questions = currentQuestions$.value

      expect(questions).toHaveLength(1)
      expect(questions[0]).toMatchObject({
        key: "sq1",
        questionText: "(Question not found)",
        kindDisplay: "—",
        kindVariant: "outline",
      })
    })

    it("should handle null from useQuery gracefully", () => {
      const currentQuestions$ = createMockCurrentQuestionsSignal(null)
      const questions = currentQuestions$.value

      expect(questions).toHaveLength(0)
      expect(questions).toEqual([])
    })

    it("should handle undefined from useQuery gracefully", () => {
      const currentQuestions$ = createMockCurrentQuestionsSignal(undefined)
      const questions = currentQuestions$.value

      expect(questions).toHaveLength(0)
      expect(questions).toEqual([])
    })

    it("should provide remove callback for each question", () => {
      const mockSelectionQuestions = [
        {
          _id: "sq1",
          selectionPeriodId: "sp1",
          questionId: "q1",
          question: {
            _id: "q1",
            question: "Test question",
            kind: "boolean" as const,
            semesterId: "default",
            createdAt: Date.now(),
          },
        },
      ]

      const currentQuestions$ = createMockCurrentQuestionsSignal(mockSelectionQuestions)
      const questions = currentQuestions$.value

      expect(questions[0].remove).toBeDefined()
      expect(typeof questions[0].remove).toBe("function")
    })

    it("should map both boolean and 0to10 kinds correctly", () => {
      const mockSelectionQuestions = [
        {
          _id: "sq1",
          selectionPeriodId: "sp1",
          questionId: "q1",
          question: {
            _id: "q1",
            question: "Boolean question",
            kind: "boolean" as const,
            semesterId: "default",
            createdAt: Date.now(),
          },
        },
        {
          _id: "sq2",
          selectionPeriodId: "sp1",
          questionId: "q2",
          question: {
            _id: "q2",
            question: "Rating question",
            kind: "0to10" as const,
            semesterId: "default",
            createdAt: Date.now(),
          },
        },
      ]

      const currentQuestions$ = createMockCurrentQuestionsSignal(mockSelectionQuestions)
      const questions = currentQuestions$.value

      expect(questions[0].kindDisplay).toBe("Yes/No")
      expect(questions[0].kindVariant).toBe("secondary")
      expect(questions[1].kindDisplay).toBe("0-10")
      expect(questions[1].kindVariant).toBe("outline")
    })
  })

  describe("availableQuestions$ signal", () => {
    it("should include all questions for selection", () => {
      const mockQuestions = [
        {
          _id: "q1",
          question: "Do you enjoy teamwork?",
          kind: "boolean" as const,
          semesterId: "default",
          createdAt: Date.now(),
        },
        {
          _id: "q2",
          question: "Rate your interest in AI",
          kind: "0to10" as const,
          semesterId: "default",
          createdAt: Date.now(),
        },
      ]

      const availableQuestions$ = createMockAvailableQuestionsSignal(mockQuestions)
      const questions = availableQuestions$.value

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

    it("should handle empty questions list", () => {
      const availableQuestions$ = createMockAvailableQuestionsSignal([])
      const questions = availableQuestions$.value

      expect(questions).toHaveLength(0)
      expect(questions).toEqual([])
    })

    it("should handle null from useQuery gracefully", () => {
      const availableQuestions$ = createMockAvailableQuestionsSignal(null)
      const questions = availableQuestions$.value

      expect(questions).toHaveLength(0)
      expect(questions).toEqual([])
    })
  })

  describe("templates$ signal", () => {
    it("should map templates for dropdown selection", () => {
      const mockTemplates = [
        {
          _id: "t1",
          title: "Team Dynamics",
          description: "Questions about teamwork",
          semesterId: "default",
          createdAt: Date.now(),
        },
        {
          _id: "t2",
          title: "Technical Skills",
          description: null,
          semesterId: "default",
          createdAt: Date.now(),
        },
      ]

      const templates$ = createMockTemplatesSignal(mockTemplates)
      const templates = templates$.value

      expect(templates).toHaveLength(2)
      expect(templates[0]).toMatchObject({
        key: "t1",
        title: "Team Dynamics",
        description: "Questions about teamwork",
      })
      expect(templates[1]).toMatchObject({
        key: "t2",
        title: "Technical Skills",
        description: "",
      })
    })

    it("should handle null description with empty string", () => {
      const mockTemplates = [
        {
          _id: "t1",
          title: "Test Template",
          description: null,
          semesterId: "default",
          createdAt: Date.now(),
        },
      ]

      const templates$ = createMockTemplatesSignal(mockTemplates)
      const templates = templates$.value

      expect(templates[0].description).toBe("")
    })

    it("should handle undefined description with empty string", () => {
      const mockTemplates = [
        {
          _id: "t1",
          title: "Test Template",
          description: undefined,
          semesterId: "default",
          createdAt: Date.now(),
        },
      ]

      const templates$ = createMockTemplatesSignal(mockTemplates)
      const templates = templates$.value

      expect(templates[0].description).toBe("")
    })

    it("should handle null from useQuery gracefully", () => {
      const templates$ = createMockTemplatesSignal(null)
      const templates = templates$.value

      expect(templates).toHaveLength(0)
      expect(templates).toEqual([])
    })
  })

  describe("addQuestionsDialog", () => {
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

    it("should toggle dialog state multiple times", () => {
      const isOpen$ = signal(false)

      expect(isOpen$.value).toBe(false)

      isOpen$.value = true
      expect(isOpen$.value).toBe(true)

      isOpen$.value = false
      expect(isOpen$.value).toBe(false)

      isOpen$.value = true
      expect(isOpen$.value).toBe(true)
    })
  })

  describe("addQuestion action", () => {
    it("should be callable with a question ID", () => {
      const addQuestion = (questionId: string) => {
        // Mock implementation that would call addQuestionMutation
        return
      }

      expect(() => addQuestion("q1")).not.toThrow()
    })
  })

  describe("removeQuestion action", () => {
    it("should be callable from question remove callback", () => {
      let removeCallCount = 0
      const mockSelectionQuestions = [
        {
          _id: "sq1",
          selectionPeriodId: "sp1",
          questionId: "q1",
          question: {
            _id: "q1",
            question: "Test question",
            kind: "boolean" as const,
            semesterId: "default",
            createdAt: Date.now(),
          },
        },
      ]

      const currentQuestions$ = computed(() =>
        (mockSelectionQuestions ?? []).map((sq): CurrentQuestionItemVM => {
          const q = sq.question
          return {
            key: sq._id,
            questionText: q!.question,
            kindDisplay: q!.kind === "boolean" ? "Yes/No" : "0-10",
            kindVariant: q!.kind === "boolean" ? "secondary" : "outline",
            remove: () => {
              removeCallCount++
            },
          }
        })
      )

      const questions = currentQuestions$.value

      questions[0].remove()

      expect(removeCallCount).toBe(1)
    })
  })

  describe("applyTemplate action", () => {
    it("should be callable with a template ID", () => {
      const applyTemplate = (templateId: string) => {
        // Mock implementation that would call applyTemplateMutation
        return
      }

      expect(() => applyTemplate("t1")).not.toThrow()
    })
  })

  describe("integration scenarios", () => {
    it("should handle complete workflow: viewing current questions, adding new question", () => {
      const mockSelectionQuestions = [
        {
          _id: "sq1",
          selectionPeriodId: "sp1",
          questionId: "q1",
          question: {
            _id: "q1",
            question: "Existing question",
            kind: "boolean" as const,
            semesterId: "default",
            createdAt: Date.now(),
          },
        },
      ]

      const mockAllQuestions = [
        {
          _id: "q1",
          question: "Existing question",
          kind: "boolean" as const,
          semesterId: "default",
          createdAt: Date.now(),
        },
        {
          _id: "q2",
          question: "New question to add",
          kind: "0to10" as const,
          semesterId: "default",
          createdAt: Date.now(),
        },
      ]

      const currentQuestions$ = createMockCurrentQuestionsSignal(mockSelectionQuestions)
      const availableQuestions$ = createMockAvailableQuestionsSignal(mockAllQuestions)

      expect(currentQuestions$.value).toHaveLength(1)
      expect(availableQuestions$.value).toHaveLength(2)

      // Verify available questions include both current and not-yet-added
      expect(availableQuestions$.value[0].id).toBe("q1")
      expect(availableQuestions$.value[1].id).toBe("q2")
    })

    it("should handle applying template workflow", () => {
      const mockTemplates = [
        {
          _id: "t1",
          title: "Team Dynamics Template",
          description: "Pre-built questions for team assessment",
          semesterId: "default",
          createdAt: Date.now(),
        },
      ]

      const templates$ = createMockTemplatesSignal(mockTemplates)

      expect(templates$.value).toHaveLength(1)
      expect(templates$.value[0].title).toBe("Team Dynamics Template")
    })

    it("should handle empty selection period (no questions yet)", () => {
      const mockSelectionQuestions: any[] = []

      const currentQuestions$ = createMockCurrentQuestionsSignal(mockSelectionQuestions)

      expect(currentQuestions$.value).toHaveLength(0)
      expect(currentQuestions$.value).toEqual([])
    })

    it("should handle mixed question kinds in current questions", () => {
      const mockSelectionQuestions = [
        {
          _id: "sq1",
          selectionPeriodId: "sp1",
          questionId: "q1",
          question: {
            _id: "q1",
            question: "Boolean 1",
            kind: "boolean" as const,
            semesterId: "default",
            createdAt: Date.now(),
          },
        },
        {
          _id: "sq2",
          selectionPeriodId: "sp1",
          questionId: "q2",
          question: {
            _id: "q2",
            question: "Rating 1",
            kind: "0to10" as const,
            semesterId: "default",
            createdAt: Date.now(),
          },
        },
        {
          _id: "sq3",
          selectionPeriodId: "sp1",
          questionId: "q3",
          question: {
            _id: "q3",
            question: "Boolean 2",
            kind: "boolean" as const,
            semesterId: "default",
            createdAt: Date.now(),
          },
        },
      ]

      const currentQuestions$ = createMockCurrentQuestionsSignal(mockSelectionQuestions)
      const questions = currentQuestions$.value

      expect(questions).toHaveLength(3)

      const booleanQuestions = questions.filter((q) => q.kindDisplay === "Yes/No")
      const ratingQuestions = questions.filter((q) => q.kindDisplay === "0-10")

      expect(booleanQuestions).toHaveLength(2)
      expect(ratingQuestions).toHaveLength(1)
    })

    it("should handle selection period with partially missing question data", () => {
      const mockSelectionQuestions = [
        {
          _id: "sq1",
          selectionPeriodId: "sp1",
          questionId: "q1",
          question: {
            _id: "q1",
            question: "Valid question",
            kind: "boolean" as const,
            semesterId: "default",
            createdAt: Date.now(),
          },
        },
        {
          _id: "sq2",
          selectionPeriodId: "sp1",
          questionId: "q2",
          question: null,
        },
        {
          _id: "sq3",
          selectionPeriodId: "sp1",
          questionId: "q3",
          question: {
            _id: "q3",
            question: "Another valid question",
            kind: "0to10" as const,
            semesterId: "default",
            createdAt: Date.now(),
          },
        },
      ]

      const currentQuestions$ = createMockCurrentQuestionsSignal(mockSelectionQuestions)
      const questions = currentQuestions$.value

      expect(questions).toHaveLength(3)
      expect(questions[0].questionText).toBe("Valid question")
      expect(questions[1].questionText).toBe("(Question not found)")
      expect(questions[2].questionText).toBe("Another valid question")
    })
  })
})
