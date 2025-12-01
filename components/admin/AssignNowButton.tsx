"use client"

import { useSignals } from "@preact/signals-react/runtime"
import { Button } from "@/components/ui/button"
import { Id } from "@/convex/_generated/dataModel"
import { Loader2, PlayCircle } from "lucide-react"
import { useAssignNowButtonVM } from "./AssignNowButtonVM"

interface AssignNowButtonProps {
  periodId: Id<"selectionPeriods">
  status?: "open" | "assigned"
  disabled?: boolean
}

export function AssignNowButton({ periodId, status, disabled }: AssignNowButtonProps) {
  useSignals()
  const vm = useAssignNowButtonVM(periodId)

  const isDisabled = disabled || status !== "open" || vm.isLoading$.value

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
