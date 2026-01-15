"use client"
import * as React from "react"
import { signal, ReadonlySignal } from "@preact/signals-react"
import { useAction, useMutation } from "convex/react"
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

  // Try CP-SAT action first, fallback to mutation
  const assignWithCPSATAction = useAction(api.assignWithCPSAT.assignWithCPSAT)
  const assignNowMutation = useMutation(api.assignments.assignNow)

  // Action: assign topics (tries CP-SAT, falls back to simple distribution)
  const assignTopics = (): void => {
    if (isLoading$.value) return

    isLoading$.value = true
    
    // Try CP-SAT first, fallback to simple assignment if it fails
    assignWithCPSATAction({ periodId })
      .then(() => {
        isLoading$.value = false
      })
      .catch((error) => {
        console.warn("CP-SAT assignment failed, trying simple distribution:", error)
        // Fallback to simple distribution
        return assignNowMutation({ periodId })
      })
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
