"use client"
import { signal, computed, ReadonlySignal } from "@preact/signals-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { Item } from "@/components/ui/sortable-list"

// ============================================================================
// View Model Types
// ============================================================================

/**
 * Step in the student selection flow
 */
export type SelectionStep = "entry" | "questionnaire" | "selection" | "complete"

/**
 * Extended Item type for topics with congestion data
 */
export interface TopicItemVM extends Item {
  readonly _id: Id<"topics">
  readonly studentCount: number
  readonly likelihoodCategory: string
  readonly averagePosition: number | null
}

/**
 * Questionnaire state
 */
export interface QuestionnaireStateVM {
  readonly hasQuestions: boolean
  readonly isCompleted: boolean
  readonly needsCompletion: boolean
}

/**
 * Current period display data
 */
export interface PeriodDisplayVM {
  readonly title: string
  readonly description: string
  readonly closeDateDisplay: string
  readonly daysRemaining: string
  readonly isOpen: boolean
}

/**
 * Selection progress data
 */
export interface SelectionProgressVM {
  readonly selectedCount: number
  readonly maxSelections: number
  readonly progressPercentage: number
  readonly hasMinimumSelection: boolean
}

/**
 * Validation states
 */
export interface ValidationStateVM {
  readonly hasExistingRanking: boolean
  readonly canSubmit: boolean
  readonly error$: ReadonlySignal<string | null>
}

/**
 * Main view model for student selection page
 */
export interface StudentSelectionPageVM {
  // Reactive state
  readonly currentStep$: ReadonlySignal<SelectionStep>
  readonly studentId$: ReadonlySignal<string>
  readonly currentPeriod$: ReadonlySignal<PeriodDisplayVM | null>
  readonly topics$: ReadonlySignal<readonly TopicItemVM[]>
  readonly selectedTopicIds$: ReadonlySignal<readonly Id<"topics">[]>
  readonly questionnaireState$: ReadonlySignal<QuestionnaireStateVM>
  readonly selectionProgress$: ReadonlySignal<SelectionProgressVM>
  readonly validationState$: ReadonlySignal<ValidationStateVM>
  readonly expandedTopicIds$: ReadonlySignal<Set<string | number>>
  readonly isLoading$: ReadonlySignal<boolean>

  // Actions
  readonly setStudentId: (id: string) => void
  readonly updateSelection: (newItems: Item[] | ((prev: Item[]) => Item[])) => void
  readonly toggleTopicExpanded: (topicId: string | number) => void
  readonly handleQuestionnaireComplete: () => void
  readonly navigateToEntry: () => void
}

// ============================================================================
// Hook - Creates and manages the ViewModel
// ============================================================================

