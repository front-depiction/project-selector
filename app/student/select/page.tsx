"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { signal, batch } from "@preact/signals-react"
import { createStudentSelectionPageVM } from "@/components/StudentSelection/StudentSelectionPageVM"
import { StudentSelectionPage } from "@/components/StudentSelection/StudentSelectionPage"

/**
 * Student Selection Page Route
 *
 * This page component:
 * 1. Fetches data using Convex hooks
 * 2. Wraps data in signals for reactivity
 * 3. Creates the ViewModel using the factory with signal deps
 * 4. Handles redirect logic when no student ID is present
 * 5. Renders the view component with the ViewModel
 *
 * All business logic is contained in the ViewModel factory.
 */
export default function SelectTopics() {
  const router = useRouter()

  // Initialize student ID from localStorage
  const initialStudentId = typeof window !== "undefined" ? localStorage.getItem("studentId") || "" : ""

  // Convex queries - reactive data layer
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

  // Convex mutation with optimistic update
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

  // Wrap Convex data in signals - memoized to create once
  const dataSignals = useMemo(() => ({
    topics$: signal(topics),
    preferences$: signal(preferences),
    currentPeriod$: signal(currentPeriod),
    periodQuestions$: signal(periodQuestions),
    hasCompletedQuestionnaire$: signal(hasCompletedQuestionnaire)
  }), [])

  // Update signal values when data changes (batched to avoid render issues)
  batch(() => {
    dataSignals.topics$.value = topics
    dataSignals.preferences$.value = preferences
    dataSignals.currentPeriod$.value = currentPeriod
    dataSignals.periodQuestions$.value = periodQuestions
    dataSignals.hasCompletedQuestionnaire$.value = hasCompletedQuestionnaire
  })

  // Create VM using factory - created once
  const vm = useMemo(
    () =>
      createStudentSelectionPageVM({
        ...dataSignals,
        savePreferences: savePreferencesMutation,
        initialStudentId
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savePreferencesMutation, initialStudentId]
  )

  // Redirect if no student ID (side effect in page component)
  useEffect(() => {
    if (!vm.studentId$.value) {
      router.push("/student")
    }
  }, [vm.studentId$.value, router])

  return <StudentSelectionPage vm={vm} />
}
