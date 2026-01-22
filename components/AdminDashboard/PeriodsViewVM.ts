import { signal, computed, ReadonlySignal, batch, Signal } from "@preact/signals-react"
import type { Id } from "@/convex/_generated/dataModel"
import type { SelectionPeriodFormValues, TopicOption, CategoryOption } from "@/components/forms/selection-period-form"
import type { QuestionFormValues } from "@/components/forms/question-form"
import type { CategoryFormValues } from "@/components/forms/category-form"
import * as SelectionPeriod from "@/convex/schemas/SelectionPeriod"
import type { SelectionPeriodWithStats, Assignment } from "./index"
import { format } from "date-fns"
import * as Option from "effect/Option"

// ============================================================================
// View Model Types
// ============================================================================

/**
 * Dialog View Model for managing open/close state
 */
export interface DialogVM {
  readonly isOpen$: ReadonlySignal<boolean>
  readonly open: () => void
  readonly close: () => void
}

/**
 * Dialog View Model with editing period state
 */
export interface EditDialogVM extends DialogVM {
  readonly editingPeriod$: ReadonlySignal<Option.Option<SelectionPeriodWithStats>>
  readonly openWithPeriod: (period: SelectionPeriodWithStats) => void
}

/**
 * View Model for a single period row in the table
 */
export interface PeriodRowVM {
  readonly key: string
  readonly title: string
  readonly statusDisplay: string
  readonly statusColor: string
  readonly openDateDisplay: string
  readonly closeDateDisplay: string
  readonly studentCountDisplay: string
  readonly needsNames: boolean // Whether this period needs student names
  readonly readyForAssignment: boolean // Whether all questionnaires are complete
  readonly shareableSlug: string
  readonly shareableLink: string // Full URL for student join page
  readonly onEdit: () => void
  readonly onDelete: () => void
}

/**
 * View Model for assignment row in the results table
 */
export interface AssignmentRowVM {
  readonly key: string
  readonly studentId: string
  readonly name?: string // Optional name (GDPR: only if provided by teacher)
  readonly topicTitle: string
  readonly preferenceRank: number
  readonly isMatched: boolean
  readonly statusDisplay: string
  readonly rankBadgeVariant: "default" | "secondary"
}

/**
 * View Model for a question item in the collapsible section
 */
export interface QuestionItemVM {
  readonly key: string
  readonly questionText: string
  readonly kindDisplay: string
  readonly kindVariant: "secondary" | "outline"
  readonly category?: string
  readonly edit: () => void
  readonly remove: () => void
}

/**
 * View Model for a category item (minimize categories for balanced distribution)
 */
export interface CategoryItemVM {
  readonly key: string
  readonly name: string
  readonly description: string
  readonly criterionType?: "prerequisite" | "minimize" | "pull" | null
  readonly criterionDisplay: string
  readonly criterionBadgeVariant: "default" | "secondary" | "outline"
  readonly minRatio?: number
  readonly target?: number
  readonly edit: () => void
  readonly remove: () => void
}

/**
 * Question data structure from Convex
 */
export interface Question {
  readonly _id: string
  readonly question: string
  readonly kind: "boolean" | "0to6"
  readonly category?: string
}

/**
 * Category data structure from Convex
 */
export interface Category {
  readonly _id: string
  readonly name: string
  readonly description?: string
  readonly criterionType?: "prerequisite" | "minimize" | "pull" | null
  readonly minRatio?: number
  readonly target?: number
}

/**
 * Main PeriodsView View Model
 */
export interface PeriodsViewVM {
  /** Current active/assigned period with stats */
  readonly currentPeriod$: ReadonlySignal<Option.Option<SelectionPeriodWithStats>>

  /** Assignment data for table */
  readonly assignments$: ReadonlySignal<readonly AssignmentRowVM[]>

  /** Whether to show assignment results section */
  readonly showAssignmentResults$: ReadonlySignal<boolean>

  /** All periods for the table */
  readonly periods$: ReadonlySignal<readonly PeriodRowVM[]>

  /** Raw periods data (for accessing full period documents) */
  readonly periodsData$: ReadonlySignal<readonly SelectionPeriodWithStats[] | undefined>

