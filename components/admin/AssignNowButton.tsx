"use client"

import * as React from "react"
import { useSignals } from "@preact/signals-react/runtime"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Id } from "@/convex/_generated/dataModel"
import { Loader2, PlayCircle } from "lucide-react"
import { useAssignNowButtonVM } from "./AssignNowButtonVM"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import * as AD from "@/components/AdminDashboard"

interface AssignNowButtonProps {
  periodId: Id<"selectionPeriods">
  status?: "open" | "closed" | "assigned"
  disabled?: boolean
}

export function AssignNowButton({ periodId, status, disabled }: AssignNowButtonProps) {
  useSignals()
  const vm = useAssignNowButtonVM(periodId)
  const [showIncompleteAlert, setShowIncompleteAlert] = React.useState(false)

  // Get dashboard context for navigation
  const { setActiveView } = AD.useDashboard()

  // Check if all questionnaires are complete
  const readyForAssignment = useQuery(
    api.periodStudentAccessCodes.batchCheckPeriodsReadyForAssignment,
    { periodIds: [periodId] }
  )?.[periodId] ?? false

  const isAssigned = status === "assigned"
  // Can assign if status is "closed" (period is closed but not yet assigned)
  const canAssign = status === "closed" || status === "open"
  const isDisabled = disabled || isAssigned || !canAssign || vm.isLoading$.value

  const handleClick = () => {
    // Check if questionnaires are complete before assigning
    if (!readyForAssignment) {
      setShowIncompleteAlert(true)
      return
    }
    vm.assignTopics()
  }

  const handleGoToStudents = () => {
    setShowIncompleteAlert(false)
    setActiveView("students")
  }

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={isDisabled}
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-md"
      >
        {vm.isLoading$.value ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isAssigned ? (
          <PlayCircle className="h-4 w-4 opacity-40" />
        ) : (
          <PlayCircle className="h-4 w-4" />
        )}
      </Button>

      <AlertDialog open={showIncompleteAlert} onOpenChange={setShowIncompleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Questionnaires Incomplete</AlertDialogTitle>
            <AlertDialogDescription>
              Not all students have completed their questionnaires. Please ensure all students complete their questionnaires before assigning groups.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleGoToStudents}>
              Go to Students Page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
