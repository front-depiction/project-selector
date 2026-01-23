import { signal, computed, type ReadonlySignal, effect } from "@preact/signals-react"
import type { Id } from "@/convex/_generated/dataModel"
import type { FunctionReturnType } from "convex/server"
import type { api } from "@/convex/_generated/api"

// ============================================================================
// View Model Types
// ============================================================================

interface QuestionVM {
  readonly questionId: Id<"questions">
  readonly text: string
  readonly kind: "boolean" | "0to6"
  readonly order: number
}

export interface StudentQuestionPresentationVM {
  /** Current question index in unanswered list */
  readonly currentIndex$: ReadonlySignal<number>

  /** Current question derived from index */
  readonly currentQuestion$: ReadonlySignal<QuestionVM | null>

  /** Current answer for the current question */
  readonly currentAnswer$: ReadonlySignal<boolean | number | undefined>

  /** Progress percentage (0-100) - based on total answered / total questions */
  readonly progress$: ReadonlySignal<number>

  /** Total number of questions (all, not just unanswered) */
  readonly totalQuestions$: ReadonlySignal<number>

  /** Number of answered questions */
  readonly answeredCount$: ReadonlySignal<number>

  /** Number of unanswered questions remaining */
  readonly remainingCount$: ReadonlySignal<number>

  /** Is this the first unanswered question? */
  readonly isFirst$: ReadonlySignal<boolean>

  /** Is this the last unanswered question? */
  readonly isLast$: ReadonlySignal<boolean>

  /** Are all questions answered? */
  readonly isComplete$: ReadonlySignal<boolean>

  /** Is currently submitting? */
  readonly isSubmitting$: ReadonlySignal<boolean>

  /** Update the answer for the current question */
  readonly setAnswer: (value: number | boolean) => void

  /** Navigate to next unanswered question */
  readonly next: () => void

  /** Navigate to previous unanswered question */
  readonly previous: () => void

  /** Submit all answers */
  readonly submit: () => void
}

// ============================================================================
// Dependency Types
// ============================================================================

export interface StudentQuestionPresentationVMDeps {
  readonly studentId: string
  readonly selectionPeriodId: Id<"selectionPeriods">
  readonly questions$: ReadonlySignal<FunctionReturnType<typeof api.selectionQuestions.getQuestionsForPeriod> | undefined>
  readonly existingAnswers$: ReadonlySignal<FunctionReturnType<typeof api.studentAnswers.getAnswers> | undefined>
  readonly saveAnswers: (args: {
    studentId: string
    selectionPeriodId: Id<"selectionPeriods">
    answers: Array<{
      questionId: Id<"questions">
      kind: "boolean" | "0to6"
      value: boolean | number
    }>
  }) => Promise<void>
  readonly onComplete?: () => void
}

// ============================================================================
// Factory Function
// ============================================================================

