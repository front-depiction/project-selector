"use client"
import { signal, computed, ReadonlySignal } from "@preact/signals-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { TopicFormValues } from "@/components/forms/topic-form"

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
  readonly editingTopic$: ReadonlySignal<{
    readonly id: Id<"topics">
    readonly title: string
    readonly description: string
    readonly semesterId: string
  } | null>
}

export interface TopicsViewVM {
  readonly topics$: ReadonlySignal<readonly TopicItemVM[]>
  readonly subtopics$: ReadonlySignal<readonly SubtopicItemVM[]>
  readonly periodOptions$: ReadonlySignal<readonly PeriodOptionVM[]>
  readonly createTopicDialog: DialogVM
  readonly createSubtopicDialog: DialogVM
  readonly editTopicDialog: EditTopicDialogVM
  readonly onTopicSubmit: (values: TopicFormValues) => void
  readonly onSubtopicSubmit: (values: { title: string; description: string }) => void
  readonly onEditTopicSubmit: (values: TopicFormValues) => void
}

// ============================================================================
// Hook - uses Convex as reactive primitive directly
// ============================================================================

export function useTopicsViewVM(): TopicsViewVM {
  // Convex queries - already reactive!
  const topics = useQuery(api.topics.getAllTopics, {})
  const subtopics = useQuery(api.subtopics.getAllSubtopics, {})
  const periods = useQuery(api.admin.getAllPeriods, {})

  // Convex mutations
  const createTopic = useMutation(api.admin.createTopic)
  const updateTopic = useMutation(api.admin.updateTopic)
  const toggleTopicActive = useMutation(api.admin.toggleTopicActive)
  const deleteTopic = useMutation(api.admin.deleteTopic)
  const createSubtopic = useMutation(api.subtopics.createSubtopic)
  const deleteSubtopic = useMutation(api.subtopics.deleteSubtopic)

  // Dialog state
  const createTopicDialogOpen$ = signal(false)
  const createSubtopicDialogOpen$ = signal(false)
  const editTopicDialogOpen$ = signal(false)
  const editingTopic$ = signal<{
    id: Id<"topics">
    title: string
    description: string
    semesterId: string
  } | null>(null)

  // Action: open edit dialog with topic data
  const openEditDialog = (topicId: string) => {
    // Find the full topic from the raw data
    const fullTopic = topics?.find(t => t._id === topicId)
    if (!fullTopic) return

    editingTopic$.value = {
      id: fullTopic._id,
      title: fullTopic.title,
      description: fullTopic.description,
      semesterId: fullTopic.semesterId,
    }
    editTopicDialogOpen$.value = true
  }

  // Computed: topics list for table with edit handler
  const topics$ = computed((): readonly TopicItemVM[] =>
    (topics ?? []).map((topic): TopicItemVM => ({
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
  const subtopics$ = computed((): readonly SubtopicItemVM[] =>
    (subtopics ?? []).map((subtopic): SubtopicItemVM => ({
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
    (periods ?? []).map((period: any): PeriodOptionVM => ({
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
      editTopicDialogOpen$.value = false
      editingTopic$.value = null
    },
  }

  // Form submission handlers
  const onTopicSubmit = (values: TopicFormValues): void => {
    createTopic({
      title: values.title,
      description: values.description,
      semesterId: values.selection_period_id,
    })
      .then(() => {
        createTopicDialog.close()
      })
      .catch(console.error)
  }

  const onSubtopicSubmit = (values: { title: string; description: string }): void => {
    createSubtopic({
      title: values.title,
      description: values.description,
    })
      .then(() => {
        createSubtopicDialog.close()
      })
      .catch(console.error)
  }

  const onEditTopicSubmit = (values: TopicFormValues): void => {
    const editing = editingTopic$.value
    if (!editing) return

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

  return {
    topics$,
    subtopics$,
    periodOptions$,
    createTopicDialog,
    createSubtopicDialog,
    editTopicDialog,
    onTopicSubmit,
    onSubtopicSubmit,
    onEditTopicSubmit,
  }
}
