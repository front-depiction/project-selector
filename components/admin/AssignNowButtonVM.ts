"use client"
import * as React from "react"
import { signal, ReadonlySignal } from "@preact/signals-react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

// ============================================================================
// View Model Types
// ============================================================================

export interface AssignNowButtonVM {
  readonly isLoading$: ReadonlySignal<boolean>
  readonly assignTopics: () => void
}

// ============================================================================
// Hook - uses Convex as reactive primitive directly
// ============================================================================

export function useAssignNowButtonVM(periodId: Id<"selectionPeriods">): AssignNowButtonVM {
  // Reactive state - stable signal created once per component lifecycle
  const isLoading$ = React.useMemo(() => signal(false), [])

  // Convex mutation
  const assignNowMutation = useMutation(api.assignments.assignNow)

  // Action: assign topics
  const assignTopics = (): void => {
    if (isLoading$.value) return

    isLoading$.value = true
    assignNowMutation({ periodId })
      .then(() => {
        isLoading$.value = false
      })
      .catch((error) => {
        console.error("Failed to assign:", error)
        isLoading$.value = false
      })
  }

  return {
    isLoading$,
    assignTopics,
  }
}
