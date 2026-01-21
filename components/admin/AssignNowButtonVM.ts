"use client"
import * as React from "react"
import { signal, ReadonlySignal } from "@preact/signals-react"
import { useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { toast } from "sonner"

// ============================================================================
// View Model Types
// ============================================================================

export interface AssignNowButtonVM {
  readonly isLoading$: ReadonlySignal<boolean>
  readonly assignTopics: (settings: AssignNowSettings) => void
}

export interface AssignNowSettings {
  readonly rankingPercentage?: number
  readonly maxTimeInSeconds: number
  readonly groupSizes: Array<{ topicId: Id<"topics">; size: number }>
}

// ============================================================================
// Hook - uses Convex as reactive primitive directly
// ============================================================================

export function useAssignNowButtonVM(periodId: Id<"selectionPeriods">): AssignNowButtonVM {
  // Reactive state - stable signal created once per component lifecycle
  const isLoading$ = React.useMemo(() => signal(false), [])

  // CP-SAT action for assignment
  const assignWithCPSATAction = useAction(api.assignWithCPSAT.assignWithCPSAT)

  // Action: assign topics using CP-SAT solver
  const assignTopics = (settings: AssignNowSettings): void => {
    if (isLoading$.value) return

    isLoading$.value = true
    
    // Call CP-SAT solver - errors will show as toast
    assignWithCPSATAction({ periodId, settings })
      .then(() => {
        isLoading$.value = false
        toast.success("Students assigned successfully!")
      })
      .catch((error) => {
        console.error("CP-SAT assignment failed:", error)
        isLoading$.value = false
        toast.error("Assignment failed: " + (error?.message || "Unknown error. Please check that the CP-SAT service is running."))
      })
  }

  return {
    isLoading$,
    assignTopics,
  }
}
