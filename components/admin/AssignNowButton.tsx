"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Id } from "@/convex/_generated/dataModel"
import { Loader2, PlayCircle } from "lucide-react"

interface AssignNowButtonProps {
  periodId: Id<"selectionPeriods">
  status?: "open" | "assigned"
  disabled?: boolean
}

export function AssignNowButton({ periodId, status, disabled }: AssignNowButtonProps) {
  const assignNow = useMutation(api.assignments.assignNow)
  const [loading, setLoading] = useState(false)

  const handleAssign = async () => {
    if (loading) return

    setLoading(true)
    try {
      await assignNow({ periodId })
    } catch (error) {
      console.error("Failed to assign:", error)
    } finally {
      setLoading(false)
    }
  }

  const isDisabled = disabled || status !== "open" || loading

  return (
    <Button
      onClick={handleAssign}
      disabled={isDisabled}
      variant="outline"
      className="min-w-[120px]"
    >
      {loading ? (
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
