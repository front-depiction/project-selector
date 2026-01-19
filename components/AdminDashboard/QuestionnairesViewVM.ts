import { signal, computed, ReadonlySignal, Signal } from "@preact/signals-react"
import * as EffectOption from "effect/Option"
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
  readonly edit: () => void
  readonly remove: () => void
}

export interface TemplateItemVM {
  readonly key: string
  readonly title: string
  readonly description: string
  readonly edit: () => void
  readonly remove: () => void
}

export interface CategoryItemVM {
  readonly key: string
  readonly name: string
  readonly description: string
  readonly criterionType?: "prerequisite" | "minimize" | "pull" | null
  readonly criterionDisplay: string
  readonly criterionBadgeVariant: "default" | "secondary" | "outline"
  readonly edit: () => void
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
  readonly editingQuestion$: ReadonlySignal<EffectOption.Option<Question>>
  readonly editingTemplate$: ReadonlySignal<EffectOption.Option<Template & { questions?: Question[] }>>
  readonly editingCategory$: ReadonlySignal<EffectOption.Option<Category>>
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
  readonly kind: "boolean" | "0to6"
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
  readonly criterionType?: "prerequisite" | "minimize" | "pull" | null
  readonly minRatio?: number
  readonly target?: number
}

export interface QuestionnairesViewDeps {
  readonly questions$: Signal<Question[] | undefined>
  readonly templates$: Signal<Template[] | undefined>
  readonly categories$: Signal<Category[] | undefined>
  readonly existingCategories$: Signal<string[] | undefined>
  readonly createQuestion: (args: { question: string; kind: "boolean" | "0to6"; category?: string; semesterId: string }) => Promise<any>
  readonly updateQuestion: (args: { id: Id<"questions">; question?: string; kind?: "boolean" | "0to6"; category?: string }) => Promise<any>
  readonly deleteQuestion: (args: { id: Id<"questions"> }) => Promise<any>
  readonly createTemplate: (args: { title: string; description?: string; semesterId: string }) => Promise<any>
  readonly updateTemplate: (args: { id: Id<"questionTemplates">; title?: string; description?: string }) => Promise<any>
  readonly deleteTemplate: (args: { id: Id<"questionTemplates"> }) => Promise<any>
  readonly getTemplateWithQuestions: (args: { id: Id<"questionTemplates"> }) => Promise<any>
  readonly addQuestionToTemplate: (args: { templateId: Id<"questionTemplates">; questionId: Id<"questions"> }) => Promise<any>
  readonly reorderTemplateQuestions: (args: { templateId: Id<"questionTemplates">; questionIds: Id<"questions">[] }) => Promise<any>
  readonly createCategory: (args: { 
    name: string
    description?: string
    semesterId: string
    criterionType?: "prerequisite" | "minimize" | "pull" | null
    minRatio?: number
    target?: number
  }) => Promise<any>
  readonly updateCategory: (args: { 
    id: Id<"categories">
    name?: string
    description?: string
    criterionType?: "prerequisite" | "minimize" | "pull" | null
    minRatio?: number
    target?: number
  }) => Promise<any>
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

  // Edit state signals
  const editingQuestion$ = signal<EffectOption.Option<Question>>(EffectOption.none())
  const editingTemplate$ = signal<EffectOption.Option<Template & { questions?: Question[] }>>(EffectOption.none())
  const editingCategory$ = signal<EffectOption.Option<Category>>(EffectOption.none())

  // Computed: questions list for table
  const questions$ = computed((): readonly QuestionItemVM[] =>
    (deps.questions$.value ?? []).map((q): QuestionItemVM => ({
      key: q._id,
      questionText: q.question,
      kindDisplay: q.kind === "boolean" ? "Yes/No" : "0-6",
      kindVariant: q.kind === "boolean" ? "secondary" : "outline",
      category: q.category,
      remove: () => {
        deps.deleteQuestion({ id: q._id as Id<"questions"> }).catch(console.error)
      },
      edit: () => {
        editingQuestion$.value = EffectOption.some(q)
        questionDialogOpen$.value = true
      }
    }))
  )

  // Computed: existing categories (for question form dropdown)
  const existingCategories$ = computed(() => deps.existingCategories$.value ?? [])