export function createStudentQuestionPresentationVM(
  deps: StudentQuestionPresentationVMDeps
): StudentQuestionPresentationVM {
  const {
    studentId,
    selectionPeriodId,
    questions$: questionsData$,
    existingAnswers$: existingAnswersData$,
    saveAnswers,
    onComplete
  } = deps

  // Local signals for UI state
  const currentIndexSignal = signal(0)
  const answersMapSignal = signal(new Map<string, boolean | number>())
  const isSubmittingSignal = signal(false)
  const initializedSignal = signal(false)

  // Computed: ALL questions sorted by order (stable)
  const allQuestions$ = computed((): readonly QuestionVM[] => {
    const questionsData = questionsData$.value
    if (!questionsData) return []

    return questionsData
      .filter(sq => sq.question !== null)
      .sort((a, b) => a.order - b.order)
      .map(sq => ({
        questionId: sq.questionId,
        text: sq.question!.question,
        kind: sq.question!.kind as "boolean" | "0to6",
        order: sq.order
      }))
  })

  // Effect: Initialize answers map from existing data (once)
  effect(() => {
    const existingAnswers = existingAnswersData$.value
    if (!existingAnswers || initializedSignal.value) return

    if (existingAnswers.length > 0) {
      const newMap = new Map<string, boolean | number>()
      for (const answer of existingAnswers) {
        newMap.set(answer.questionId, answer.rawAnswer.value)
      }
      answersMapSignal.value = newMap

      // Auto-navigate to first unanswered question
      const allQuestions = allQuestions$.value
      const firstUnansweredIndex = allQuestions.findIndex(q => !newMap.has(q.questionId))

      if (firstUnansweredIndex !== -1) {
        currentIndexSignal.value = firstUnansweredIndex
      } else if (allQuestions.length > 0) {
        // All answered - start at first question for editing
        currentIndexSignal.value = 0
      }
    }
    initializedSignal.value = true
  })

  // Computed: unanswered questions (for display count only)
  const unansweredQuestions$ = computed((): readonly QuestionVM[] => {
    const allQuestions = allQuestions$.value
    const existing = existingAnswersData$.value || []
    const local = answersMapSignal.value

    // Check both backend and local state
    const answeredIds = new Set(existing.map(a => a.questionId))
    for (const id of local.keys()) {
      answeredIds.add(id as Id<"questions">)
    }

    return allQuestions.filter(q => !answeredIds.has(q.questionId))
  })

  // Computed: total questions count (stable)
  const totalQuestions$ = computed(() => allQuestions$.value.length)

  // Computed: answered count (Backend + Local)
  const allAnsweredIds$ = computed(() => {
    const existing = existingAnswersData$.value || []
    const local = answersMapSignal.value
    const ids = new Set(existing.map(a => a.questionId))
    for (const id of local.keys()) {
      ids.add(id as Id<"questions">)
    }
    return ids
  })

  const answeredCount$ = computed(() => allAnsweredIds$.value.size)

  // Computed: remaining unanswered
  const remainingCount$ = computed(() => totalQuestions$.value - answeredCount$.value)

  // Computed: current question (based on global index)
  const currentQuestion$ = computed((): QuestionVM | null => {
    const all = allQuestions$.value
    const index = currentIndexSignal.value
    if (all.length === 0 || index < 0 || index >= all.length) {
      return null
    }
    return all[index]
  })

  // Computed: current answer
  const currentAnswer$ = computed(() => {
    const question = currentQuestion$.value
    if (!question) return undefined
    return answersMapSignal.value.get(question.questionId)
  })

  // Computed: progress percentage (answered / total)
  const progress$ = computed(() => {
    const total = totalQuestions$.value
    if (total === 0) return 0
    return (answeredCount$.value / total) * 100
  })

  // Computed: navigation state
  const isFirst$ = computed(() => currentIndexSignal.value === 0)
  const isLast$ = computed(() => {
    const total = totalQuestions$.value
    return total === 0 || currentIndexSignal.value === total - 1
  })

  // Computed: completion state - checks BOTH persisted and local answers
  const isComplete$ = computed(() => {
    const allQuestions = allQuestions$.value
    if (allQuestions.length === 0) return false

    const answeredIds = allAnsweredIds$.value
    return allQuestions.every(q => answeredIds.has(q.questionId))
  })

  // Helper: persist current answer to database (fire and forget)
  const persistCurrentAnswer = (): boolean => {
    const question = currentQuestion$.value
    if (!question) return false

    // Use stored answer or default (3 for scale)
    // IMPORTANT: removed false default for boolean to ensure explicit selection
    const storedAnswer = answersMapSignal.value.get(question.questionId)
    const answer = storedAnswer ?? (question.kind === "0to6" ? 3 : undefined)

    if (answer === undefined) {
      return false // Validation failed
    }

    // Also update local map with default if not set (for scale default)
    if (storedAnswer === undefined) {
      const newMap = new Map(answersMapSignal.value)
      newMap.set(question.questionId, answer)
      answersMapSignal.value = newMap
    }

    // Fire and forget
    saveAnswers({
      studentId,
      selectionPeriodId,
      answers: [{
        questionId: question.questionId,
        kind: question.kind,
        value: answer
      }]
    }).catch((error) => {
      console.error("Failed to persist answer:", error)
    })

    return true
  }

  // Actions
  const setAnswer = (value: number | boolean): void => {
    const question = currentQuestion$.value
    if (!question) return

    const newMap = new Map(answersMapSignal.value)
    newMap.set(question.questionId, value)
    answersMapSignal.value = newMap
  }

  const next = (): void => {
    // Persist current answer if one exists (don't block navigation)
    persistCurrentAnswer()

    // Advance index
    const total = totalQuestions$.value
    if (currentIndexSignal.value < total - 1) {
      currentIndexSignal.value = currentIndexSignal.value + 1
    }
  }

  const previous = (): void => {
    if (currentIndexSignal.value > 0) {
      currentIndexSignal.value = currentIndexSignal.value - 1
    }
  }

  const submit = (): void => {
    if (isSubmittingSignal.value) return

    // Persist any final answer
    if (!persistCurrentAnswer()) {
      return // allow submit only if current is valid (or maybe check strict completeness)
    }

    isSubmittingSignal.value = true

    // Submit all answers from the map
    const allQuestions = allQuestions$.value
    const answers = answersMapSignal.value

    const answersArray = allQuestions
      .filter(q => answers.has(q.questionId))
      .map(q => ({
        questionId: q.questionId,
        kind: q.kind,
        value: answers.get(q.questionId)!
      }))

    saveAnswers({
      studentId,
      selectionPeriodId,
      answers: answersArray
    })
      .then(() => {
        onComplete?.()
      })
      .catch((error) => {
        console.error("Failed to save answers:", error)
      })
      .finally(() => {
        isSubmittingSignal.value = false
      })
  }

  return {
    currentIndex$: currentIndexSignal,
    currentQuestion$,
    currentAnswer$,
    progress$,
    totalQuestions$,
    answeredCount$,
    remainingCount$,
    isFirst$,
    isLast$,
    isComplete$,
    isSubmitting$: isSubmittingSignal,
    setAnswer,
    next,
    previous,
    submit,
  }
}
