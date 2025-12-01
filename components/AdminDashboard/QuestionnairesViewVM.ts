"use client"
import { signal, computed, ReadonlySignal } from "@preact/signals-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
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

export interface QuestionnairesVM {
  readonly questions$: ReadonlySignal<readonly QuestionItemVM[]>
  readonly templates$: ReadonlySignal<readonly TemplateItemVM[]>
  readonly questionDialog: DialogVM
  readonly templateDialog: DialogVM
  readonly availableQuestions$: ReadonlySignal<readonly QuestionOption[]>
  readonly onQuestionSubmit: (values: QuestionFormValues) => Promise<void>
  readonly onTemplateSubmit: (values: TemplateFormValues) => Promise<void>
}

// ============================================================================
// Hook - uses Convex as reactive primitive directly
// ============================================================================

export function useQuestionnairesVM(): QuestionnairesVM {
  // Convex queries - already reactive!
  const questions = useQuery(api.questions.getAllQuestions, {})
  const templates = useQuery(api.questionTemplates.getAllTemplates, {})

  // Convex mutations
  const createQuestion = useMutation(api.questions.createQuestion)
  const deleteQuestion = useMutation(api.questions.deleteQuestion)
  const createTemplate = useMutation(api.questionTemplates.createTemplate)
  const deleteTemplate = useMutation(api.questionTemplates.deleteTemplate)
  const addQuestionToTemplate = useMutation(api.templateQuestions.addQuestion)

  // Dialog state
  const questionDialogOpen$ = signal(false)
  const templateDialogOpen$ = signal(false)

  // Computed: questions list for table
  const questions$ = computed((): readonly QuestionItemVM[] =>
    (questions ?? []).map((q): QuestionItemVM => ({
      key: q._id,
      questionText: q.question,
      kindDisplay: q.kind === "boolean" ? "Yes/No" : "0-10",
      kindVariant: q.kind === "boolean" ? "secondary" : "outline",
      remove: () => {
        deleteQuestion({ id: q._id }).catch(console.error)
      },
    }))
  )

  // Computed: templates list for table
  const templates$ = computed((): readonly TemplateItemVM[] =>
    (templates ?? []).map((t): TemplateItemVM => ({
      key: t._id,
      title: t.title,
      description: t.description ?? "—",
      remove: () => {
        deleteTemplate({ id: t._id }).catch(console.error)
      },
    }))
  )

  // Computed: questions available for template form
  const availableQuestions$ = computed((): readonly QuestionOption[] =>
    (questions ?? []).map((q): QuestionOption => ({
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
  const onQuestionSubmit = async (values: QuestionFormValues): Promise<void> => {
    await createQuestion({
      question: values.question,
      kind: values.kind,
      semesterId: "default",
    })
    questionDialog.close()
  }

  const onTemplateSubmit = async (values: TemplateFormValues): Promise<void> => {
    const templateId = await createTemplate({
      title: values.title,
      description: values.description || undefined,
      semesterId: "default",
    })
    for (const qId of values.questionIds) {
      await addQuestionToTemplate({
        templateId,
        questionId: qId as Id<"questions">,
      })
    }
    templateDialog.close()
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
