import { signal, computed, ReadonlySignal, batch } from "@preact/signals-react"
import type { Id } from "@/convex/_generated/dataModel"
import type { TopicFormValues } from "@/components/forms/topic-form"
import type { CategoryFormValues } from "@/components/forms/category-form"
import * as Option from "effect/Option"
import { toast } from "sonner"

// ============================================================================
// View Model Types
// ============================================================================

export interface TopicItemVM {
  readonly key: string
  readonly title: string
  readonly description: string
  readonly remove: () => void
  readonly edit: () => void
}

export interface ConstraintOptionVM {
  readonly value: string
  readonly label: string
  readonly id?: string
}

export interface CategoryItemVM {
  readonly key: string
  readonly name: string
  readonly description: string
  readonly criterionType?: "prerequisite" | "minimize" | "maximize" | "pull" | "push" | null
  readonly criterionDisplay: string
  readonly criterionBadgeVariant: "default" | "secondary" | "outline"
  readonly edit: () => void
  readonly remove: () => void
}

export interface Category {
  readonly _id: string
  readonly name: string
  readonly description?: string
  readonly criterionType?: "prerequisite" | "minimize" | "maximize" | "pull" | "push" | null
  readonly minStudents?: number
  readonly maxStudents?: number
  // Legacy fields from database (may still exist)
  readonly minRatio?: number
  readonly target?: number
}

export interface DialogVM {
  readonly isOpen$: ReadonlySignal<boolean>
  readonly open: () => void
  readonly close: () => void
}

export interface EditTopicDialogVM extends DialogVM {
  readonly editingTopic$: ReadonlySignal<Option.Option<{
    readonly id: Id<"topics">
    readonly title: string
    readonly description: string
    readonly semesterId: string
    readonly constraintIds?: Id<"categories">[]
  }>>
}

export interface TopicsViewVM {
  readonly topics$: ReadonlySignal<readonly TopicItemVM[]>
  readonly constraintOptions$: ReadonlySignal<readonly ConstraintOptionVM[]>
  readonly constraintCategories$: ReadonlySignal<readonly CategoryItemVM[]>
  readonly editingCategory$: ReadonlySignal<Option.Option<Category>>
  readonly createTopicDialog: DialogVM
  readonly editTopicDialog: EditTopicDialogVM
  readonly categoryDialog: DialogVM
  readonly onTopicSubmit: (values: TopicFormValues) => Promise<void>
  readonly onEditTopicSubmit: (values: TopicFormValues) => void
  readonly onCategorySubmit: (values: CategoryFormValues) => void
}

// ============================================================================
// Dependencies - data passed in from outside
// ============================================================================

export interface TopicsViewVMDeps {
  readonly topics$: ReadonlySignal<readonly any[] | undefined>
  readonly categories$: ReadonlySignal<readonly any[] | undefined>
  readonly createTopic: (args: {
    title: string
    description: string
    semesterId: string
    constraintIds?: Id<"categories">[]
    duplicateCount?: number
  }) => Promise<any>
  readonly updateTopic: (args: {
    id: Id<"topics">
    title: string
    description: string
    constraintIds?: Id<"categories">[]
  }) => Promise<any>
  readonly deleteTopic: (args: { id: Id<"topics"> }) => Promise<any>
  readonly createCategory: (args: {
    name: string
    description?: string
    semesterId: string
    criterionType?: "prerequisite" | "minimize" | "maximize" | "pull" | "push"
    minRatio?: number
    minStudents?: number
    maxStudents?: number
  }) => Promise<any>
  readonly updateCategory: (args: {
    id: Id<"categories">
    name?: string
    description?: string
    criterionType?: "prerequisite" | "minimize" | "maximize" | "pull" | "push"
    minRatio?: number
    minStudents?: number
    maxStudents?: number
  }) => Promise<any>
  readonly deleteCategory: (args: { id: Id<"categories"> }) => Promise<any>
}

// ============================================================================
// Factory - creates VM from dependencies
// ============================================================================