  /** Create dialog state */
  readonly createDialog: DialogVM

  /** Edit dialog state with editing period */
  readonly editDialog: EditDialogVM

  /** Available topics for form */
  readonly topics$: ReadonlySignal<readonly TopicOption[]>

  /** Topics already linked to editing period */
  readonly existingTopicIds$: ReadonlySignal<readonly string[]>

  /** Balance distribution categories (minimize only) */
  readonly categories$: ReadonlySignal<readonly CategoryOption[]>

  /** Existing minimize category IDs for editing period */
  readonly existingMinimizeCategoryIds$: ReadonlySignal<readonly string[]>

  /** ID and title of newly created period (for showing access codes) */
  readonly createdPeriod$: ReadonlySignal<Option.Option<{
    id: Id<"selectionPeriods">
    title: string
    shareableSlug: string
  }>>

  /** Handle create period submission */
  readonly onCreateSubmit: (values: SelectionPeriodFormValues) => void

  /** Handle edit period submission */
  readonly onEditSubmit: (values: SelectionPeriodFormValues) => void

  /** Finish creation flow and close dialog */
  readonly finishCreation: () => void

  /** Copy shareable link to clipboard */
  readonly copyShareableLink: (slug: string) => void

  /** Exposed mutations for manual question sync */
  readonly updatePeriod: PeriodsViewVMDeps["updatePeriod"]
  readonly addQuestion: PeriodsViewVMDeps["addQuestion"]
  readonly removeQuestion: PeriodsViewVMDeps["removeQuestion"]

  // ============================================================================
  // Question & Category Management (collapsible sections)
  // ============================================================================

  /** All questions for the questions section */
  readonly questions$: ReadonlySignal<readonly QuestionItemVM[]>

  /** Minimize categories for balanced distribution section */
  readonly minimizeCategories$: ReadonlySignal<readonly CategoryItemVM[]>

  /** Existing category names for question form dropdown */
  readonly existingCategoryNames$: ReadonlySignal<readonly string[]>

  /** Question dialog state */
  readonly questionDialog: DialogVM

  /** Category dialog state (for minimize categories) */
  readonly categoryDialog: DialogVM

  /** Currently editing question (None = creating new) */
  readonly editingQuestion$: ReadonlySignal<Option.Option<Question>>

  /** Currently editing category (None = creating new) */
  readonly editingCategory$: ReadonlySignal<Option.Option<Category>>

  /** Question form submission handler */
  readonly onQuestionSubmit: (values: QuestionFormValues) => void

  /** Category form submission handler */
  readonly onCategorySubmit: (values: CategoryFormValues) => void
}

// ============================================================================
// Factory Dependencies
// ============================================================================

export interface PeriodsViewVMDeps {
  /** Signal of periods data from Convex */
  readonly periodsData$: ReadonlySignal<readonly SelectionPeriodWithStats[] | undefined>

  /** Signal of current period data from Convex */
  readonly currentPeriodData$: ReadonlySignal<SelectionPeriodWithStats | null | undefined>

  /** Signal of assignments data from Convex */
  readonly assignmentsData$: ReadonlySignal<readonly Assignment[] | undefined>

  /** Signal of topics data from Convex */
  readonly topicsData$: ReadonlySignal<readonly any[] | undefined>

  /** Signal of existing topics for editing period (filtered by semester) */
  readonly existingTopicsData$: ReadonlySignal<readonly any[] | undefined>

  /** Signal of categories data from Convex */
  readonly categoriesData$: ReadonlySignal<readonly any[] | undefined>

  /** Mutation to create a period */
  readonly createPeriod: (args: {
    title: string
    description: string
    semesterId: string
    openDate: number
    closeDate: number
    minimizeCategoryIds?: Id<"categories">[]
    rankingsEnabled?: boolean
    topicIds?: Id<"topics">[]
  }) => Promise<{ periodId: Id<"selectionPeriods"> }>

  /** Mutation to update a period */
  readonly updatePeriod: (args: {
    periodId: Id<"selectionPeriods">
    title?: string
    description?: string
    openDate?: number
    closeDate?: number
    minimizeCategoryIds?: Id<"categories">[]
    rankingsEnabled?: boolean
  }) => Promise<any>

