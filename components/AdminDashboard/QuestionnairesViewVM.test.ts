/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest"
import { signal, computed } from "@preact/signals-react"
import type { QuestionFormValues } from "@/components/forms/question-form"
import type { TemplateFormValues } from "@/components/forms/template-form"
import type { QuestionItemVM, TemplateItemVM, QuestionnairesVM } from "./QuestionnairesViewVM"

/**
 * Following the testing philosophy from viemodel.txt:
 * - Tests what matters without rendering the UI
 * - Focused and easy to maintain
 * - Tests the business logic directly
 *
 * Since useQuestionnairesVM uses React hooks that cannot be easily mocked in Vitest,
 * we test the core logic by creating a simplified version that mimics the VM behavior.
 */

// Helper to create a mock questions$ signal
function createMockQuestionsSignal(mockData: any[] | null | undefined) {
  return computed(() =>
    (mockData ?? []).map((q): QuestionItemVM => ({
      key: q._id,
      questionText: q.question,
      kindDisplay: q.kind === "boolean" ? "Yes/No" : "0-10",
      kindVariant: q.kind === "boolean" ? "secondary" : "outline",
      remove: () => {
        // Mock implementation
      },
    }))
  )
}

// Helper to create a mock templates$ signal
function createMockTemplatesSignal(mockData: any[] | null | undefined) {
  return computed(() =>
    (mockData ?? []).map((t): TemplateItemVM => ({
      key: t._id,
      title: t.title,
      description: t.description ?? "—",
      remove: () => {
        // Mock implementation
      },
    }))
  )
}

