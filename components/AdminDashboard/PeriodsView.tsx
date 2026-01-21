"use client"

import * as React from "react"
import * as AD from "./index"
import * as Option from "effect/Option"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Edit, Power, Trash2, MoreVertical, Key, Users } from "lucide-react"
import SelectionPeriodForm from "@/components/forms/selection-period-form"
import type { TopicOption, CategoryOption } from "@/components/forms/selection-period-form"
import { PeriodStudentAllowListManager } from "@/components/admin/PeriodStudentAllowListManager"
import { AssignmentDisplay } from "@/components/AssignmentDisplay"
import { AssignNowButton } from "@/components/admin/AssignNowButton"
import type { PeriodsViewVM } from "./PeriodsViewVM"
import type { Id } from "@/convex/_generated/dataModel"
import { useSignals } from "@preact/signals-react/runtime"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import * as SelectionPeriod from "@/convex/schemas/SelectionPeriod"

// Helper component to avoid IIFE signal reactivity issues
const EditPeriodFormWrapper: React.FC<{
  editingPeriod: any
  topics: readonly TopicOption[]
  categories: readonly CategoryOption[]
  existingTopicIds: readonly string[]
  existingMinimizeCategoryIds: readonly string[]
  updatePeriod: PeriodsViewVM["updatePeriod"]
  closeDialog: () => void
}> = ({ editingPeriod, topics, categories, existingTopicIds, existingMinimizeCategoryIds, updatePeriod, closeDialog }) => {
  const handleSubmit = async (values: any) => {
    await updatePeriod({
      periodId: editingPeriod._id,
      title: values.title,
      description: values.description,
      openDate: values.start_deadline.getTime(),
      closeDate: values.end_deadline.getTime(),
      minimizeCategoryIds: values.minimizeCategoryIds,
    })
    closeDialog()
  }

  return (
    <SelectionPeriodForm
      topics={topics}
      categories={categories}
      initialValues={{
        title: editingPeriod.title,
        selection_period_id: editingPeriod.semesterId,
        start_deadline: new Date(editingPeriod.openDate),
        end_deadline: new Date(editingPeriod.closeDate),
        topicIds: [...existingTopicIds],
        minimizeCategoryIds: [...existingMinimizeCategoryIds],
        rankingsEnabled: editingPeriod.rankingsEnabled ?? true,
      }}
      onSubmit={handleSubmit}
    />
  )
}

// ============================================================================
// PERIODS VIEW - Clean table-based layout using View Model
// ============================================================================

