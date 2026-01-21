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
import { toast } from "sonner"

/**
 * Hook to create VM with Convex queries - follows LandingPage pattern
 */
function useStudentSelectionPageVM() {
  const router = useRouter()

  // Initialize student ID from localStorage
  const [initialStudentId] = React.useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("studentId") || "" : ""
  )

  // Convex queries - filter topics by student allow-list
  const topics = useQuery(
    api.topics.getActiveTopicsWithMetricsForStudent,
    initialStudentId ? { studentId: initialStudentId } : "skip"
  )
  const preferences = useQuery(
    api.preferences.getPreferences,
    initialStudentId ? { studentId: initialStudentId } : "skip"
  )
  const currentPeriod = useQuery(
    api.periodStudentAccessCodes.getPeriodForAccessCode,
    initialStudentId ? { code: initialStudentId } : "skip"
  )
  
  // Get assignment data if period is assigned
  const myAssignment = useQuery(
    api.assignments.getMyAssignment,
    currentPeriod && initialStudentId && currentPeriod.kind === "assigned"
      ? { periodId: currentPeriod._id, studentId: initialStudentId }
      : "skip"
  )
  
  const allAssignments = useQuery(
    api.assignments.getAssignments,
    currentPeriod && currentPeriod.kind === "assigned"
      ? { periodId: currentPeriod._id }
      : "skip"
  )
  const periodQuestions = useQuery(
    api.selectionQuestions.getQuestionsForPeriod,
    currentPeriod?._id ? { selectionPeriodId: currentPeriod._id } : "skip"
  )
  const existingAnswers = useQuery(
    api.studentAnswers.getAnswers,
    currentPeriod?._id && initialStudentId
      ? { studentId: initialStudentId, selectionPeriodId: currentPeriod._id }
      : "skip"
  )
  
  // Query for edit form (questions with existing answers)
  const questionsWithAnswers = useQuery(
    api.studentAnswers.getQuestionsWithAnswersForStudent,
    currentPeriod?._id && initialStudentId
      ? { studentId: initialStudentId, selectionPeriodId: currentPeriod._id }
      : "skip"
  )

  // Create signals once
  const topics$ = React.useMemo(() => signal(topics), [])
  const preferences$ = React.useMemo(() => signal(preferences), [])
  const currentPeriod$ = React.useMemo(() => signal(currentPeriod), [])
  const periodQuestions$ = React.useMemo(() => signal(periodQuestions), [])
  const existingAnswers$ = React.useMemo(() => signal(existingAnswers), [])
  const questionnaireOpen$ = React.useMemo(() => signal(true), [])

  // Sync signals with query data
  React.useEffect(() => { topics$.value = topics }, [topics, topics$])
  React.useEffect(() => { preferences$.value = preferences }, [preferences, preferences$])
  React.useEffect(() => { currentPeriod$.value = currentPeriod }, [currentPeriod, currentPeriod$])
  React.useEffect(() => { periodQuestions$.value = periodQuestions }, [periodQuestions, periodQuestions$])
  React.useEffect(() => { existingAnswers$.value = existingAnswers }, [existingAnswers, existingAnswers$])

  React.useEffect(() => {
    questionnaireOpen$.value = true
  }, [currentPeriod?._id, questionnaireOpen$])

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
          : { kind: "0to6" as const, value: answer.value as number }

        answersMap.set(answer.questionId, {
          _id: existing?._id ?? crypto.randomUUID() as Id<"studentAnswers">,
          _creationTime: existing?._creationTime ?? Date.now(),
          studentId,
          selectionPeriodId,
          questionId: answer.questionId,
          rawAnswer,
          normalizedAnswer: answer.kind === "boolean" ? (answer.value ? 1 : 0) : (answer.value as number) / 6,
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

  // Wrap mutation to match expected signature (fire and forget - no await needed)
  const saveAnswers = React.useCallback((args: Parameters<typeof saveAnswersMutation>[0]) => {
    saveAnswersMutation(args).catch(err => console.error("Failed to save answer:", err))
    return Promise.resolve()
  }, [saveAnswersMutation])

  const setQuestionnaireOpen = React.useCallback((open: boolean) => {
    questionnaireOpen$.value = open
  }, [questionnaireOpen$])

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
          setQuestionnaireOpen(false)
          
          // For experiment periods, redirect to home with success notification
          if (period.description?.includes("EXCLUSIONS:")) {
            toast.success("Questionnaire completed successfully!", {
              description: "Thank you for completing the questionnaire. Your responses have been saved.",
            })
            // Delay redirect slightly to show the toast
            setTimeout(() => {
              router.push("/")
            }, 500)
          }
        }
      })
    })
  }, [periodQuestions$, existingAnswers$, saveAnswers, initialStudentId, currentPeriod$, setQuestionnaireOpen, router])

  // Create VM once
  const vm = React.useMemo(
    () => createStudentSelectionPageVM({
      topics$,
      preferences$,
      currentPeriod$,
      periodQuestions$,
      existingAnswers$,
      questionnaireOpen$,
      setQuestionnaireOpen,
      savePreferences: savePreferencesMutation,
      initialStudentId,
      questionnaireVM$
    }),
    [topics$, preferences$, currentPeriod$, periodQuestions$, existingAnswers$, questionnaireOpen$, setQuestionnaireOpen, savePreferencesMutation, initialStudentId, questionnaireVM$]
  )

  // Redirect if no student ID
  React.useEffect(() => {
    if (!vm.studentId$.value) {
      router.push("/student")
    }
  }, [vm.studentId$.value, router])

  // Redirect to landing page if period is assigned (to see formed groups)
  React.useEffect(() => {
    if (currentPeriod && currentPeriod.kind === "assigned") {
      router.push("/")
    }
  }, [currentPeriod, router])

  // Redirect to home for experiment periods after questionnaire is completed
  React.useEffect(() => {
    if (currentPeriod && 
        currentPeriod.description?.includes("EXCLUSIONS:") && 
        existingAnswers && existingAnswers.length > 0) {
      router.push("/")
    }
  }, [currentPeriod, existingAnswers, router])

  // State for edit form submission
  const [isSubmittingAnswers, setIsSubmittingAnswers] = React.useState(false)
  
  // Handler for edit form submission
  const handleSaveAnswers = React.useCallback(async (
    answers: Array<{ questionId: Id<"questions">; kind: "boolean" | "0to6"; value: boolean | number }>
  ) => {
    if (!currentPeriod?._id || !initialStudentId) return
    
    setIsSubmittingAnswers(true)
    try {
      await saveAnswersMutation({
        studentId: initialStudentId,
        selectionPeriodId: currentPeriod._id,
        answers
      })
    } catch (error) {
      console.error("Failed to save answers:", error)
    } finally {
      setIsSubmittingAnswers(false)
    }
  }, [currentPeriod?._id, initialStudentId, saveAnswersMutation])

  return { vm, questionsWithAnswers, handleSaveAnswers, isSubmittingAnswers }
}

/**
 * Student Selection Page Route
 */
export default function SelectTopics() {
  const { vm, questionsWithAnswers, handleSaveAnswers, isSubmittingAnswers } = useStudentSelectionPageVM()
  return (
    <StudentSelectionPage 
      vm={vm} 
      questionsWithAnswers={questionsWithAnswers}
      onSaveAnswers={handleSaveAnswers}
      isSubmittingAnswers={isSubmittingAnswers}
    />
  )
}
