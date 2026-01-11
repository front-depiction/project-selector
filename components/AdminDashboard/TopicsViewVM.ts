import { signal, computed, ReadonlySignal, batch } from "@preact/signals-react"
import type { Id } from "@/convex/_generated/dataModel"
import type { TopicFormValues } from "@/components/forms/topic-form"
import * as Option from "effect/Option"

// ============================================================================
// View Model Types
// ============================================================================

export interface TopicItemVM {
  readonly key: string
  readonly title: string
  readonly description: string
  readonly statusDisplay: string
  readonly statusVariant: "default" | "secondary"
  readonly selectionsCount: number
  readonly toggleActive: () => void
  readonly remove: () => void
  readonly edit: () => void
}

export interface PeriodOptionVM {
  readonly value: string
  readonly label: string
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
  readonly periodOptions$: ReadonlySignal<readonly PeriodOptionVM[]>
  readonly createTopicDialog: DialogVM
  readonly editTopicDialog: EditTopicDialogVM
  readonly onTopicSubmit: (values: TopicFormValues) => Promise<void>
  readonly onEditTopicSubmit: (values: TopicFormValues) => void
}

// ============================================================================
// Dependencies - data passed in from outside
// ============================================================================

export interface TopicsViewVMDeps {
  readonly topics$: ReadonlySignal<readonly any[] | undefined>
  readonly periods$: ReadonlySignal<readonly any[] | undefined>
  readonly createTopic: (args: {
    title: string
    description: string
    semesterId: string
  }) => Promise<any>
  readonly updateTopic: (args: {
    id: Id<"topics">
    title: string
    description: string
  }) => Promise<any>
  readonly toggleTopicActive: (args: { id: Id<"topics"> }) => Promise<any>
  readonly deleteTopic: (args: { id: Id<"topics"> }) => Promise<any>
}

// ============================================================================
// Factory - creates VM from dependencies
// ============================================================================

export function createTopicsViewVM(deps: TopicsViewVMDeps): TopicsViewVM {
  const {
    topics$,
    periods$,
    createTopic,
    updateTopic,
    toggleTopicActive,
    deleteTopic,
  } = deps

  // Signals created once
  const createTopicDialogOpen$ = signal(false)
  const editTopicDialogOpen$ = signal(false)
  const editingTopic$ = signal<Option.Option<{
    id: Id<"topics">
    title: string
    description: string
    semesterId: string
  }>>(Option.none())

  // Action: open edit dialog with topic data
  const openEditDialog = (topicId: string) => {
    const fullTopic = topics$.value?.find(t => t._id === topicId)
    if (!fullTopic) return

    editingTopic$.value = Option.some({
      id: fullTopic._id,
      title: fullTopic.title,
      description: fullTopic.description,
      semesterId: fullTopic.semesterId,
    })
    editTopicDialogOpen$.value = true
  }

  // Computed: topics list for table with edit handler
  const topicItems$ = computed((): readonly TopicItemVM[] =>
    (topics$.value ?? []).map((topic): TopicItemVM => ({
      key: topic._id,
      title: topic.title,
      description: topic.description,
      statusDisplay: topic.isActive ? "Active" : "Inactive",
      statusVariant: topic.isActive ? "default" : "secondary",
      selectionsCount: 0,
      toggleActive: () => {
        toggleTopicActive({ id: topic._id }).catch(console.error)
      },
      remove: () => {
        deleteTopic({ id: topic._id }).catch(console.error)
      },
      edit: () => {
        openEditDialog(topic._id)
      },
    }))
  )

  // Computed: period options for form
  const periodOptions$ = computed((): readonly PeriodOptionVM[] =>
    (periods$.value ?? []).map((period: any): PeriodOptionVM => ({
      value: period.semesterId,
      label: period.title,
    }))
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

  // Form submission handlers
  const onTopicSubmit = async (values: TopicFormValues): Promise<void> => {
    try {
      await createTopic({
        title: values.title,
        description: values.description,
        semesterId: values.selection_period_id,
      })
      createTopicDialog.close()
    } catch (error) {
      console.error("Failed to create topic:", error)
      throw error
    }
  }

  const onEditTopicSubmit = (values: TopicFormValues): void => {
    Option.match(editingTopic$.value, {
      onNone: () => {},
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

  return {
    topics$: topicItems$,
    periodOptions$,
    createTopicDialog,
    editTopicDialog,
    onTopicSubmit,
    onEditTopicSubmit,
  }
}