export function useStudentSelectionPageVM(): StudentSelectionPageVM {
  // Local signals for UI state
  const studentId$ = signal<string>(
    typeof window !== "undefined" ? localStorage.getItem("studentId") || "" : ""
  )
  const expandedTopicIds$ = signal<Set<string | number>>(new Set())
  const questionnaireCompleted$ = signal(false)
  const error$ = signal<string | null>(null)

  // Convex queries - reactive data layer
  const topics = useQuery(api.topics.getActiveTopicsWithMetrics)
  const preferences = useQuery(
    api.preferences.getPreferences,
    studentId$.value ? { studentId: studentId$.value } : "skip"
  )
  const currentPeriod = useQuery(api.admin.getCurrentPeriod, {})
  const periodQuestions = useQuery(
    api.selectionQuestions.getQuestionsForPeriod,
    currentPeriod?._id ? { selectionPeriodId: currentPeriod._id } : "skip"
  )
  const hasCompletedQuestionnaire = useQuery(
    api.studentAnswers.hasCompletedQuestionnaire,
    currentPeriod?._id && studentId$.value
      ? { studentId: studentId$.value, selectionPeriodId: currentPeriod._id }
      : "skip"
  )

  // Convex mutations
  const savePreferences = useMutation(api.preferences.savePreferences).withOptimisticUpdate(
    (localStore, args) => {
      const { studentId, topicOrder } = args
      localStore.setQuery(
        api.preferences.getPreferences,
        { studentId },
        {
          studentId,
          semesterId: currentPeriod?.semesterId || "",
          topicOrder,
          lastUpdated: Date.now(),
          _id: crypto.randomUUID() as Id<"preferences">,
          _creationTime: Date.now()
        }
      )
    }
  )

  // ============================================================================
  // Computed: Loading state
  // ============================================================================

  const isLoading$ = computed((): boolean => {
    if (!topics) return true
    const hasQuestions = periodQuestions && periodQuestions.length > 0
    if (hasQuestions && hasCompletedQuestionnaire === undefined) return true
    return false
  })

  // ============================================================================
  // Computed: Questionnaire state
  // ============================================================================

  const questionnaireState$ = computed((): QuestionnaireStateVM => {
    const hasQuestions = periodQuestions ? periodQuestions.length > 0 : false
    const isCompleted = hasCompletedQuestionnaire === true || questionnaireCompleted$.value
    const needsCompletion = hasQuestions && !isCompleted

    return {
      hasQuestions,
      isCompleted,
      needsCompletion
    }
  })

  // ============================================================================
  // Computed: Current step in the flow
  // ============================================================================

  const currentStep$ = computed((): SelectionStep => {
    if (!studentId$.value) return "entry"

    const qState = questionnaireState$.value
    if (qState.needsCompletion) return "questionnaire"

    // Check if student has submitted final ranking
    const hasSubmitted = preferences?.topicOrder && preferences.topicOrder.length > 0
    if (hasSubmitted) return "selection"

    return "selection"
  })

  // ============================================================================
  // Computed: Current period display data
  // ============================================================================

  const currentPeriod$ = computed((): PeriodDisplayVM | null => {
    if (!currentPeriod) return null

    const closeDate = new Date(currentPeriod.closeDate)
    const now = new Date()
    const daysRemaining = Math.ceil((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return {
      title: currentPeriod.title,
      description: currentPeriod.description,
      closeDateDisplay: closeDate.toLocaleDateString(),
      daysRemaining: daysRemaining > 0 ? `${daysRemaining} days` : "Closed",
      isOpen: currentPeriod.kind === "open"
    }
  })

  // ============================================================================
  // Computed: Topics with user's order applied
  // ============================================================================

  const topics$ = computed((): readonly TopicItemVM[] => {
    if (!topics) return []

    let sortedTopics = [...topics]

    // Sort by user's saved order if available
    if (preferences?.topicOrder) {
      sortedTopics.sort((a, b) => {
        const aIndex = preferences.topicOrder.indexOf(a._id)
        const bIndex = preferences.topicOrder.indexOf(b._id)

        // Put selected topics first in saved order
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1
        return 0
      })
    }

    return sortedTopics.map((topic): TopicItemVM => ({
      id: topic._id as any,
      _id: topic._id,
      text: topic.title,
      description: topic.description,
      checked: false,
      studentCount: topic.studentCount,
      likelihoodCategory: topic.likelihoodCategory,
      averagePosition: topic.averagePosition
    }))
  })

  // ============================================================================
  // Computed: Selected topic IDs
  // ============================================================================

  const selectedTopicIds$ = computed((): readonly Id<"topics">[] => {
    return preferences?.topicOrder || []
  })

  // ============================================================================
  // Computed: Selection progress
  // ============================================================================

  const selectionProgress$ = computed((): SelectionProgressVM => {
    const selectedCount = selectedTopicIds$.value.length
    const maxSelections = 5
    const availableTopics = topics$.value.length

    const progressPercentage = availableTopics > 0
      ? (selectedCount / Math.min(maxSelections, availableTopics)) * 100
      : 0

    return {
      selectedCount,
      maxSelections,
      progressPercentage,
      hasMinimumSelection: selectedCount > 0
    }
  })

  // ============================================================================
  // Computed: Validation state
  // ============================================================================

  const validationState$ = computed((): ValidationStateVM => {
    const hasExistingRanking = selectedTopicIds$.value.length > 0
    const canSubmit = selectedTopicIds$.value.length > 0 && !error$.value

    return {
      hasExistingRanking,
      canSubmit,
      error$
    }
  })

  // ============================================================================
  // Actions
  // ============================================================================

  const setStudentId = (id: string): void => {
    studentId$.value = id
    if (typeof window !== "undefined") {
      localStorage.setItem("studentId", id)
    }
  }

  const updateSelection = (newItems: Item[] | ((prev: Item[]) => Item[])): void => {
    error$.value = null

    const currentItems = topics$.value as unknown as Item[]
    const resolvedItems = typeof newItems === 'function' ? newItems(currentItems) : newItems
    const topicOrder = resolvedItems.map((item) => item.id as unknown as Id<"topics">)

    if (!studentId$.value) {
      error$.value = "Student ID is required"
      return
    }

    savePreferences({ studentId: studentId$.value, topicOrder }).catch((err) => {
      error$.value = err instanceof Error ? err.message : "Failed to save preferences"
    })
  }

  const toggleTopicExpanded = (topicId: string | number): void => {
    const newSet = new Set(expandedTopicIds$.value)
    if (newSet.has(topicId)) {
      newSet.delete(topicId)
    } else {
      newSet.add(topicId)
    }
    expandedTopicIds$.value = newSet
  }

  const handleQuestionnaireComplete = (): void => {
    questionnaireCompleted$.value = true
  }

  const navigateToEntry = (): void => {
    // This would typically use router.push() but we keep it side-effect only
    // The UI can handle navigation by watching currentStep$
    studentId$.value = ""
    if (typeof window !== "undefined") {
      localStorage.removeItem("studentId")
    }
  }

  // ============================================================================
  // Return ViewModel
  // ============================================================================

  return {
    currentStep$,
    studentId$,
    currentPeriod$,
    topics$,
    selectedTopicIds$,
    questionnaireState$,
    selectionProgress$,
    validationState$,
    expandedTopicIds$,
    isLoading$,
    setStudentId,
    updateSelection,
    toggleTopicExpanded,
    handleQuestionnaireComplete,
    navigateToEntry
  }
}
