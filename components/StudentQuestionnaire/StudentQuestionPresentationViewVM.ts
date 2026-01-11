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
  readonly kind: "boolean" | "0to10"
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
      kind: "boolean" | "0to10"
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
        kind: sq.question!.kind as "boolean" | "0to10",
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
    }
    initializedSignal.value = true
  })

  // Computed: unanswered questions (for navigation) - based on PERSISTED answers only
  const unansweredQuestions$ = computed((): readonly QuestionVM[] => {
    const allQuestions = allQuestions$.value
    const existingAnswers = existingAnswersData$.value
    const persistedIds = new Set(existingAnswers?.map(a => a.questionId) ?? [])
    return allQuestions.filter(q => !persistedIds.has(q.questionId))
  })

  // Computed: total questions count (stable)
  const totalQuestions$ = computed(() => allQuestions$.value.length)

  // Computed: answered count - based on PERSISTED answers only
  const answeredCount$ = computed(() => {
    const existingAnswers = existingAnswersData$.value
    return existingAnswers?.length ?? 0
  })

  // Computed: remaining unanswered
  const remainingCount$ = computed(() => unansweredQuestions$.value.length)

  // Computed: current question (from unanswered list)
  const currentQuestion$ = computed((): QuestionVM | null => {
    const unanswered = unansweredQuestions$.value
    const index = currentIndexSignal.value
    if (unanswered.length === 0 || index < 0 || index >= unanswered.length) {
      return null
    }
    return unanswered[index]
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

  // Computed: navigation state (within unanswered list)
  const isFirst$ = computed(() => currentIndexSignal.value === 0)
  const isLast$ = computed(() => {
    const remaining = remainingCount$.value
    return remaining === 0 || currentIndexSignal.value === remaining - 1
  })

  // Computed: completion state - checks BOTH persisted and local answers
  const isComplete$ = computed(() => {
    const allQuestions = allQuestions$.value
    if (allQuestions.length === 0) return false

    const existingAnswers = existingAnswersData$.value
    const persistedIds = new Set(existingAnswers?.map(a => a.questionId) ?? [])
    const localAnswers = answersMapSignal.value

    // Complete if every question has either a persisted or local answer
    return allQuestions.every(q => persistedIds.has(q.questionId) || localAnswers.has(q.questionId))
  })

  // Helper: persist current answer to database (fire and forget)
  const persistCurrentAnswer = (): void => {
    const question = currentQuestion$.value
    if (!question) return

    // Use stored answer or default (3 for scale, false for boolean)
    const storedAnswer = answersMapSignal.value.get(question.questionId)
    const answer = storedAnswer ?? (question.kind === "0to6" ? 3 : false)

    // Also update local map with default if not set
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
    // Persist current answer (fire and forget with optimistic update)
    // The optimistic update shrinks unansweredQuestions$, so staying at
    // the same index shows the next question
    persistCurrentAnswer()

    // Clamp index if we're at the end
    const remaining = remainingCount$.value
    if (remaining > 0 && currentIndexSignal.value >= remaining - 1) {
      currentIndexSignal.value = Math.max(0, remaining - 2)
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
    persistCurrentAnswer()

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