  // Computed: categories list for table
  const categories$ = computed((): readonly CategoryItemVM[] =>
    (deps.categories$.value ?? []).map((c): CategoryItemVM => {
      const criterionType = c.criterionType
      let criterionDisplay = "None"
      let criterionBadgeVariant: "default" | "secondary" | "outline" = "outline"
      
      if (criterionType === "prerequisite") {
        criterionDisplay = c.minRatio !== undefined 
          ? `Required Min: ${Math.round(c.minRatio * 100)}%`
          : "Required Minimum"
        criterionBadgeVariant = "default"
      } else if (criterionType === "minimize") {
        criterionDisplay = c.target !== undefined
          ? `Balance: Target ${Math.round(c.target * 100)}%`
          : "Balance Evenly"
        criterionBadgeVariant = "secondary"
      } else if (criterionType === "pull") {
        criterionDisplay = "Maximize"
        criterionBadgeVariant = "default"
      }
      
      return {
        key: c._id,
        name: c.name,
        description: c.description ?? "—",
        criterionType: c.criterionType,
        criterionDisplay,
        criterionBadgeVariant,
        remove: () => {
          deps.deleteCategory({ id: c._id as Id<"categories"> }).catch(console.error)
        },
        edit: () => {
          editingCategory$.value = EffectOption.some(c)
          categoryDialogOpen$.value = true
        }
      }
    })
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
      edit: async () => {
        // Fetch full template with questions for editing
        const fullTemplate = await deps.getTemplateWithQuestions({ id: t._id as Id<"questionTemplates"> })
        if (fullTemplate) {
          editingTemplate$.value = EffectOption.some(fullTemplate)
          templateDialogOpen$.value = true
        }
      }
    }))
  )

  // Computed: questions available for template form
  const availableQuestions$ = computed((): readonly QuestionOption[] =>
    (deps.questions$.value ?? []).map((q): QuestionOption => ({
      id: q._id,
      questionText: q.question,
      kindDisplay: q.kind === "boolean" ? "Yes/No" : "0-6",
      kindVariant: q.kind === "boolean" ? "secondary" : "outline",
    }))
  )

  // Question dialog
  const questionDialog: DialogVM = {
    isOpen$: questionDialogOpen$,
    open: () => {
      editingQuestion$.value = EffectOption.none()
      questionDialogOpen$.value = true
    },
    close: () => {
      questionDialogOpen$.value = false
      editingQuestion$.value = EffectOption.none()
    },
  }

  // Template dialog
  const templateDialog: DialogVM = {
    isOpen$: templateDialogOpen$,
    open: () => {
      editingTemplate$.value = EffectOption.none()
      templateDialogOpen$.value = true
    },
    close: () => {
      templateDialogOpen$.value = false
      editingTemplate$.value = EffectOption.none()
    },
  }

  // Category dialog
  const categoryDialog: DialogVM = {
    isOpen$: categoryDialogOpen$,
    open: () => {
      editingCategory$.value = EffectOption.none()
      categoryDialogOpen$.value = true
    },
    close: () => {
      categoryDialogOpen$.value = false
      editingCategory$.value = EffectOption.none()
    },
  }

  // Form submission handlers
  const onQuestionSubmit = (values: QuestionFormValues): void => {
    EffectOption.match(editingQuestion$.value, {
      onNone: () => {
        deps.createQuestion({
          question: values.question,
          kind: values.kind,
          category: values.category,
          semesterId: "default",
        })
          .then(() => {
            questionDialog.close()
          })
          .catch(console.error)
      },
      onSome: (editingQuestion) => {
        deps.updateQuestion({
          id: editingQuestion._id as Id<"questions">,
          question: values.question,
          kind: values.kind,
          category: values.category || undefined
        })
          .then(() => {
            questionDialog.close()
          })
          .catch(console.error)
      }
    })
  }

  const onTemplateSubmit = (values: TemplateFormValues): void => {
    EffectOption.match(editingTemplate$.value, {
      onNone: () => {
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
      },
      onSome: (editingTemplate) => {
        deps.updateTemplate({
          id: editingTemplate._id as Id<"questionTemplates">,
          title: values.title,
          description: values.description || undefined
        })
          .then(() => {
            return deps.reorderTemplateQuestions({
              templateId: editingTemplate._id as Id<"questionTemplates">,
              questionIds: values.questionIds.map(id => id as Id<"questions">)
            })
          })
          .then(() => {
            templateDialog.close()
          })
          .catch(console.error)
      }
    })
  }

  const onCategorySubmit = (values: CategoryFormValues): void => {
    EffectOption.match(editingCategory$.value, {
      onNone: () => {
        deps.createCategory({
          name: values.name,
          description: values.description || undefined,
          semesterId: "default",
          criterionType: values.criterionType ?? undefined,
          minRatio: values.minRatio,
          target: values.target,
        })
          .then(() => {
            categoryDialog.close()
          })
          .catch(console.error)
      },
      onSome: (editingCategory) => {
        deps.updateCategory({
          id: editingCategory._id as Id<"categories">,
          name: values.name,
          description: values.description || undefined,
          criterionType: values.criterionType ?? undefined,
          minRatio: values.minRatio,
          target: values.target,
        })
          .then(() => {
            categoryDialog.close()
          })
          .catch(console.error)
      }
    })
  }


  return {
    questions$,
    templates$,
    categories$,
    editingQuestion$,
    editingTemplate$,
    editingCategory$,
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