  /** Mutation to delete a period */
  readonly deletePeriod: (args: { periodId: Id<"selectionPeriods"> }) => Promise<any>


  /** Mutation to add question to period */
  readonly addQuestion: (args: {
    selectionPeriodId: Id<"selectionPeriods">
    questionId: Id<"questions">
  }) => Promise<any>

  /** Mutation to remove question from period */
  readonly removeQuestion: (args: {
    selectionPeriodId: Id<"selectionPeriods">
    questionId: Id<"questions">
  }) => Promise<any>

  // ============================================================================
  // Question & Category Management Dependencies
  // ============================================================================

  /** Signal of questions data from Convex */
  readonly questionsData$: ReadonlySignal<readonly Question[] | undefined>

  /** Signal of category names from Convex (for question form dropdown) */
  readonly categoryNamesData$: ReadonlySignal<readonly string[] | undefined>

  /** Mutation to create a question */
  readonly createQuestion: (args: {
    question: string
    kind: "boolean" | "0to6"
    category?: string
    semesterId: string
  }) => Promise<any>

  /** Mutation to update a question */
  readonly updateQuestion: (args: {
    id: Id<"questions">
    question?: string
    kind?: "boolean" | "0to6"
    category?: string
  }) => Promise<any>

  /** Mutation to delete a question */
  readonly deleteQuestion: (args: { id: Id<"questions"> }) => Promise<any>

  /** Mutation to create a category */
  readonly createCategory: (args: {
    name: string
    description?: string
    semesterId: string
    criterionType?: "prerequisite" | "minimize" | "pull" | null
    minRatio?: number
    target?: number
  }) => Promise<any>

  /** Mutation to update a category */
  readonly updateCategory: (args: {
    id: Id<"categories">
    name?: string
    description?: string
    criterionType?: "prerequisite" | "minimize" | "pull" | null
    minRatio?: number
    target?: number
  }) => Promise<any>

  /** Mutation to delete a category */
  readonly deleteCategory: (args: { id: Id<"categories"> }) => Promise<any>
}

// ============================================================================
// Factory Function - creates VM with stable signals
// ============================================================================

