import { signal, computed, ReadonlySignal, batch } from "@preact/signals-react"
import type { Id } from "@/convex/_generated/dataModel"
import type { TopicFormValues } from "@/components/forms/topic-form"
import type { ConstraintFormValues } from "@/components/forms/constraint-form"
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

export interface ConstraintItemVM {
  readonly key: string
  readonly name: string
  readonly description: string
  readonly criterionType?: "prerequisite" | "minimize" | "maximize" | "pull" | "push" | null
  readonly criterionDisplay: string
  readonly criterionBadgeVariant: "default" | "secondary" | "outline"
  readonly edit: () => void
  readonly remove: () => void
}

export interface Constraint {
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
  }>>
}

export interface TopicsViewVM {
  readonly topics$: ReadonlySignal<readonly TopicItemVM[]>
  readonly constraintOptions$: ReadonlySignal<readonly ConstraintOptionVM[]>
  readonly topicConstraints$: ReadonlySignal<readonly ConstraintItemVM[]>
  readonly editingConstraint$: ReadonlySignal<Option.Option<Constraint>>
  readonly createTopicDialog: DialogVM
  readonly editTopicDialog: EditTopicDialogVM
  readonly constraintDialog: DialogVM
  readonly onTopicSubmit: (values: TopicFormValues) => Promise<void>
  readonly onEditTopicSubmit: (values: TopicFormValues) => void
  readonly onConstraintSubmit: (values: ConstraintFormValues) => void
}

// ============================================================================
// Dependencies - data passed in from outside
// ============================================================================

export interface TopicsViewVMDeps {
  readonly topics$: ReadonlySignal<readonly any[] | undefined>
  readonly constraints$: ReadonlySignal<readonly any[] | undefined>
  readonly createTopic: (args: {
    title: string
    description: string
    semesterId: string
    constraintIds?: string[]
    duplicateCount?: number
  }) => Promise<any>
  readonly updateTopic: (args: {
    id: Id<"topics">
    title: string
    description: string
  }) => Promise<any>
  readonly deleteTopic: (args: { id: Id<"topics"> }) => Promise<any>
  readonly createConstraint: (args: {
    name: string
    description?: string
    semesterId: string
    criterionType?: "prerequisite" | "minimize" | "maximize" | "pull" | "push"
    minStudents?: number
    maxStudents?: number
  }) => Promise<any>
  readonly updateConstraint: (args: {
    id: Id<"categories">
    name?: string
    description?: string
    criterionType?: "prerequisite" | "minimize" | "maximize" | "pull" | "push"
    minStudents?: number
    maxStudents?: number
  }) => Promise<any>
  readonly deleteConstraint: (args: { id: Id<"categories"> }) => Promise<any>
}

// ============================================================================
// Factory - creates VM from dependencies
// ============================================================================

export function createTopicsViewVM(deps: TopicsViewVMDeps): TopicsViewVM {
  const {
    topics$,
    constraints$,
    createTopic,
    updateTopic,
    deleteTopic,
    createConstraint,
    updateConstraint,
    deleteConstraint,
  } = deps

  // Signals created once
  const createTopicDialogOpen$ = signal(false)
  const editTopicDialogOpen$ = signal(false)
  const constraintDialogOpen$ = signal(false)
  const editingTopic$ = signal<Option.Option<{
    id: Id<"topics">
    title: string
    description: string
    semesterId: string
  }>>(Option.none())
  const editingConstraint$ = signal<Option.Option<Constraint>>(Option.none())

  // Action: open edit dialog with topic data
  const openEditDialog = (topicId: string) => {
    const fullTopic = topics$.value?.find(topic => topic._id === topicId)
    if (!fullTopic) return

    editingTopic$.value = Option.some({
      id: fullTopic._id,
      title: fullTopic.title,
      description: fullTopic.description,
      semesterId: fullTopic.semesterId
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
    const constraintsData = constraints$.value ?? []
    return constraintsData
      .filter((cat: any) => cat.criterionType === "maximize" || cat.criterionType === "pull" || cat.criterionType === "prerequisite")
      .map((cat: any): ConstraintOptionVM => ({
        value: cat._id,
        label: cat.name,
        id: cat._id,
      }))
  })

  // Helper function to map constraint to ConstraintItemVM
  const mapConstraintToVM = (c: Constraint): ConstraintItemVM => {
    const criterionType = c.criterionType
    let criterionDisplay = "None"
    let criterionBadgeVariant: "default" | "secondary" | "outline" = "outline"

    if (criterionType === "prerequisite") {
      criterionDisplay = c.minStudents !== undefined
        ? `Required Min: ${c.minStudents} students`
        : "Required Minimum"
      criterionBadgeVariant = "default"
    } else if (criterionType === "minimize") {
      criterionDisplay = "Balance Evenly"
      criterionBadgeVariant = "secondary"
    } else if (criterionType === "maximize" || criterionType === "pull") {
      criterionDisplay = c.maxStudents !== undefined
        ? `Maximum Limit: ${c.maxStudents} students`
        : "Maximum Limit"
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
        deleteConstraint({ id: c._id as Id<"categories"> }).catch(console.error)
      },
      edit: () => {
        editingConstraint$.value = Option.some(c)
        constraintDialogOpen$.value = true
      }
    }
  }

  // Computed: topic constraints (prerequisite, maximize/pull)
  const topicConstraints$ = computed((): readonly ConstraintItemVM[] =>
    (constraints$.value ?? [])
      .filter((c: any) => c.criterionType === "prerequisite" || c.criterionType === "maximize" || c.criterionType === "pull")
      .map(mapConstraintToVM)
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

  // Constraint dialog
  const constraintDialog: DialogVM = {
    isOpen$: constraintDialogOpen$,
    open: () => {
      editingConstraint$.value = Option.none()
      constraintDialogOpen$.value = true
    },
    close: () => {
      batch(() => {
        constraintDialogOpen$.value = false
        editingConstraint$.value = Option.none()
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
        constraintIds: values.constraintIds,
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
        })
          .then(() => {
            editTopicDialog.close()
          })
          .catch(console.error)
      }
    })
  }

  const onConstraintSubmit = (values: ConstraintFormValues): void => {
    Option.match(editingConstraint$.value, {
      onNone: () => {
        createConstraint({
          name: values.name,
          description: values.description || undefined,
          semesterId: "default",
          criterionType: values.criterionType ?? undefined,
          minStudents: values.minStudents,
          maxStudents: values.maxStudents,
        })
          .then(() => {
            constraintDialog.close()
          })
          .catch(console.error)
      },
      onSome: (editingCon) => {
        updateConstraint({
          id: editingCon._id as Id<"categories">,
          name: values.name,
          description: values.description || undefined,
          criterionType: values.criterionType ?? undefined,
          minStudents: values.minStudents,
          maxStudents: values.maxStudents,
        })
          .then(() => {
            constraintDialog.close()
          })
          .catch(console.error)
      }
    })
  }

  return {
    topics$: sortedTopics$,
    constraintOptions$,
    topicConstraints$,
    editingConstraint$,
    createTopicDialog,
    editTopicDialog,
    constraintDialog,
    onTopicSubmit,
    onEditTopicSubmit,
    onConstraintSubmit,
  }
}
