"use client"
import { signal, computed, ReadonlySignal } from "@preact/signals-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { QuestionOption } from "@/components/forms/template-form"

// ============================================================================
// View Model Types
// ============================================================================

export interface CurrentQuestionItemVM {
  readonly key: string
  readonly questionText: string
  readonly kindDisplay: string
  readonly kindVariant: "secondary" | "outline"
  readonly remove: () => void
}

export interface TemplateOptionVM {
  readonly key: string
  readonly title: string
  readonly description: string
}

export interface DialogVM {
  readonly isOpen$: ReadonlySignal<boolean>
  readonly open: () => void
  readonly close: () => void
}

export interface SelectionPeriodQuestionsVM {
  readonly currentQuestions$: ReadonlySignal<readonly CurrentQuestionItemVM[]>
  readonly availableQuestions$: ReadonlySignal<readonly QuestionOption[]>
  readonly templates$: ReadonlySignal<readonly TemplateOptionVM[]>
  readonly addQuestionsDialog: DialogVM
  readonly addQuestion: (questionId: Id<"questions">) => void
  readonly applyTemplate: (templateId: Id<"questionTemplates">) => void
}

// ============================================================================
// Hook - uses Convex as reactive primitive directly
// ============================================================================

export function useSelectionPeriodQuestionsVM(
  selectionPeriodId: Id<"selectionPeriods">
): SelectionPeriodQuestionsVM {
  // Convex queries - already reactive!
  const currentQuestionsData = useQuery(
    api.selectionQuestions.getQuestionsForPeriod,
    { selectionPeriodId }
  )
  const allQuestions = useQuery(api.questions.getAllQuestions, {})
  const templates = useQuery(api.questionTemplates.getAllTemplates, {})

  // Convex mutations
  const addQuestionMutation = useMutation(api.selectionQuestions.addQuestion)
  const removeQuestionMutation = useMutation(api.selectionQuestions.removeQuestion)
  const applyTemplateMutation = useMutation(api.selectionQuestions.applyTemplate)

  // Dialog state
  const addQuestionsDialogOpen$ = signal(false)

  // Computed: current questions linked to this period
  const currentQuestions$ = computed((): readonly CurrentQuestionItemVM[] =>
    (currentQuestionsData ?? []).map((sq): CurrentQuestionItemVM => {
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
          removeQuestionMutation({
            selectionPeriodId,
            questionId: q._id,
          }).catch(console.error)
        },
      }
    })
  )

  // Computed: all available questions for selection UI
  const availableQuestions$ = computed((): readonly QuestionOption[] =>
    (allQuestions ?? []).map((q): QuestionOption => ({
      id: q._id,
      questionText: q.question,
      kindDisplay: q.kind === "boolean" ? "Yes/No" : "0-10",
      kindVariant: q.kind === "boolean" ? "secondary" : "outline",
    }))
  )

  // Computed: templates formatted for dropdown/selection
  const templates$ = computed((): readonly TemplateOptionVM[] =>
    (templates ?? []).map((t): TemplateOptionVM => ({
      key: t._id,
      title: t.title,
      description: t.description ?? "",
    }))
  )

  // Add Questions Dialog
  const addQuestionsDialog: DialogVM = {
    isOpen$: addQuestionsDialogOpen$,
    open: () => {
      addQuestionsDialogOpen$.value = true
    },
    close: () => {
      addQuestionsDialogOpen$.value = false
    },
  }

  // Mutation handlers
  const addQuestion = (questionId: Id<"questions">): void => {
    addQuestionMutation({
      selectionPeriodId,
      questionId,
    }).catch(console.error)
  }

  const applyTemplate = (templateId: Id<"questionTemplates">): void => {
    applyTemplateMutation({
      selectionPeriodId,
      templateId,
    }).catch(console.error)
  }

  return {
    currentQuestions$,
    availableQuestions$,
    templates$,
    addQuestionsDialog,
    addQuestion,
    applyTemplate,
  }
}