export const PeriodsView: React.FC<{ vm: PeriodsViewVM }> = ({ vm }) => {
  useSignals()

  // Topics are computed in the VM based on semesterId

  // Fetch names status and questionnaire completion status for all periods using batch queries
  const periods = vm.periods$.value
  const periodIds = periods.map(p => p.key as Id<"selectionPeriods">)

  const namesStatusMap = useQuery(
    api.periodStudentAccessCodes.batchCheckPeriodsNeedNames,
    periodIds.length > 0 ? { periodIds } : "skip"
  ) ?? {}

  const readyForAssignmentMap = useQuery(
    api.periodStudentAccessCodes.batchCheckPeriodsReadyForAssignment,
    periodIds.length > 0 ? { periodIds } : "skip"
  ) ?? {}

  // Local state for managing access codes dialog
  const [accessCodesDialogOpen, setAccessCodesDialogOpen] = React.useState(false)
  const [selectedPeriodForCodes, setSelectedPeriodForCodes] = React.useState<{
    id: Id<"selectionPeriods">
    title: string
  } | null>(null)

  const handleManageAccessCodes = (periodId: Id<"selectionPeriods">, periodTitle: string) => {
    setSelectedPeriodForCodes({ id: periodId, title: periodTitle })
    setAccessCodesDialogOpen(true)
  }

  // Local state for managing assignment groups dialog
  const [assignmentsDialogOpen, setAssignmentsDialogOpen] = React.useState(false)
  const [selectedPeriodForAssignments, setSelectedPeriodForAssignments] = React.useState<{
    id: Id<"selectionPeriods">
    title: string
  } | null>(null)

  const handleViewGroups = (periodId: Id<"selectionPeriods">, periodTitle: string) => {
    setSelectedPeriodForAssignments({ id: periodId, title: periodTitle })
    setAssignmentsDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Project Assignments</h2>
          <p className="text-muted-foreground mt-1">Manage project assignment periods for student topic selection</p>
        </div>
        <Button onClick={vm.createDialog.open} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Create Project Assignment
        </Button>
      </div>

      {/* Project Assignments Table - Clean table format */}
      {vm.periods$.value.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>No Project Assignments</CardTitle>
            <CardDescription>Create your first project assignment to get started.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Open Date</TableHead>
                <TableHead className="text-center">Close Date</TableHead>
                <TableHead className="text-center">Students</TableHead>
                <TableHead className="text-center">Assign</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vm.periods$.value.map((period) => {
                const needsNames = namesStatusMap[period.key] ?? false
                const readyForAssignment = readyForAssignmentMap[period.key] ?? false
                const isOpenOrClosed = period.statusDisplay === "Open" || period.statusDisplay === "Closed"

                // Override status if all questionnaires are complete
                let statusDisplay = period.statusDisplay
                let statusColor = period.statusColor
                if (isOpenOrClosed && readyForAssignment) {
                  statusDisplay = "Ready for Assignment"
                  statusColor = "bg-blue-600 text-white"
                }

                return (
                  <TableRow key={period.key}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{period.title}</span>
                        {needsNames && (
                          <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
                            Names Needed
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={statusColor}>
                        {statusDisplay}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{period.openDateDisplay}</TableCell>
                    <TableCell className="text-center">{period.closeDateDisplay}</TableCell>
                    <TableCell className="text-center">{period.studentCountDisplay}</TableCell>
                    <TableCell className="text-center">
                      <AssignNowButton
                        periodId={period.key as Id<"selectionPeriods">}
                        status={(statusDisplay === "Ready for Assignment" ? "open" : statusDisplay.toLowerCase()) as "open" | "closed" | "assigned"}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={period.onEdit}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleManageAccessCodes(period.key as Id<"selectionPeriods">, period.title)}>
                            <Key className="mr-2 h-4 w-4" />
                            Manage Access Codes
                          </DropdownMenuItem>
                          {period.statusDisplay === "Assigned" && (
                            <DropdownMenuItem onClick={() => handleViewGroups(period.key as Id<"selectionPeriods">, period.title)}>
                              <Users className="mr-2 h-4 w-4" />
                              View Groups
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={period.onDelete}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={vm.createDialog.isOpen$.value} onOpenChange={(open) => !open && vm.createDialog.close()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Project Assignment</DialogTitle>
            <DialogDescription>
              {Option.isSome(vm.createdPeriod$.value)
                ? "Generate access codes for students to participate in this project assignment."
                : "Create a new project assignment period for students to choose topics."}
            </DialogDescription>
          </DialogHeader>
          {Option.isSome(vm.createdPeriod$.value) ? (
            <div className="space-y-4">
              <PeriodStudentAllowListManager
                selectionPeriodId={vm.createdPeriod$.value.value.id}
                periodTitle={vm.createdPeriod$.value.value.title}
              />
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={vm.finishCreation}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <SelectionPeriodForm
              topics={vm.topics$.value}
              categories={vm.categories$.value}
              onSubmit={vm.onCreateSubmit}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={vm.editDialog.isOpen$.value} onOpenChange={(open) => !open && vm.editDialog.close()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Project Assignment</DialogTitle>
            <DialogDescription>
              Update the details of this project assignment.
            </DialogDescription>
          </DialogHeader>
          {Option.isSome(vm.editDialog.editingPeriod$.value) && (
            <EditPeriodFormWrapper
              editingPeriod={vm.editDialog.editingPeriod$.value.value}
              topics={vm.topics$.value}
              categories={vm.categories$.value}
              existingTopicIds={vm.existingTopicIds$.value}
              existingMinimizeCategoryIds={vm.existingMinimizeCategoryIds$.value}
              updatePeriod={vm.updatePeriod}
              closeDialog={vm.editDialog.close}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Access Codes Dialog */}
      <Dialog open={accessCodesDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setAccessCodesDialogOpen(false)
          setSelectedPeriodForCodes(null)
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Access Codes</DialogTitle>
            <DialogDescription>
              Generate and manage access codes for {selectedPeriodForCodes?.title || "this project assignment"}
            </DialogDescription>
          </DialogHeader>
          {selectedPeriodForCodes && (
            <PeriodStudentAllowListManager
              selectionPeriodId={selectedPeriodForCodes.id}
              periodTitle={selectedPeriodForCodes.title}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Assignment Groups Dialog */}
      <Dialog open={assignmentsDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setAssignmentsDialogOpen(false)
          setSelectedPeriodForAssignments(null)
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assignment Groups</DialogTitle>
            <DialogDescription>
              View formed groups for {selectedPeriodForAssignments?.title || "this project assignment"}
            </DialogDescription>
          </DialogHeader>
          {selectedPeriodForAssignments && (
            <AssignmentDisplay
              periodId={selectedPeriodForAssignments.id}
              showFullQualityNames={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
