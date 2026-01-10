import { signal, computed, ReadonlySignal, Signal } from "@preact/signals-react"
import type { Id } from "@/convex/_generated/dataModel"
import type { QuestionFormValues } from "@/components/forms/question-form"
import type { TemplateFormValues, QuestionOption } from "@/components/forms/template-form"
import type { CategoryFormValues } from "@/components/forms/category-form"

// ============================================================================
// View Model Types
// ============================================================================

export interface QuestionItemVM {
  readonly key: string
  readonly questionText: string
  readonly kindDisplay: string
  readonly kindVariant: "secondary" | "outline"
  readonly category?: string
  readonly remove: () => void
}

export interface TemplateItemVM {
  readonly key: string
  readonly title: string
  readonly description: string
  readonly remove: () => void
}

export interface CategoryItemVM {
  readonly key: string
  readonly name: string
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
  readonly categories$: ReadonlySignal<readonly CategoryItemVM[]>
  readonly questionDialog: DialogVM
  readonly templateDialog: DialogVM
  readonly categoryDialog: DialogVM
  readonly availableQuestions$: ReadonlySignal<readonly QuestionOption[]>
  readonly existingCategories$: ReadonlySignal<readonly string[]>
  readonly onQuestionSubmit: (values: QuestionFormValues) => void
  readonly onTemplateSubmit: (values: TemplateFormValues) => void
  readonly onCategorySubmit: (values: CategoryFormValues) => void
}

// ============================================================================
// Types for Dependencies
// ============================================================================

export interface Question {
  readonly _id: string
  readonly question: string
  readonly kind: "boolean" | "0to10"
  readonly category?: string
}

export interface Template {
  readonly _id: string
  readonly title: string
  readonly description?: string
}

export interface Category {
  readonly _id: string
  readonly name: string
  readonly description?: string
}

export interface QuestionnairesViewDeps {
  readonly questions$: Signal<Question[] | undefined>
  readonly templates$: Signal<Template[] | undefined>
  readonly categories$: Signal<Category[] | undefined>
  readonly existingCategories$: Signal<string[] | undefined>
  readonly createQuestion: (args: { question: string; kind: "boolean" | "0to10"; category?: string; semesterId: string }) => Promise<any>
  readonly deleteQuestion: (args: { id: Id<"questions"> }) => Promise<any>
  readonly createTemplate: (args: { title: string; description?: string; semesterId: string }) => Promise<any>
  readonly deleteTemplate: (args: { id: Id<"questionTemplates"> }) => Promise<any>
  readonly addQuestionToTemplate: (args: { templateId: Id<"questionTemplates">; questionId: Id<"questions"> }) => Promise<any>
  readonly createCategory: (args: { name: string; description?: string; semesterId: string }) => Promise<any>
  readonly deleteCategory: (args: { id: Id<"categories"> }) => Promise<any>
}

// ============================================================================
// Factory Function
// ============================================================================

export function createQuestionnairesViewVM(deps: QuestionnairesViewDeps): QuestionnairesViewVM {
  // Create dialog state signals once
  const questionDialogOpen$ = signal(false)
  const templateDialogOpen$ = signal(false)
  const categoryDialogOpen$ = signal(false)

  // Computed: questions list for table
  const questions$ = computed((): readonly QuestionItemVM[] =>
    (deps.questions$.value ?? []).map((q): QuestionItemVM => ({
      key: q._id,
      questionText: q.question,
      kindDisplay: q.kind === "boolean" ? "Yes/No" : "0-10",
      kindVariant: q.kind === "boolean" ? "secondary" : "outline",
      category: q.category,
      remove: () => {
        deps.deleteQuestion({ id: q._id as Id<"questions"> }).catch(console.error)
      },
    }))
  )

  // Computed: existing categories (for question form dropdown)
  const existingCategories$ = computed(() => deps.existingCategories$.value ?? [])

  // Computed: categories list for table
  const categories$ = computed((): readonly CategoryItemVM[] =>
    (deps.categories$.value ?? []).map((c): CategoryItemVM => ({
      key: c._id,
      name: c.name,
      description: c.description ?? "—",
      remove: () => {
        deps.deleteCategory({ id: c._id as Id<"categories"> }).catch(console.error)
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

  // Category dialog
  const categoryDialog: DialogVM = {
    isOpen$: categoryDialogOpen$,
    open: () => { categoryDialogOpen$.value = true },
    close: () => { categoryDialogOpen$.value = false },
  }

  // Form submission handlers
  const onQuestionSubmit = (values: QuestionFormValues): void => {
    deps.createQuestion({
      question: values.question,
      kind: values.kind,
      category: values.category || undefined,
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

  const onCategorySubmit = (values: CategoryFormValues): void => {
    deps.createCategory({
      name: values.name,
      description: values.description || undefined,
      semesterId: "default",
    })
      .then(() => {
        categoryDialog.close()
      })
      .catch(console.error)
  }

  return {
    questions$,
    templates$,
    categories$,
    questionDialog,
    templateDialog,
    categoryDialog,
    availableQuestions$,
    existingCategories$,
    onQuestionSubmit,
    onTemplateSubmit,
    onCategorySubmit,
  }
}