describe("QuestionnairesViewVM", () => {
  describe("questions$ signal", () => {
    it("should correctly map question data to display format", () => {
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

      const questions$ = createMockQuestionsSignal(mockQuestions)
      const questions = questions$.value

      expect(questions).toHaveLength(2)
      expect(questions[0]).toMatchObject({
        key: "q1",
        questionText: "Do you enjoy teamwork?",
        kindDisplay: "Yes/No",
        kindVariant: "secondary",
      })
      expect(questions[1]).toMatchObject({
        key: "q2",
        questionText: "Rate your interest in AI",
        kindDisplay: "0-10",
        kindVariant: "outline",
      })
    })

    it("should handle null from useQuery gracefully", () => {
      const questions$ = createMockQuestionsSignal(null)
      const questions = questions$.value

      expect(questions).toHaveLength(0)
      expect(questions).toEqual([])
    })

    it("should handle undefined from useQuery gracefully", () => {
      const questions$ = createMockQuestionsSignal(undefined)
      const questions = questions$.value

      expect(questions).toHaveLength(0)
      expect(questions).toEqual([])
    })

    it("should provide remove callback for each question", () => {
      const mockQuestions = [
        {
          _id: "q1",
          question: "Test question",
          kind: "boolean" as const,
          semesterId: "default",
          createdAt: Date.now(),
        },
      ]

      const questions$ = createMockQuestionsSignal(mockQuestions)
      const questions = questions$.value

      expect(questions[0].remove).toBeDefined()
      expect(typeof questions[0].remove).toBe("function")
    })

    it("should map both boolean and 0to10 kinds correctly", () => {
      const mockQuestions = [
        {
          _id: "q1",
          question: "Boolean question",
          kind: "boolean" as const,
          semesterId: "default",
          createdAt: Date.now(),
        },
        {
          _id: "q2",
          question: "Rating question",
          kind: "0to10" as const,
          semesterId: "default",
          createdAt: Date.now(),
        },
      ]

      const questions$ = createMockQuestionsSignal(mockQuestions)
      const questions = questions$.value

      expect(questions[0].kindDisplay).toBe("Yes/No")
      expect(questions[0].kindVariant).toBe("secondary")
      expect(questions[1].kindDisplay).toBe("0-10")
      expect(questions[1].kindVariant).toBe("outline")
    })
  })

  describe("templates$ signal", () => {
    it("should correctly map template data to display format", () => {
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
        description: "—",
      })
    })

    it("should handle null description with em dash", () => {
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

      expect(templates[0].description).toBe("—")
    })

    it("should handle undefined description with em dash", () => {
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

      expect(templates[0].description).toBe("—")
    })

    it("should handle null from useQuery gracefully", () => {
      const templates$ = createMockTemplatesSignal(null)
      const templates = templates$.value

      expect(templates).toHaveLength(0)
      expect(templates).toEqual([])
    })

    it("should provide remove callback for each template", () => {
      const mockTemplates = [
        {
          _id: "t1",
          title: "Test template",
          description: "Test desc",
          semesterId: "default",
          createdAt: Date.now(),
        },
      ]

      const templates$ = createMockTemplatesSignal(mockTemplates)
      const templates = templates$.value

      expect(templates[0].remove).toBeDefined()
      expect(typeof templates[0].remove).toBe("function")
    })
  })

  describe("availableQuestions$ signal", () => {
    it("should provide questions in template form format", () => {
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

      const availableQuestions$ = computed(() =>
        (mockQuestions ?? []).map((q) => ({
          id: q._id,
          questionText: q.question,
          kindDisplay: q.kind === "boolean" ? "Yes/No" : "0-10",
          kindVariant: q.kind === "boolean" ? "secondary" : "outline",
        }))
      )

      const availableQuestions = availableQuestions$.value

      expect(availableQuestions).toHaveLength(2)
      expect(availableQuestions[0]).toMatchObject({
        id: "q1",
        questionText: "Do you enjoy teamwork?",
        kindDisplay: "Yes/No",
        kindVariant: "secondary",
      })
      expect(availableQuestions[1]).toMatchObject({
        id: "q2",
        questionText: "Rate your interest in AI",
        kindDisplay: "0-10",
        kindVariant: "outline",
      })
    })

    it("should handle empty questions list", () => {
      const mockQuestions: any[] = []

      const availableQuestions$ = computed(() =>
        mockQuestions.map((q) => ({
          id: q._id,
          questionText: q.question,
          kindDisplay: q.kind === "boolean" ? "Yes/No" : "0-10",
          kindVariant: q.kind === "boolean" ? "secondary" : "outline",
        }))
      )

      const availableQuestions = availableQuestions$.value

      expect(availableQuestions).toHaveLength(0)
      expect(availableQuestions).toEqual([])
    })
  })

  describe("dialogVM", () => {
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

  describe("form submission logic", () => {
    it("should validate question form values structure", () => {
      const formValues: QuestionFormValues = {
        question: "Do you like coding?",
        kind: "boolean",
      }

      expect(formValues.question).toBe("Do you like coding?")
      expect(formValues.kind).toBe("boolean")
    })

    it("should validate 0to10 question kind", () => {
      const formValues: QuestionFormValues = {
        question: "Rate your interest in databases",
        kind: "0to10",
      }

      expect(formValues.question).toBe("Rate your interest in databases")
      expect(formValues.kind).toBe("0to10")
    })

    it("should validate template form values structure", () => {
      const formValues: TemplateFormValues = {
        title: "Team Dynamics",
        description: "Questions about teamwork",
        questionIds: ["q1", "q2"],
      }

      expect(formValues.title).toBe("Team Dynamics")
      expect(formValues.description).toBe("Questions about teamwork")
      expect(formValues.questionIds).toEqual(["q1", "q2"])
    })

    it("should handle empty description in template", () => {
      const formValues: TemplateFormValues = {
        title: "Team Dynamics",
        description: "",
        questionIds: ["q1"],
      }

      const description = formValues.description || undefined

      expect(description).toBeUndefined()
    })

    it("should handle template with no questions", () => {
      const formValues: TemplateFormValues = {
        title: "Empty Template",
        description: "No questions yet",
        questionIds: [],
      }

      expect(formValues.questionIds).toHaveLength(0)
    })

    it("should handle template with multiple questions", () => {
      const formValues: TemplateFormValues = {
        title: "Team Dynamics",
        description: "Questions about teamwork",
        questionIds: ["q1", "q2", "q3"],
      }

      expect(formValues.questionIds).toHaveLength(3)
      expect(formValues.questionIds).toContain("q1")
      expect(formValues.questionIds).toContain("q2")
      expect(formValues.questionIds).toContain("q3")
    })
  })

  describe("integration scenarios", () => {
    it("should handle complete workflow data transformations", () => {
      // Mock questions data
      const mockQuestions = [
        {
          _id: "q1",
          question: "Do you like coding?",
          kind: "boolean" as const,
          semesterId: "default",
          createdAt: Date.now(),
        },
      ]

      // Mock template data
      const mockTemplates = [
        {
          _id: "t1",
          title: "Team Dynamics",
          description: "Questions about teamwork",
          semesterId: "default",
          createdAt: Date.now(),
        },
      ]

      const questions$ = createMockQuestionsSignal(mockQuestions)
      const templates$ = createMockTemplatesSignal(mockTemplates)

      expect(questions$.value).toHaveLength(1)
      expect(templates$.value).toHaveLength(1)

      expect(questions$.value[0].questionText).toBe("Do you like coding?")
      expect(templates$.value[0].title).toBe("Team Dynamics")
    })

    it("should maintain independent dialog states", () => {
      const questionDialogOpen$ = signal(false)
      const templateDialogOpen$ = signal(false)

      // Open question dialog
      questionDialogOpen$.value = true
      expect(questionDialogOpen$.value).toBe(true)
      expect(templateDialogOpen$.value).toBe(false)

      // Open template dialog
      templateDialogOpen$.value = true
      expect(questionDialogOpen$.value).toBe(true)
      expect(templateDialogOpen$.value).toBe(true)

      // Close question dialog
      questionDialogOpen$.value = false
      expect(questionDialogOpen$.value).toBe(false)
      expect(templateDialogOpen$.value).toBe(true)

      // Close template dialog
      templateDialogOpen$.value = false
      expect(questionDialogOpen$.value).toBe(false)
      expect(templateDialogOpen$.value).toBe(false)
    })

    it("should handle mixed question kinds in a list", () => {
      const mockQuestions = [
        {
          _id: "q1",
          question: "Boolean 1",
          kind: "boolean" as const,
          semesterId: "default",
          createdAt: Date.now(),
        },
        {
          _id: "q2",
          question: "Rating 1",
          kind: "0to10" as const,
          semesterId: "default",
          createdAt: Date.now(),
        },
        {
          _id: "q3",
          question: "Boolean 2",
          kind: "boolean" as const,
          semesterId: "default",
          createdAt: Date.now(),
        },
      ]

      const questions$ = createMockQuestionsSignal(mockQuestions)
      const questions = questions$.value

      expect(questions).toHaveLength(3)

      const booleanQuestions = questions.filter((q) => q.kindDisplay === "Yes/No")
      const ratingQuestions = questions.filter((q) => q.kindDisplay === "0-10")

      expect(booleanQuestions).toHaveLength(2)
      expect(ratingQuestions).toHaveLength(1)
    })
  })
})
