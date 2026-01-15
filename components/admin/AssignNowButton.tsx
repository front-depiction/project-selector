"use client"

import { useSignals } from "@preact/signals-react/runtime"
import { Button } from "@/components/ui/button"
import { Id } from "@/convex/_generated/dataModel"
import { Loader2, PlayCircle } from "lucide-react"
import { useAssignNowButtonVM } from "./AssignNowButtonVM"

interface AssignNowButtonProps {
  periodId: Id<"selectionPeriods">
  status?: "open" | "closed" | "assigned"
  disabled?: boolean
}

export function AssignNowButton({ periodId, status, disabled }: AssignNowButtonProps) {
  useSignals()
  const vm = useAssignNowButtonVM(periodId)

  // Can assign if status is "closed" (period is closed but not yet assigned)
  const canAssign = status === "closed" || status === "open"
  const isDisabled = disabled || !canAssign || status === "assigned" || vm.isLoading$.value

  return (
    <Button
      onClick={vm.assignTopics}
      disabled={isDisabled}
      variant="outline"
      className="min-w-[120px]"
    >
      {vm.isLoading$.value ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Assigning...
        </>
      ) : status === "assigned" ? (
        "Already Assigned"
      ) : (
        <>
          <PlayCircle className="mr-2 h-4 w-4" />
          Assign Now
        </>
      )}
    </Button>
  )
}
