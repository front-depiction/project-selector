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
  readonly subtopicsCount: number
  readonly selectionsCount: number
  readonly toggleActive: () => void
  readonly remove: () => void
  readonly edit: () => void
}

export interface SubtopicItemVM {
  readonly key: string
  readonly title: string
  readonly description: string
  readonly remove: () => void
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

export interface SubtopicFormVM {
  readonly title: string
  readonly description: string
}

export interface TopicsViewVM {
  readonly topics$: ReadonlySignal<readonly TopicItemVM[]>
  readonly subtopics$: ReadonlySignal<readonly SubtopicItemVM[]>
  readonly periodOptions$: ReadonlySignal<readonly PeriodOptionVM[]>
  readonly subtopicForm$: ReadonlySignal<SubtopicFormVM>
  readonly createTopicDialog: DialogVM
  readonly createSubtopicDialog: DialogVM
  readonly editTopicDialog: EditTopicDialogVM
  readonly createdTopicId$: ReadonlySignal<Option.Option<Id<"topics">>>
  readonly onTopicSubmit: (values: TopicFormValues) => Promise<void>
  readonly onSubtopicSubmit: (values: { title: string; description: string }) => void
  readonly onEditTopicSubmit: (values: TopicFormValues) => void
  readonly setSubtopicTitle: (title: string) => void
  readonly setSubtopicDescription: (description: string) => void
  readonly resetSubtopicForm: () => void
  readonly createSubtopic: () => void
  readonly finishTopicCreation: () => void
}

// ============================================================================
// Dependencies - data passed in from outside
// ============================================================================

export interface TopicsViewVMDeps {
  readonly topics$: ReadonlySignal<readonly any[] | undefined>
  readonly subtopics$: ReadonlySignal<readonly any[] | undefined>
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
  readonly createSubtopic: (args: {
    title: string
    description: string
  }) => Promise<any>
  readonly deleteSubtopic: (args: { id: Id<"subtopics"> }) => Promise<any>
}

// ============================================================================
// Factory - creates VM from dependencies
// ============================================================================

export function createTopicsViewVM(deps: TopicsViewVMDeps): TopicsViewVM {
  const {
    topics$,
    subtopics$,
    periods$,
    createTopic,
    updateTopic,
    toggleTopicActive,
    deleteTopic,
    createSubtopic,
    deleteSubtopic,
  } = deps

  // Signals created once
  const createTopicDialogOpen$ = signal(false)
  const createSubtopicDialogOpen$ = signal(false)
  const editTopicDialogOpen$ = signal(false)
  const createdTopicId$ = signal<Option.Option<Id<"topics">>>(Option.none())
  const editingTopic$ = signal<Option.Option<{
    id: Id<"topics">
    title: string
    description: string
    semesterId: string
  }>>(Option.none())
  const subtopicForm$ = signal<SubtopicFormVM>({ title: "", description: "" })

  // Action: open edit dialog with topic data
  const openEditDialog = (topicId: string) => {
    // Find the full topic from the raw data
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
      subtopicsCount: topic.subtopicIds?.length || 0,
      selectionsCount: 0, // TODO: Add when available
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

  // Computed: subtopics list for grid
  const subtopicItems$ = computed((): readonly SubtopicItemVM[] =>
    (subtopics$.value ?? []).map((subtopic): SubtopicItemVM => ({
      key: subtopic._id,
      title: subtopic.title,
      description: subtopic.description,
      remove: () => {
        deleteSubtopic({ id: subtopic._id }).catch(console.error)
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
      batch(() => {
        createTopicDialogOpen$.value = true
        createdTopicId$.value = Option.none() // Reset when opening
      })
    },
    close: () => {
      batch(() => {
        createTopicDialogOpen$.value = false
        createdTopicId$.value = Option.none() // Reset when closing
      })
    },
  }

  const finishTopicCreation = (): void => {
    createTopicDialog.close()
  }

  // Create subtopic dialog
  const createSubtopicDialog: DialogVM = {
    isOpen$: createSubtopicDialogOpen$,
    open: () => {
      createSubtopicDialogOpen$.value = true
    },
    close: () => {
      createSubtopicDialogOpen$.value = false
    },
  }

  // Edit topic dialog - extends DialogVM with editingTopic$
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
      const topicId = await createTopic({
        title: values.title,
        description: values.description,
        semesterId: values.selection_period_id,
      })
      
      // Store the created topic ID to show allow-list UI
      if (topicId) {
        console.log("Topic created with ID:", topicId)
        createdTopicId$.value = Option.some(topicId as Id<"topics">)
        console.log("Signal updated, createdTopicId$:", createdTopicId$.value)
      } else {
        console.warn("Topic created but no ID returned")
      }
    } catch (error) {
      console.error("Failed to create topic:", error)
      throw error // Re-throw so form can handle it
    }
  }

  const onSubtopicSubmit = (values: { title: string; description: string }): void => {
    createSubtopic({
      title: values.title,
      description: values.description,
    })
      .then(() => {
        createSubtopicDialog.close()
        resetSubtopicForm()
      })
      .catch(console.error)
  }

  const setSubtopicTitle = (title: string): void => {
    subtopicForm$.value = { ...subtopicForm$.value, title }
  }

  const setSubtopicDescription = (description: string): void => {
    subtopicForm$.value = { ...subtopicForm$.value, description }
  }

  const resetSubtopicForm = (): void => {
    subtopicForm$.value = { title: "", description: "" }
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

  const createSubtopicAction = (): void => {
    const form = subtopicForm$.value
    if (!form.title || !form.description) return
    onSubtopicSubmit({
      title: form.title,
      description: form.description,
    })
  }

  return {
    topics$: topicItems$,
    subtopics$: subtopicItems$,
    periodOptions$,
    subtopicForm$,
    createTopicDialog,
    createSubtopicDialog,
    editTopicDialog,
    createdTopicId$,
    onTopicSubmit,
    onSubtopicSubmit,
    onEditTopicSubmit,
    setSubtopicTitle,
    setSubtopicDescription,
    resetSubtopicForm,
    createSubtopic: createSubtopicAction,
    finishTopicCreation,
  }
}
