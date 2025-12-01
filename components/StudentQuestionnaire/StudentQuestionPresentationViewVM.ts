"use client"
import { signal, computed, type ReadonlySignal } from "@preact/signals-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useMemo, useEffect } from "react"

// ============================================================================
// View Model Types
// ============================================================================

export interface StudentQuestionPresentationVM {
  /** Current question index (writable signal) */
  readonly currentIndex$: ReadonlySignal<number>

  /** Current question derived from index */
  readonly currentQuestion$: ReadonlySignal<{
    readonly questionId: Id<"questions">
    readonly text: string
    readonly kind: "boolean" | "0to10"
  } | null>

  /** Current answer for the current question */
  readonly currentAnswer$: ReadonlySignal<boolean | number | undefined>

  /** Progress percentage (0-100) */
  readonly progress$: ReadonlySignal<number>

  /** Total number of questions */
  readonly totalQuestions$: ReadonlySignal<number>

  /** Is this the first question? */
  readonly isFirst$: ReadonlySignal<boolean>

  /** Is this the last question? */
  readonly isLast$: ReadonlySignal<boolean>

  /** Are all questions answered? */
  readonly isComplete$: ReadonlySignal<boolean>

  /** Is currently submitting? */
  readonly isSubmitting$: ReadonlySignal<boolean>

  /** Update the answer for the current question */
  readonly setAnswer: (value: number | boolean) => void

  /** Navigate to next question */
  readonly next: () => void

  /** Navigate to previous question */
  readonly previous: () => void

  /** Submit all answers */
  readonly submit: () => void
}

// ============================================================================
// Hook
// ============================================================================

export interface StudentQuestionPresentationVMProps {
  readonly studentId: string
  readonly selectionPeriodId: Id<"selectionPeriods">
  readonly onComplete?: () => void
}

export function useStudentQuestionPresentationVM(
  props: StudentQuestionPresentationVMProps
): StudentQuestionPresentationVM {
  const { studentId, selectionPeriodId, onComplete } = props

  // Convex queries
  const questionsData = useQuery(api.selectionQuestions.getQuestionsForPeriod, { selectionPeriodId })
  const existingAnswersData = useQuery(api.studentAnswers.getAnswers, { studentId, selectionPeriodId })

  // Convex mutations
  const saveAnswersMutation = useMutation(api.studentAnswers.saveAnswers)

  // Create signals once using useMemo - these are the stateful primitives
  const signals = useMemo(() => ({
    currentIndexSignal: signal(0),
    answersMapSignal: signal(new Map<string, boolean | number>()),
    isSubmittingSignal: signal(false),
  }), [])

  // Initialize answers from existing data using useEffect
  useEffect(() => {
    if (existingAnswersData && existingAnswersData.length > 0 && signals.answersMapSignal.value.size === 0) {
      const newMap = new Map<string, boolean | number>()
      for (const answer of existingAnswersData) {
        newMap.set(answer.questionId, answer.rawAnswer.value)
      }
      signals.answersMapSignal.value = newMap
    }
  }, [existingAnswersData, signals])

  // Create VM once - computed signals reference the live questionsData through closure
  const vm = useMemo(() => {
    const { currentIndexSignal, answersMapSignal, isSubmittingSignal } = signals

    // Computed: questions list (filtered and mapped)
    const questions$ = computed(() => {
      if (!questionsData) return []
      return questionsData
        .filter(sq => sq.question !== null)
        .map(sq => ({
          questionId: sq.questionId,
          text: sq.question!.question,
          kind: sq.question!.kind as "boolean" | "0to10"
        }))
    })

    // Computed: total questions
    const totalQuestions$ = computed(() => questions$.value.length)

    // Computed: current question
    const currentQuestion$ = computed(() => {
      const questions = questions$.value
      const index = currentIndexSignal.value
      if (questions.length === 0 || index < 0 || index >= questions.length) {
        return null
      }
      return questions[index]
    })

    // Computed: current answer
    const currentAnswer$ = computed(() => {
      const question = currentQuestion$.value
      if (!question) return undefined
      return answersMapSignal.value.get(question.questionId)
    })

    // Computed: progress percentage
    const progress$ = computed(() => {
      const total = totalQuestions$.value
      if (total === 0) return 0
      return ((currentIndexSignal.value + 1) / total) * 100
    })

    // Computed: navigation state
    const isFirst$ = computed(() => currentIndexSignal.value === 0)
    const isLast$ = computed(() => currentIndexSignal.value === totalQuestions$.value - 1)

    // Computed: completion state
    const isComplete$ = computed(() => {
      const questions = questions$.value
      const answers = answersMapSignal.value
      if (questions.length === 0) return false
      return questions.every(q => answers.has(q.questionId))
    })

    // Actions
    const setAnswer = (value: number | boolean) => {
      const question = currentQuestion$.value
      if (!question) return

      const newMap = new Map(answersMapSignal.value)
      newMap.set(question.questionId, value)
      answersMapSignal.value = newMap
    }

    const next = () => {
      const total = totalQuestions$.value
      if (currentIndexSignal.value < total - 1) {
        currentIndexSignal.value = currentIndexSignal.value + 1
      }
    }

    const previous = () => {
      if (currentIndexSignal.value > 0) {
        currentIndexSignal.value = currentIndexSignal.value - 1
      }
    }

    const submit = () => {
      if (isSubmittingSignal.value) return

      isSubmittingSignal.value = true

      const questions = questions$.value
      const answers = answersMapSignal.value

      const answersArray = questions.map(q => ({
        questionId: q.questionId,
        kind: q.kind,
        value: answers.get(q.questionId) ?? (q.kind === "boolean" ? false : 5)
      }))

      saveAnswersMutation({
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
      isFirst$,
      isLast$,
      isComplete$,
      isSubmitting$: isSubmittingSignal,
      setAnswer,
      next,
      previous,
      submit,
    }
  }, [signals, questionsData, saveAnswersMutation, studentId, selectionPeriodId, onComplete])

  return vm
}
