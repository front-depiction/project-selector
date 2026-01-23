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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { Doc, Id } from "@/convex/_generated/dataModel"
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
  const [showSettingsDialog, setShowSettingsDialog] = React.useState(false)
  const [topicSizes, setTopicSizes] = React.useState<Record<string, number>>({})
  const [rankingPercentage, setRankingPercentage] = React.useState(50)
  const [maxTimeSeconds, setMaxTimeSeconds] = React.useState(60)

  // Get dashboard context for navigation
  const { setActiveView } = AD.useDashboard()

  // Check if all questionnaires are complete
  const readyForAssignment = useQuery(
    api.periodStudentAccessCodes.batchCheckPeriodsReadyForAssignment,
    { periodIds: [periodId] }
  )?.[periodId] ?? false

  const assignmentSetup = useQuery(
    api.assignments.getAssignmentSetup,
    showSettingsDialog ? { periodId } : "skip"
  )

  const isAssigned = status === "assigned"
  // Allow re-assignment even after a successful assignment.
  const canAssign = status === "closed" || status === "open" || status === "assigned"
  const isDisabled = disabled || !canAssign || vm.isLoading$.value

  const handleClick = () => {
    // Check if questionnaires are complete before assigning
    if (!readyForAssignment) {
      setShowIncompleteAlert(true)
      return
    }
    setShowSettingsDialog(true)
  }

  const handleGoToStudents = () => {
    setShowIncompleteAlert(false)
    setActiveView("students")
  }

  type Topic = Doc<"topics">
  const topics = (assignmentSetup?.topics ?? []) as Topic[]
  const studentCount = assignmentSetup?.studentCount ?? 0
  const rankingsEnabled = assignmentSetup?.rankingsEnabled ?? true

  React.useEffect(() => {
    if (!showSettingsDialog || !assignmentSetup || topics.length === 0) return

    const currentIds = new Set(Object.keys(topicSizes))
    const newIds = new Set(topics.map(topic => topic._id))
    const shouldInitialize = currentIds.size === 0 || currentIds.size !== newIds.size

    if (!shouldInitialize) return

    const numTopics = topics.length
    const baseSize = numTopics > 0 ? Math.floor(studentCount / numTopics) : 0
    let remainder = numTopics > 0 ? studentCount % numTopics : 0
    const nextSizes: Record<string, number> = {}
    topics.forEach(topic => {
      nextSizes[topic._id] = baseSize + (remainder-- > 0 ? 1 : 0)
    })
    setTopicSizes(nextSizes)
  }, [assignmentSetup, showSettingsDialog, topics, studentCount, topicSizes])

  const totalSize = topics.reduce((sum, topic) => sum + (topicSizes[topic._id] ?? 0), 0)
  const sizeMismatch = topics.length > 0 && totalSize !== studentCount
  const canSubmit = topics.length > 0 && !sizeMismatch && !vm.isLoading$.value

  const handleSubmit = () => {
    if (!canSubmit) return
    const groupSizes = topics.map(topic => ({
      topicId: topic._id as Id<"topics">,
      size: topicSizes[topic._id] ?? 0
    }))
    vm.assignTopics({
      ...(rankingsEnabled ? { rankingPercentage } : {}),
      maxTimeInSeconds: maxTimeSeconds,
      groupSizes
    })
    setShowSettingsDialog(false)
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

      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-h-[70vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assignment Settings</DialogTitle>
            <DialogDescription>
              Review topic sizes and solver settings before running assignment.
            </DialogDescription>
          </DialogHeader>

          {topics.length === 0 ? (
            <div className="text-sm text-muted-foreground">No active topics available for this period.</div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Topic sizes</h3>
                  <span className={sizeMismatch ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
                    Total: {totalSize} / {studentCount}
                  </span>
                </div>
                <div className="space-y-2">
                  {topics.map(topic => (
                    <div key={topic._id} className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{topic.title}</div>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={topicSizes[topic._id] ?? 0}
                        onChange={(event) => {
                          const nextValue = event.target.value === "" ? 0 : Number(event.target.value)
                          if (Number.isNaN(nextValue)) return
                          setTopicSizes((prev) => ({ ...prev, [topic._id]: Math.max(0, Math.floor(nextValue)) }))
                        }}
                        className="w-24"
                      />
                    </div>
                  ))}
                </div>
                {sizeMismatch && (
                  <div className="text-xs text-destructive">
                    Group sizes must sum to the number of students.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Ranking weight</Label>
                <RadioGroup
                  value={String(rankingPercentage)}
                  onValueChange={(value) => setRankingPercentage(Number(value))}
                  className="flex flex-wrap gap-4"
                  disabled={!rankingsEnabled}
                >
                  {[
                    { value: "33", label: "33%" },
                    { value: "50", label: "50%" },
                    { value: "75", label: "75%" }
                  ].map(option => (
                    <div key={option.value} className="flex items-center gap-2">
                      <RadioGroupItem value={option.value} id={`ranking-${option.value}`} disabled={!rankingsEnabled} />
                      <Label htmlFor={`ranking-${option.value}`}>{option.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
                {!rankingsEnabled && (
                  <div className="text-xs text-muted-foreground">
                    Rankings are disabled for this assignment.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-time-seconds">Max solver time (seconds)</Label>
                <Input
                  id="max-time-seconds"
                  type="number"
                  min={15}
                  max={540}
                  step={5}
                  value={maxTimeSeconds}
                  onChange={(event) => {
                    const nextValue = event.target.value === "" ? 15 : Number(event.target.value)
                    if (Number.isNaN(nextValue)) return
                    const clamped = Math.min(Math.max(Math.floor(nextValue), 15), 540)
                    setMaxTimeSeconds(clamped)
                  }}
                  className="w-40"
                />
                <div className="text-xs text-muted-foreground">15 seconds minimum, 9 minutes maximum.</div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              Run Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
