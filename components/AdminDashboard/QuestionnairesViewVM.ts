import { signal, computed, ReadonlySignal, Signal } from "@preact/signals-react"
import type { Id } from "@/convex/_generated/dataModel"
import type { QuestionFormValues } from "@/components/forms/question-form"
import type { TemplateFormValues, QuestionOption } from "@/components/forms/template-form"

// ============================================================================
// View Model Types
// ============================================================================

export interface QuestionItemVM {
  readonly key: string
  readonly questionText: string
  readonly kindDisplay: string
  readonly kindVariant: "secondary" | "outline"
  readonly remove: () => void
}

export interface TemplateItemVM {
  readonly key: string
  readonly title: string
  readonly description: string
  readonly remove: () => void
}

export interface DialogVM {
  readonly isOpen$: ReadonlySignal<boolean>
  readonly open: () => void
  readonly close: () => void
}

export interface QuestionnairesViewVM {
  readonly questions$: ReadonlySignal<readonly QuestionItemVM[]>
  readonly templates$: ReadonlySignal<readonly TemplateItemVM[]>
  readonly questionDialog: DialogVM
  readonly templateDialog: DialogVM
  readonly availableQuestions$: ReadonlySignal<readonly QuestionOption[]>
  readonly onQuestionSubmit: (values: QuestionFormValues) => void
  readonly onTemplateSubmit: (values: TemplateFormValues) => void
}

// ============================================================================
// Types for Dependencies
// ============================================================================

export interface Question {
  readonly _id: string
  readonly question: string
  readonly kind: "boolean" | "0to10"
}

export interface Template {
  readonly _id: string
  readonly title: string
  readonly description?: string
}

export interface QuestionnairesViewDeps {
  readonly questions$: Signal<Question[] | undefined>
  readonly templates$: Signal<Template[] | undefined>
  readonly createQuestion: (args: { question: string; kind: "boolean" | "0to10"; semesterId: string }) => Promise<any>
  readonly deleteQuestion: (args: { id: Id<"questions"> }) => Promise<any>
  readonly createTemplate: (args: { title: string; description?: string; semesterId: string }) => Promise<any>
  readonly deleteTemplate: (args: { id: Id<"questionTemplates"> }) => Promise<any>
  readonly addQuestionToTemplate: (args: { templateId: Id<"questionTemplates">; questionId: Id<"questions"> }) => Promise<any>
}

// ============================================================================
// Factory Function
// ============================================================================

export function createQuestionnairesViewVM(deps: QuestionnairesViewDeps): QuestionnairesViewVM {
  // Create dialog state signals once
  const questionDialogOpen$ = signal(false)
  const templateDialogOpen$ = signal(false)

  // Computed: questions list for table
  const questions$ = computed((): readonly QuestionItemVM[] =>
    (deps.questions$.value ?? []).map((q): QuestionItemVM => ({
      key: q._id,
      questionText: q.question,
      kindDisplay: q.kind === "boolean" ? "Yes/No" : "0-10",
      kindVariant: q.kind === "boolean" ? "secondary" : "outline",
      remove: () => {
        deps.deleteQuestion({ id: q._id as Id<"questions"> }).catch(console.error)
      },
    }))
  )

  // Computed: templates list for table
  const templates$ = computed((): readonly TemplateItemVM[] =>
    (deps.templates$.value ?? []).map((t): TemplateItemVM => ({
      key: t._id,
      title: t.title,
      description: t.description ?? "—",
      remove: () => {
        deps.deleteTemplate({ id: t._id as Id<"questionTemplates"> }).catch(console.error)
      },
    }))
  )

  // Computed: questions available for template form
  const availableQuestions$ = computed((): readonly QuestionOption[] =>
    (deps.questions$.value ?? []).map((q): QuestionOption => ({
      id: q._id,
      questionText: q.question,
      kindDisplay: q.kind === "boolean" ? "Yes/No" : "0-10",
      kindVariant: q.kind === "boolean" ? "secondary" : "outline",
    }))
  )

  // Question dialog
  const questionDialog: DialogVM = {
    isOpen$: questionDialogOpen$,
    open: () => { questionDialogOpen$.value = true },
    close: () => { questionDialogOpen$.value = false },
  }

  // Template dialog
  const templateDialog: DialogVM = {
    isOpen$: templateDialogOpen$,
    open: () => { templateDialogOpen$.value = true },
    close: () => { templateDialogOpen$.value = false },
  }

  // Form submission handlers
  const onQuestionSubmit = (values: QuestionFormValues): void => {
    deps.createQuestion({
      question: values.question,
      kind: values.kind,
      semesterId: "default",
    })
      .then(() => {
        questionDialog.close()
      })
      .catch(console.error)
  }

  const onTemplateSubmit = (values: TemplateFormValues): void => {
    deps.createTemplate({
      title: values.title,
      description: values.description || undefined,
      semesterId: "default",
    })
      .then((templateId) => {
        const promises = values.questionIds.map(qId =>
          deps.addQuestionToTemplate({
            templateId,
            questionId: qId as Id<"questions">,
          })
        )
        return Promise.all(promises)
      })
      .then(() => {
        templateDialog.close()
      })
      .catch(console.error)
  }

  return {
    questions$,
    templates$,
    questionDialog,
    templateDialog,
    availableQuestions$,
    onQuestionSubmit,
    onTemplateSubmit,
  }
}
