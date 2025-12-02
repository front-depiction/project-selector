"use client"
import { signal, computed, ReadonlySignal, Signal, batch } from "@preact/signals-react"
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

export interface SelectionPeriodQuestionsViewVM {
  readonly currentQuestions$: ReadonlySignal<readonly CurrentQuestionItemVM[]>
  readonly availableQuestions$: ReadonlySignal<readonly QuestionOption[]>
  readonly templates$: ReadonlySignal<readonly TemplateOptionVM[]>
  readonly selectedQuestionIds$: ReadonlySignal<Set<string>>
  readonly selectedTemplateId$: ReadonlySignal<string>
  readonly addQuestionsDialog: DialogVM
  readonly addQuestion: (questionId: Id<"questions">) => void
  readonly applyTemplate: (templateId: Id<"questionTemplates">) => void
  readonly toggleQuestion: (id: string) => void
  readonly setTemplateId: (id: string) => void
  readonly addSelectedQuestions: () => void
  readonly applySelectedTemplate: () => void
}

// ============================================================================
// Types for dependencies
// ============================================================================

export interface SelectionQuestion {
  readonly _id: Id<"selectionQuestions">
  readonly question?: {
    readonly _id: Id<"questions">
    readonly question: string
    readonly kind: "boolean" | "scale"
  }
}

export interface Question {
  readonly _id: Id<"questions">
  readonly question: string
  readonly kind: "boolean" | "scale"
}

export interface QuestionTemplate {
  readonly _id: Id<"questionTemplates">
  readonly title: string
  readonly description?: string
}

export interface SelectionPeriodQuestionsViewVMDeps {
  readonly selectionPeriodId: Id<"selectionPeriods">
  readonly currentQuestionsData$: ReadonlySignal<SelectionQuestion[] | undefined>
  readonly allQuestions$: ReadonlySignal<Question[] | undefined>
  readonly templates$: ReadonlySignal<QuestionTemplate[] | undefined>
  readonly addQuestionMutation: (args: {
    selectionPeriodId: Id<"selectionPeriods">
    questionId: Id<"questions">
  }) => Promise<any>
  readonly removeQuestionMutation: (args: {
    selectionPeriodId: Id<"selectionPeriods">
    questionId: Id<"questions">
  }) => Promise<any>
  readonly applyTemplateMutation: (args: {
    selectionPeriodId: Id<"selectionPeriods">
    templateId: Id<"questionTemplates">
  }) => Promise<any>
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSelectionPeriodQuestionsViewVM(
  deps: SelectionPeriodQuestionsViewVMDeps
): SelectionPeriodQuestionsViewVM {
  const {
    selectionPeriodId,
    currentQuestionsData$,
    allQuestions$,
    templates$: templatesData$,
    addQuestionMutation,
    removeQuestionMutation,
    applyTemplateMutation,
  } = deps

  // Dialog and selection state - created once
  const addQuestionsDialogOpen$: Signal<boolean> = signal(false)
  const selectedQuestionIds$: Signal<Set<string>> = signal<Set<string>>(new Set())
  const selectedTemplateId$: Signal<string> = signal("")

  // Computed: current questions linked to this period
  const currentQuestions$ = computed((): readonly CurrentQuestionItemVM[] =>
    (currentQuestionsData$.value ?? []).map((sq): CurrentQuestionItemVM => {
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
    (allQuestions$.value ?? []).map((q): QuestionOption => ({
      id: q._id,
      questionText: q.question,
      kindDisplay: q.kind === "boolean" ? "Yes/No" : "0-10",
      kindVariant: q.kind === "boolean" ? "secondary" : "outline",
    }))
  )

  // Computed: templates formatted for dropdown/selection
  const templates$ = computed((): readonly TemplateOptionVM[] =>
    (templatesData$.value ?? []).map((t): TemplateOptionVM => ({
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

  // Selection actions
  const toggleQuestion = (id: string): void => {
    const newSet = new Set(selectedQuestionIds$.value)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    selectedQuestionIds$.value = newSet
  }

  const setTemplateId = (id: string): void => {
    selectedTemplateId$.value = id
  }

  const addSelectedQuestions = (): void => {
    selectedQuestionIds$.value.forEach((id) => {
      addQuestion(id as Id<"questions">)
    })
    batch(() => {
      selectedQuestionIds$.value = new Set()
      addQuestionsDialogOpen$.value = false
    })
  }

  const applySelectedTemplate = (): void => {
    if (selectedTemplateId$.value) {
      applyTemplate(selectedTemplateId$.value as Id<"questionTemplates">)
      batch(() => {
        selectedTemplateId$.value = ""
        addQuestionsDialogOpen$.value = false
      })
    }
  }

  return {
    currentQuestions$,
    availableQuestions$,
    templates$,
    selectedQuestionIds$,
    selectedTemplateId$,
    addQuestionsDialog,
    addQuestion,
    applyTemplate,
    toggleQuestion,
    setTemplateId,
    addSelectedQuestions,
    applySelectedTemplate,
  }
}