export function createPeriodsViewVM(deps: PeriodsViewVMDeps): PeriodsViewVM {
  // Dialog state - signals created ONCE when factory is called
  const createDialogOpen$ = signal(false)
  const editDialogOpen$ = signal(false)
  const editingPeriod$ = signal<Option.Option<SelectionPeriodWithStats>>(Option.none())
  const createdPeriod$ = signal<Option.Option<{
    id: Id<"selectionPeriods">
    title: string
    shareableSlug: string
  }>>(Option.none())

  // Computed: current period (may be open or assigned)
  const currentPeriod$ = computed((): Option.Option<SelectionPeriodWithStats> => {
    const periodOption = Option.fromNullable(deps.currentPeriodData$.value)
    return Option.map(periodOption, (period) => {
      // Add stats to the current period
      const assignments = deps.assignmentsData$.value ?? []
      return {
        ...period,
        studentCount: assignments.length,
        assignmentCount: assignments.length,
      }
    })
  })

  // Computed: assignments for table
  const assignments$ = computed((): readonly AssignmentRowVM[] => {
    const assignmentsData = deps.assignmentsData$.value
    if (!assignmentsData) return []

    return assignmentsData.map((assignment, idx): AssignmentRowVM => ({
      key: `${assignment.studentId}-${assignment.topicTitle}-${idx}`,
      studentId: assignment.studentId,
      name: (assignment as any).name, // Include name if available
      topicTitle: assignment.topicTitle,
      preferenceRank: assignment.preferenceRank,
      isMatched: assignment.isMatched,
      statusDisplay: assignment.status,
      rankBadgeVariant: assignment.preferenceRank === 1 ? "default" : "secondary",
    }))
  })

  // Computed: whether to show assignment results
  const showAssignmentResults$ = computed((): boolean => {
    return Option.match(currentPeriod$.value, {
      onNone: () => false,
      onSome: (current) => {
        if (!SelectionPeriod.isAssigned(current)) return false
        const assignments = assignments$.value
        return assignments.length > 0
      }
    })
  })

  // Computed: periods for table
  const periods$ = computed((): readonly PeriodRowVM[] => {
    const periodsData = deps.periodsData$.value
    if (!periodsData) return []

    return periodsData.map((period: any): PeriodRowVM => {
      const statusDisplay = SelectionPeriod.match(period)({
        open: () => "Open",
        inactive: () => "Inactive",
        closed: () => "Closed",
        assigned: () => "Assigned",
      })

      const statusColor = SelectionPeriod.match(period)({
        open: () => "bg-green-600 text-white",
        inactive: () => "bg-blue-600 text-white",
        closed: () => "bg-red-600 text-white",
        assigned: () => "bg-purple-600 text-white",
      })

      return {
        key: period._id,
        title: period.title,
        statusDisplay,
        statusColor,
        openDateDisplay: format(period.openDate, "MMM d, yyyy"),
        closeDateDisplay: format(period.closeDate, "MMM d, yyyy"),
        studentCountDisplay: String(period.studentCount || 0),
        needsNames: false, // Will be set by component-level query
        readyForAssignment: false, // Will be set by component-level query
        shareableSlug: period.shareableSlug,
        shareableLink: `${typeof window !== 'undefined' ? window.location.origin : ''}/student/join/${period.shareableSlug}`,
        onEdit: () => {
          batch(() => {
            editingPeriod$.value = Option.some(period)
            editDialogOpen$.value = true
          })
        },
        onDelete: () => {
          if (period._id) {
            deps.deletePeriod({ periodId: period._id }).catch(console.error)
          }
        },
      }
    })
  })

  // Computed: topics for form (filtered by editing period's semester if editing)
  const topics$ = computed((): readonly TopicOption[] => {
    const topicsData = deps.topicsData$.value ?? []
    const editingPeriod = editingPeriod$.value
    
    // If editing, filter topics by the period's semester
    if (Option.isSome(editingPeriod)) {
      const semesterId = editingPeriod.value.semesterId
      return topicsData
        .filter((t: any) => t.semesterId === semesterId)
        .map((t: any): TopicOption => ({
          id: t._id,
          title: t.title,
          description: t.description,
        }))
    }
    
    // If creating, show all topics (will be filtered by selected semester in form)
    return topicsData.map((t: any): TopicOption => ({
      id: t._id,
      title: t.title,
      description: t.description,
    }))
  })

  // Computed: existing topic IDs for editing period (all topics in the semester)
  const existingTopicIds$ = computed((): readonly string[] => {
    const editingPeriod = editingPeriod$.value
    if (Option.isNone(editingPeriod)) return []
    
    const semesterId = editingPeriod.value.semesterId
    const topicsData = deps.topicsData$.value ?? []
    // Return all topic IDs for this semester (since topics are linked to semesters)
    return topicsData
      .filter((t: any) => t.semesterId === semesterId)
      .map((t: any) => t._id)
  })

  // Computed: balance distribution categories (minimize only) for form
  const categories$ = computed((): readonly CategoryOption[] => {
    const categoriesData = deps.categoriesData$.value ?? []
    return categoriesData
      .filter((cat: any) => cat.criterionType === "minimize")
      .map((cat: any): CategoryOption => ({
        id: cat._id,
        name: cat.name,
        description: cat.description,
      }))
  })

  // Computed: existing minimize category IDs for editing period
  const existingMinimizeCategoryIds$ = computed((): readonly string[] => {
    const editingPeriod = editingPeriod$.value
    if (Option.isNone(editingPeriod)) return []
    
    const categoryIds = editingPeriod.value.minimizeCategoryIds ?? []
    return categoryIds.map(id => id as string)
  })

  // Create dialog
  const createDialog: DialogVM = {
    isOpen$: createDialogOpen$,
    open: () => {
      batch(() => {
        createDialogOpen$.value = true
        createdPeriod$.value = Option.none()
      })
    },
    close: () => {
      batch(() => {
        createDialogOpen$.value = false
        createdPeriod$.value = Option.none()
      })
    },
  }

  // Finish creation flow
  const finishCreation = (): void => {
    createDialog.close()
  }

  // Copy shareable link to clipboard
  const copyShareableLink = (slug: string): void => {
    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/student/join/${slug}`
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(link).catch(console.error)
    }
  }

  // Edit dialog
  const editDialog: EditDialogVM = {
    isOpen$: editDialogOpen$,
    editingPeriod$,
    open: () => {
      editDialogOpen$.value = true
    },
    close: () => {
      batch(() => {
        editDialogOpen$.value = false
        editingPeriod$.value = Option.none()
      })
    },
    openWithPeriod: (period: SelectionPeriodWithStats) => {
      batch(() => {
        editingPeriod$.value = Option.some(period)
        editDialogOpen$.value = true
      })
    },
  }

  // Form submission handlers
  const onCreateSubmit = (values: SelectionPeriodFormValues): void => {
    const periodTitle = values.title

    deps.createPeriod({
      title: values.title,
      description: values.title,
      semesterId: values.selection_period_id,
      openDate: values.start_deadline.getTime(),
      closeDate: values.end_deadline.getTime(),
      minimizeCategoryIds: values.minimizeCategoryIds?.map(id => id as Id<"categories">),
      rankingsEnabled: values.rankingsEnabled,
      // Pass selected topic IDs to update their semesterId, linking them to this period
      topicIds: values.topicIds?.map(id => id as Id<"topics">),
    })
      .then((result) => {
        const createdPeriodId = result.periodId
        const shareableSlug = (result as any).shareableSlug ?? ""
        // Show access codes panel instead of closing
        createdPeriod$.value = Option.some({
          id: createdPeriodId,
          title: periodTitle,
          shareableSlug,
        })
      })
      .catch((error) => {
        console.error("Failed to create period:", error)
        // Optionally show error toast here
      })
  }

  const onEditSubmit = (values: SelectionPeriodFormValues): void => {
    Option.match(editingPeriod$.value, {
      onNone: () => { },
      onSome: (editingPeriodValue) => {
        if (!editingPeriodValue._id) return

        deps.updatePeriod({
          periodId: editingPeriodValue._id,
          title: values.title,
          description: values.title,
          openDate: values.start_deadline.getTime(),
          closeDate: values.end_deadline.getTime(),
          minimizeCategoryIds: values.minimizeCategoryIds?.map(id => id as Id<"categories">),
          rankingsEnabled: values.rankingsEnabled,
        })
          .then(() => {
            editDialog.close()
          })
          .catch(console.error)
      }
    })
  }

  // ============================================================================
  // Question & Category Management
  // ============================================================================

  // Dialog state for questions
  const questionDialogOpen$ = signal(false)
  const editingQuestion$ = signal<Option.Option<Question>>(Option.none())

  // Dialog state for categories
  const categoryDialogOpen$ = signal(false)
  const editingCategory$ = signal<Option.Option<Category>>(Option.none())

  // Computed: questions list for table
  const questions$ = computed((): readonly QuestionItemVM[] =>
    (deps.questionsData$?.value ?? []).map((q): QuestionItemVM => ({
      key: q._id,
      questionText: q.question,
      kindDisplay: q.kind === "boolean" ? "Yes/No" : "0-6",
      kindVariant: q.kind === "boolean" ? "secondary" : "outline",
      category: q.category,
      remove: () => {
        deps.deleteQuestion({ id: q._id as Id<"questions"> }).catch(console.error)
      },
      edit: () => {
        editingQuestion$.value = Option.some(q)
        questionDialogOpen$.value = true
      }
    }))
  )

  // Helper function to map category to CategoryItemVM
  const mapCategoryToVM = (c: Category): CategoryItemVM => {
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
      description: c.description ?? "",
      criterionType: c.criterionType,
      criterionDisplay,
      criterionBadgeVariant,
      minRatio: c.minRatio,
      target: c.target,
      remove: () => {
        deps.deleteCategory({ id: c._id as Id<"categories"> }).catch(console.error)
      },
      edit: () => {
        editingCategory$.value = Option.some(c)
        categoryDialogOpen$.value = true
      }
    }
  }

  // Computed: minimize categories for balanced distribution section
  const minimizeCategories$ = computed((): readonly CategoryItemVM[] =>
    (deps.categoriesData$.value ?? [])
      .filter((c: Category) => c.criterionType === "minimize")
      .map(mapCategoryToVM)
  )

  // Computed: existing category names (for question form dropdown)
  const existingCategoryNames$ = computed(() => deps.categoryNamesData$?.value ?? [])

  // Question dialog
  const questionDialog: DialogVM = {
    isOpen$: questionDialogOpen$,
    open: () => {
      editingQuestion$.value = Option.none()
      questionDialogOpen$.value = true
    },
    close: () => {
      questionDialogOpen$.value = false
      editingQuestion$.value = Option.none()
    },
  }

  // Category dialog
  const categoryDialog: DialogVM = {
    isOpen$: categoryDialogOpen$,
    open: () => {
      editingCategory$.value = Option.none()
      categoryDialogOpen$.value = true
    },
    close: () => {
      categoryDialogOpen$.value = false
      editingCategory$.value = Option.none()
    },
  }

  // Form submission handlers
  const onQuestionSubmit = (values: QuestionFormValues): void => {
    Option.match(editingQuestion$.value, {
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
      onSome: (editingQuestionValue) => {
        deps.updateQuestion({
          id: editingQuestionValue._id as Id<"questions">,
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

  const onCategorySubmit = (values: CategoryFormValues): void => {
    Option.match(editingCategory$.value, {
      onNone: () => {
        deps.createCategory({
          name: values.name,
          description: values.description || undefined,
          semesterId: "default",
          criterionType: "minimize", // Always minimize for this section
        })
          .then(() => {
            categoryDialog.close()
          })
          .catch(console.error)
      },
      onSome: (editingCategoryValue) => {
        deps.updateCategory({
          id: editingCategoryValue._id as Id<"categories">,
          name: values.name,
          description: values.description || undefined,
          criterionType: "minimize", // Always minimize for this section
        })
          .then(() => {
            categoryDialog.close()
          })
          .catch(console.error)
      }
    })
  }

  return {
    currentPeriod$,
    assignments$,
    showAssignmentResults$,
    periods$,
    periodsData$: deps.periodsData$,
    createDialog,
    editDialog,
    topics$,
    existingTopicIds$,
    categories$,
    existingMinimizeCategoryIds$,
    createdPeriod$,
    onCreateSubmit,
    onEditSubmit,
    finishCreation,
    copyShareableLink,
    updatePeriod: deps.updatePeriod,
    addQuestion: deps.addQuestion,
    removeQuestion: deps.removeQuestion,

    // Question & Category Management
    questions$,
    minimizeCategories$,
    existingCategoryNames$,
    questionDialog,
    categoryDialog,
    editingQuestion$,
    editingCategory$,
    onQuestionSubmit,
    onCategorySubmit,
  }
}

// ============================================================================
// Temporary Compatibility Hook (DEPRECATED - will be removed)
// ============================================================================
// This hook is provided for backward compatibility while parent components
// are being migrated to the factory pattern. Once DashboardVM is refactored
// to use the factory pattern and compose this VM, this hook should be removed.
// DO NOT use this in new code - use createPeriodsViewVM() instead.

import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

/**
 * @deprecated Use createPeriodsViewVM() factory function instead.
 * This hook exists only for backward compatibility during migration.
 */
export function usePeriodsViewVM(): PeriodsViewVM {
  // Fetch data from Convex
  const periodsData = useQuery(api.selectionPeriods.getAllPeriodsWithStats, {})
  const currentPeriodData = useQuery(api.admin.getCurrentPeriod, {})
  const assignmentsData = useQuery(
    api.assignments.getAllAssignmentsForExport,
    currentPeriodData?._id ? { periodId: currentPeriodData._id } : "skip"
  )
  const questionsData = useQuery(api.questions.getAllQuestions, {})
  const templatesData = useQuery(api.questionTemplates.getAllTemplatesWithQuestionIds, {})
  const categoriesData = useQuery(api.categories.getAllCategories, {})
  const categoryNamesData = useQuery(api.categories.getCategoryNames, {})

  // We need to create a signal for editingPeriod to track which period is being edited
  // so we can fetch its questions
  const editingPeriodSignal = React.useMemo(() => signal<Option.Option<SelectionPeriodWithStats>>(Option.none()), [])

  const existingQuestionsData = useQuery(
    api.selectionQuestions.getQuestionsForPeriod,
    Option.match(editingPeriodSignal.value, {
      onNone: () => "skip" as const,
      onSome: (period) => ({ selectionPeriodId: period._id })
    })
  )

  // Get mutations
  const createPeriodMutation = useMutation(api.selectionPeriods.createPeriod)
  const updatePeriodMutation = useMutation(api.selectionPeriods.updatePeriod)
  const deletePeriodMutation = useMutation(api.selectionPeriods.deletePeriod)
  const setActivePeriodMutation = useMutation(api.selectionPeriods.setActivePeriod)
  const addQuestionMutation = useMutation(api.selectionQuestions.addQuestion)
  const removeQuestionMutation = useMutation(api.selectionQuestions.removeQuestion)
  const createQuestionMutation = useMutation(api.questions.createQuestion)
  const updateQuestionMutation = useMutation(api.questions.updateQuestion)
  const deleteQuestionMutation = useMutation(api.questions.deleteQuestion)
  const createCategoryMutation = useMutation(api.categories.createCategory)
  const updateCategoryMutation = useMutation(api.categories.updateCategory)
  const deleteCategoryMutation = useMutation(api.categories.deleteCategory)

  // Wrap data in signals for the factory
  const deps = React.useMemo(() => {
    const periodsData$ = computed(() => periodsData)
    const currentPeriodData$ = computed(() => currentPeriodData)
    const assignmentsData$ = computed(() => {
      if (!assignmentsData) return undefined
      return assignmentsData.map((a): Assignment => ({
        studentId: a.student_id,
        topicTitle: a.assigned_topic,
        preferenceRank: 0,
        isMatched: false,
        status: "assigned"
      }))
    })
    const questionsData$ = computed(() => questionsData as any)
    const templatesData$ = computed(() => templatesData)
    const existingQuestionsData$ = computed(() => existingQuestionsData)
    const topicsData$ = computed(() => [])
    const existingTopicsData$ = computed(() => [])
    const categoriesData$ = computed(() => categoriesData as any)
    const categoryNamesData$ = computed(() => categoryNamesData)

    return {
      periodsData$,
      currentPeriodData$,
      assignmentsData$,
      questionsData$,
      templatesData$,
      existingQuestionsData$,
      topicsData$,
      existingTopicsData$,
      categoriesData$,
      createPeriod: createPeriodMutation,
      updatePeriod: updatePeriodMutation,
      deletePeriod: deletePeriodMutation,
      setActivePeriod: setActivePeriodMutation,
      addQuestion: addQuestionMutation,
      removeQuestion: removeQuestionMutation,
      // Question & Category Management
      categoryNamesData$,
      createQuestion: createQuestionMutation as any,
      updateQuestion: updateQuestionMutation,
      deleteQuestion: deleteQuestionMutation,
      createCategory: createCategoryMutation as any,
      updateCategory: updateCategoryMutation as any,
      deleteCategory: deleteCategoryMutation,
    }
  }, [
    periodsData,
    currentPeriodData,
    assignmentsData,
    questionsData,
    templatesData,
    existingQuestionsData,
    categoriesData,
    categoryNamesData,
    createPeriodMutation,
    updatePeriodMutation,
    deletePeriodMutation,
    setActivePeriodMutation,
    addQuestionMutation,
    removeQuestionMutation,
    createQuestionMutation,
    updateQuestionMutation,
    deleteQuestionMutation,
    createCategoryMutation,
    updateCategoryMutation,
    deleteCategoryMutation,
  ])

  // Create the VM once
  const vm = React.useMemo(() => createPeriodsViewVM(deps), [deps])

  // Wire up the editing period signal to track changes
  React.useEffect(() => {
    editingPeriodSignal.value = vm.editDialog.editingPeriod$.value
  }, [vm.editDialog.editingPeriod$.value])

  return vm
}