export function createTopicsViewVM(deps: TopicsViewVMDeps): TopicsViewVM {
  const {
    topics$,
    categories$,
    createTopic,
    updateTopic,
    deleteTopic,
    createCategory,
    updateCategory,
    deleteCategory,
  } = deps

  const normalizeCriterionValue = (value?: number): number | undefined => {
    if (value === undefined) return undefined
    const normalized = value / 6
    return Math.min(Math.max(normalized, 0), 1)
  }

  const toCategoryIds = (ids?: string[]): Id<"categories">[] | undefined =>
    ids?.map((id) => id as Id<"categories">)

  const formatCriterionValue = (value?: number): string | undefined => {
    if (value === undefined) return undefined
    return (value * 6).toFixed(1)
  }

  // Signals created once
  const createTopicDialogOpen$ = signal(false)
  const editTopicDialogOpen$ = signal(false)
  const categoryDialogOpen$ = signal(false)
  const editingTopic$ = signal<Option.Option<{
    id: Id<"topics">
    title: string
    description: string
    semesterId: string
    constraintIds?: Id<"categories">[]
  }>>(Option.none())
  const editingCategory$ = signal<Option.Option<Category>>(Option.none())

  // Action: open edit dialog with topic data
  const openEditDialog = (topicId: string) => {
    const fullTopic = topics$.value?.find(topic => topic._id === topicId)
    if (!fullTopic) return

    editingTopic$.value = Option.some({
      id: fullTopic._id,
      title: fullTopic.title,
      description: fullTopic.description,
      semesterId: fullTopic.semesterId,
      constraintIds: fullTopic.constraintIds ?? []
    })
    editTopicDialogOpen$.value = true
  }

  // Computed: topics list for table with edit handler
  const topicItems$ = computed((): readonly TopicItemVM[] =>
    (topics$.value ?? []).map((topic): TopicItemVM => ({
      key: topic._id,
      title: topic.title,
      description: topic.description,
      remove: () => {
        deleteTopic({ id: topic._id }).catch((error) => {
          console.error("Failed to delete topic:", error)
          toast.error(
            error instanceof Error && error.message.includes("student selections")
              ? "Cannot delete topic with existing student selections"
              : "Failed to delete topic. Please try again."
          )
        })
      },
      edit: () => {
        openEditDialog(topic._id)
      },
    }))
  )

  // Sort topics by title
  const sortedTopics$ = computed((): readonly TopicItemVM[] => {
    return [...topicItems$.value].sort((a, b) => a.title.localeCompare(b.title))
  })


  // Computed: constraint options for form (topic-specific: maximize/pull and prerequisite only)
  const constraintOptions$ = computed((): readonly ConstraintOptionVM[] => {
    const categories = categories$.value ?? []
    return categories
      .filter((cat: any) => cat.criterionType === "maximize" || cat.criterionType === "pull" || cat.criterionType === "prerequisite")
      .map((cat: any): ConstraintOptionVM => ({
        value: cat._id,
        label: cat.name,
        id: cat._id,
      }))
  })

  // Helper function to map category to CategoryItemVM
  const mapCategoryToVM = (c: Category): CategoryItemVM => {
    const criterionType = c.criterionType
    let criterionDisplay = "None"
    let criterionBadgeVariant: "default" | "secondary" | "outline" = "outline"

    if (criterionType === "prerequisite") {
      const minValue = formatCriterionValue(c.minRatio)
      const amount = c.minStudents !== undefined ? `, ${c.minStudents} students` : ""
      criterionDisplay = minValue !== undefined
        ? `Required Min: ${minValue} value${amount}`
        : "Required Minimum"
      criterionBadgeVariant = "default"
    } else if (criterionType === "minimize") {
      criterionDisplay = "Balance Evenly"
      criterionBadgeVariant = "secondary"
    } else if (criterionType === "maximize") {
      const maxValue = formatCriterionValue(c.minRatio)
      const amount = c.maxStudents !== undefined ? `, ${c.maxStudents} students` : ""
      criterionDisplay = maxValue !== undefined
        ? `Maximum Limit: ${maxValue} value${amount}`
        : "Maximum Limit"
      criterionBadgeVariant = "default"
    } else if (criterionType === "pull") {
      criterionDisplay = "Maximize Together"
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
        deleteCategory({ id: c._id as Id<"categories"> }).catch(console.error)
      },
      edit: () => {
        editingCategory$.value = Option.some(c)
        categoryDialogOpen$.value = true
      }
    }
  }

  // Computed: constraint categories (prerequisite, maximize/pull)
  const constraintCategories$ = computed((): readonly CategoryItemVM[] =>
    (categories$.value ?? [])
      .filter((c: any) => c.criterionType === "prerequisite" || c.criterionType === "maximize" || c.criterionType === "pull")
      .map(mapCategoryToVM)
  )

  // Create topic dialog
  const createTopicDialog: DialogVM = {
    isOpen$: createTopicDialogOpen$,
    open: () => {
      createTopicDialogOpen$.value = true
    },
    close: () => {
      createTopicDialogOpen$.value = false
    },
  }

  // Edit topic dialog
  const editTopicDialog: EditTopicDialogVM = {
    isOpen$: editTopicDialogOpen$,
    editingTopic$,
    open: () => {
      editTopicDialogOpen$.value = true
    },
    close: () => {
      batch(() => {
        editTopicDialogOpen$.value = false
        editingTopic$.value = Option.none()
      })
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
      batch(() => {
        categoryDialogOpen$.value = false
        editingCategory$.value = Option.none()
      })
    },
  }

  // Form submission handlers
  const onTopicSubmit = async (values: TopicFormValues): Promise<void> => {
    try {
      await createTopic({
        title: values.title,
        description: values.description,
        semesterId: "default", // Use default semesterId since we removed it from the form
        constraintIds: toCategoryIds(values.constraintIds),
        duplicateCount: values.duplicateCount,
      })
      createTopicDialog.close()
    } catch (error) {
      console.error("Failed to create topic:", error)
      throw error
    }
  }

  const onEditTopicSubmit = (values: TopicFormValues): void => {
    Option.match(editingTopic$.value, {
      onNone: () => { },
      onSome: (editing) => {
        updateTopic({
          id: editing.id,
          title: values.title,
          description: values.description,
          constraintIds: toCategoryIds(values.constraintIds),
        })
          .then(() => {
            editTopicDialog.close()
          })
          .catch(console.error)
      }
    })
  }

  const onCategorySubmit = (values: CategoryFormValues): void => {
    const minRatio = values.criterionType === "prerequisite"
      ? normalizeCriterionValue(values.minValue)
      : values.criterionType === "maximize"
        ? normalizeCriterionValue(values.maxValue)
        : undefined

    Option.match(editingCategory$.value, {
      onNone: () => {
        createCategory({
          name: values.name,
          description: values.description || undefined,
          semesterId: "default",
          criterionType: values.criterionType ?? undefined,
          minRatio,
          minStudents: values.minStudents,
          maxStudents: values.maxStudents,
        })
          .then(() => {
            categoryDialog.close()
          })
          .catch(console.error)
      },
      onSome: (editingCat) => {
        updateCategory({
          id: editingCat._id as Id<"categories">,
          name: values.name,
          description: values.description || undefined,
          criterionType: values.criterionType ?? undefined,
          minRatio,
          minStudents: values.minStudents,
          maxStudents: values.maxStudents,
        })
          .then(() => {
            categoryDialog.close()
          })
          .catch(console.error)
      }
    })
  }

  return {
    topics$: sortedTopics$,
    constraintOptions$,
    constraintCategories$,
    editingCategory$,
    createTopicDialog,
    editTopicDialog,
    categoryDialog,
    onTopicSubmit,
    onEditTopicSubmit,
    onCategorySubmit,
  }
}
