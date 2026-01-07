"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { signal, computed } from "@preact/signals-react"
import { createStudentSelectionPageVM } from "@/components/StudentSelection/StudentSelectionPageVM"
import { createStudentQuestionPresentationVM } from "@/components/StudentQuestionnaire/StudentQuestionPresentationViewVM"
import { StudentSelectionPage } from "@/components/StudentSelection/StudentSelectionPage"

/**
 * Hook to create VM with Convex queries - follows LandingPage pattern
 */
function useStudentSelectionPageVM() {
  const router = useRouter()

  // Initialize student ID from localStorage
  const [initialStudentId] = React.useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("studentId") || "" : ""
  )

  // Convex queries
  const topics = useQuery(api.topics.getActiveTopicsWithMetrics)
  const preferences = useQuery(
    api.preferences.getPreferences,
    initialStudentId ? { studentId: initialStudentId } : "skip"
  )
  const currentPeriod = useQuery(api.admin.getCurrentPeriod, {})
  const periodQuestions = useQuery(
    api.selectionQuestions.getQuestionsForPeriod,
    currentPeriod?._id ? { selectionPeriodId: currentPeriod._id } : "skip"
  )
  const hasCompletedQuestionnaire = useQuery(
    api.studentAnswers.hasCompletedQuestionnaire,
    currentPeriod?._id && initialStudentId
      ? { studentId: initialStudentId, selectionPeriodId: currentPeriod._id }
      : "skip"
  )
  const existingAnswers = useQuery(
    api.studentAnswers.getAnswers,
    currentPeriod?._id && initialStudentId
      ? { studentId: initialStudentId, selectionPeriodId: currentPeriod._id }
      : "skip"
  )

  // Create signals once
  const topics$ = React.useMemo(() => signal(topics), [])
  const preferences$ = React.useMemo(() => signal(preferences), [])
  const currentPeriod$ = React.useMemo(() => signal(currentPeriod), [])
  const periodQuestions$ = React.useMemo(() => signal(periodQuestions), [])
  const hasCompletedQuestionnaire$ = React.useMemo(() => signal(hasCompletedQuestionnaire), [])
  const existingAnswers$ = React.useMemo(() => signal(existingAnswers), [])

  // Sync signals with query data
  React.useEffect(() => { topics$.value = topics }, [topics, topics$])
  React.useEffect(() => { preferences$.value = preferences }, [preferences, preferences$])
  React.useEffect(() => { currentPeriod$.value = currentPeriod }, [currentPeriod, currentPeriod$])
  React.useEffect(() => { periodQuestions$.value = periodQuestions }, [periodQuestions, periodQuestions$])
  React.useEffect(() => { hasCompletedQuestionnaire$.value = hasCompletedQuestionnaire }, [hasCompletedQuestionnaire, hasCompletedQuestionnaire$])
  React.useEffect(() => { existingAnswers$.value = existingAnswers }, [existingAnswers, existingAnswers$])

  // Mutation with optimistic update
  const savePreferencesMutation = useMutation(api.preferences.savePreferences).withOptimisticUpdate(
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

  const saveAnswersMutation = useMutation(api.studentAnswers.saveAnswers).withOptimisticUpdate(
    (localStore, args) => {
      const { studentId, selectionPeriodId, answers } = args

      // Get current answers
      const currentAnswers = localStore.getQuery(api.studentAnswers.getAnswers, { studentId, selectionPeriodId }) ?? []

      // Build map of existing answers by questionId
      const answersMap = new Map(currentAnswers.map(a => [a.questionId, a]))

      // Add/update with new answers
      for (const answer of answers) {
        const existing = answersMap.get(answer.questionId)
        const rawAnswer = answer.kind === "boolean"
          ? { kind: "boolean" as const, value: answer.value as boolean }
          : { kind: "0to10" as const, value: answer.value as number }

        answersMap.set(answer.questionId, {
          _id: existing?._id ?? crypto.randomUUID() as Id<"studentAnswers">,
          _creationTime: existing?._creationTime ?? Date.now(),
          studentId,
          selectionPeriodId,
          questionId: answer.questionId,
          rawAnswer,
          normalizedAnswer: answer.kind === "boolean" ? (answer.value ? 1 : 0) : (answer.value as number) / 10,
          answeredAt: Date.now()
        })
      }

      // Set optimistic result
      localStore.setQuery(
        api.studentAnswers.getAnswers,
        { studentId, selectionPeriodId },
        Array.from(answersMap.values())
      )
    }
  )

  // Track questionnaire completion for optimistic UI
  const questionnaireCompleted$ = React.useMemo(() => signal(false), [])

  // Wrap mutation to match expected signature (fire and forget - no await needed)
  const saveAnswers = React.useCallback((args: Parameters<typeof saveAnswersMutation>[0]) => {
    saveAnswersMutation(args).catch(err => console.error("Failed to save answer:", err))
    return Promise.resolve()
  }, [saveAnswersMutation])

  // Create questionnaire VM - computed so it updates when period changes
  const questionnaireVM$ = React.useMemo(() => {
    return computed(() => {
      const period = currentPeriod$.value
      if (!period || !initialStudentId) return null

      return createStudentQuestionPresentationVM({
        studentId: initialStudentId,
        selectionPeriodId: period._id,
        questions$: periodQuestions$,
        existingAnswers$: existingAnswers$,
        saveAnswers,
        onComplete: () => {
          questionnaireCompleted$.value = true
        }
      })
    })
  }, [periodQuestions$, existingAnswers$, saveAnswers, initialStudentId, currentPeriod$, questionnaireCompleted$])

  // Create VM once
  const vm = React.useMemo(
    () => createStudentSelectionPageVM({
      topics$,
      preferences$,
      currentPeriod$,
      periodQuestions$,
      hasCompletedQuestionnaire$,
      savePreferences: savePreferencesMutation,
      initialStudentId,
      questionnaireVM$
    }),
    [topics$, preferences$, currentPeriod$, periodQuestions$, hasCompletedQuestionnaire$, savePreferencesMutation, initialStudentId, questionnaireVM$]
  )

  // Redirect if no student ID
  React.useEffect(() => {
    if (!vm.studentId$.value) {
      router.push("/student")
    }
  }, [vm.studentId$.value, router])

  return vm
}

/**
 * Student Selection Page Route
 */
export default function SelectTopics() {
  const vm = useStudentSelectionPageVM()
  return <StudentSelectionPage vm={vm} />
}
