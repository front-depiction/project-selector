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
import { Plus, Edit, Power, Trash2, MoreVertical, Key, PlayCircle, Users } from "lucide-react"
import SelectionPeriodForm from "@/components/forms/selection-period-form"
import { PeriodStudentAllowListManager } from "@/components/admin/PeriodStudentAllowListManager"
import { useAssignNowButtonVM } from "@/components/admin/AssignNowButtonVM"
import type { PeriodsViewVM } from "./PeriodsViewVM"
import type { Id } from "@/convex/_generated/dataModel"
import { useSignals } from "@preact/signals-react/runtime"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import * as SelectionPeriod from "@/convex/schemas/SelectionPeriod"

// Component for Assign Now menu item
const AssignNowMenuItem: React.FC<{ periodId: Id<"selectionPeriods">; status: "open" | "closed" }> = ({ periodId, status }) => {
  useSignals()
  const vm = useAssignNowButtonVM(periodId)
  const canAssign = status === "closed" || status === "open"
  const isDisabled = !canAssign || vm.isLoading$.value

  return (
    <DropdownMenuItem 
      onClick={() => !isDisabled && vm.assignTopics()}
      disabled={isDisabled}
    >
      {vm.isLoading$.value ? (
        <>
          <PlayCircle className="mr-2 h-4 w-4 animate-spin" />
          Assigning...
        </>
      ) : (
        <>
          <PlayCircle className="mr-2 h-4 w-4" />
          Assign Now (CP-SAT)
        </>
      )}
    </DropdownMenuItem>
  )
}

// ============================================================================
// PERIODS VIEW - Clean table-based layout using View Model
// ============================================================================

export const PeriodsView: React.FC<{ vm: PeriodsViewVM }> = ({ vm }) => {
  useSignals()

  // Fetch existing questions for the period being edited
  const existingQuestionsForEdit = useQuery(
    api.selectionQuestions.getQuestionsForPeriod,
    Option.isSome(vm.editDialog.editingPeriod$.value)
      ? { selectionPeriodId: vm.editDialog.editingPeriod$.value.value._id }
      : "skip"
  )

  console.log('[PeriodsView] existingQuestionsForEdit:', existingQuestionsForEdit)

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

  // Fetch assignments for the selected period
  const assignmentsData = useQuery(
    api.assignments.getAssignments,
    selectedPeriodForAssignments ? { periodId: selectedPeriodForAssignments.id } : "skip"
  )

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
                <TableHead>Status</TableHead>
                <TableHead>Open Date</TableHead>
                <TableHead>Close Date</TableHead>
                <TableHead>Students</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vm.periods$.value.map((period) => {
                const periodId = period.key as Id<"selectionPeriods">
                // Get the full period document to check status
                const periodDoc = vm.periodsData$.value?.find(p => p._id === periodId)
                const canAssign = periodDoc && SelectionPeriod.isClosed(periodDoc)
                const isAssigned = periodDoc && SelectionPeriod.isAssigned(periodDoc)
                
                return (
                  <TableRow key={period.key}>
                    <TableCell className="font-medium">{period.title}</TableCell>
                    <TableCell>
                      <Badge className={period.statusColor}>
                        {period.statusDisplay}
                      </Badge>
                    </TableCell>
                    <TableCell>{period.openDateDisplay}</TableCell>
                    <TableCell>{period.closeDateDisplay}</TableCell>
                    <TableCell>{period.studentCountDisplay}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleManageAccessCodes(periodId, period.title)}>
                            <Key className="mr-2 h-4 w-4" />
                            Manage Access Codes
                          </DropdownMenuItem>
                          
                          {canAssign && (
                            <>
                              <DropdownMenuSeparator />
                              <AssignNowMenuItem periodId={periodId} status="closed" />
                            </>
                          )}
                          {periodDoc && SelectionPeriod.isOpen(periodDoc) && (
                            <>
                              <DropdownMenuSeparator />
                              <AssignNowMenuItem periodId={periodId} status="open" />
                            </>
                          )}
                          {isAssigned && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleViewGroups(periodId, period.title)}>
                                <Users className="mr-2 h-4 w-4" />
                                View Groups
                              </DropdownMenuItem>
                            </>
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
              questions={vm.questions$.value}
              templates={vm.templates$.value}
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
          {Option.isSome(vm.editDialog.editingPeriod$.value) && (() => {
            if (existingQuestionsForEdit === undefined) {
              return (
                <div className="flex h-40 items-center justify-center">
                  <div className="text-muted-foreground">Loading questions...</div>
                </div>
              )
            }
            const editingPeriod = vm.editDialog.editingPeriod$.value.value
            const existingQuestionIds = (existingQuestionsForEdit ?? []).map(sq => sq.questionId)
            console.log('[PeriodsView] Rendering edit form with existingQuestionIds:', existingQuestionIds)

            // Create a wrapper submit handler that performs question sync with correct old IDs
            const handleSubmit = async (values: any) => {
              console.log('[PeriodsView] handleSubmit called with:', { values, existingQuestionIds })

              // Update the period
              await vm.updatePeriod({
                periodId: editingPeriod._id,
                title: values.title,
                description: values.title,
                openDate: values.start_deadline.getTime(),
                closeDate: values.end_deadline.getTime(),
              })

              // Sync questions using the correct existing question IDs
              const newQuestionIds = new Set(values.questionIds)
              const oldQuestionIds = new Set(existingQuestionIds)

              console.log('[PeriodsView] Syncing questions:', {
                new: Array.from(newQuestionIds),
                old: Array.from(oldQuestionIds)
              })

              const removePromises = existingQuestionIds
                .filter((qId: string) => !newQuestionIds.has(qId))
                .map((qId: string) => {
                  console.log('[PeriodsView] Removing question:', qId)
                  return vm.removeQuestion({
                    selectionPeriodId: editingPeriod._id,
                    questionId: qId as any,
                  })
                })

              const addPromises = values.questionIds
                .filter((qId: string) => !oldQuestionIds.has(qId as any))
                .map((qId: string) => {
                  console.log('[PeriodsView] Adding question:', qId)
                  return vm.addQuestion({
                    selectionPeriodId: editingPeriod._id,
                    questionId: qId as any,
                  })
                })

              await Promise.all([...removePromises, ...addPromises])

              // Close the dialog
              vm.editDialog.close()
            }

            return (
              <SelectionPeriodForm
                questions={vm.questions$.value}
                templates={vm.templates$.value}
                initialValues={{
                  title: editingPeriod.title,
                  selection_period_id: editingPeriod.semesterId,
                  start_deadline: new Date(editingPeriod.openDate),
                  end_deadline: new Date(editingPeriod.closeDate),
                  questionIds: existingQuestionIds,
                }}
                onSubmit={handleSubmit}
              />
            )
          })()}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assignment Groups</DialogTitle>
            <DialogDescription>
              View formed groups for {selectedPeriodForAssignments?.title || "this project assignment"}
            </DialogDescription>
          </DialogHeader>
          {assignmentsData === undefined ? (
            <div className="flex h-40 items-center justify-center">
              <div className="text-muted-foreground">Loading assignments...</div>
            </div>
          ) : assignmentsData === null ? (
            <div className="flex h-40 items-center justify-center">
              <div className="text-muted-foreground">No assignments found for this period.</div>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(assignmentsData).map(([topicId, groupData]) => (
                <Card key={topicId} className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {groupData.topic?.title || "Unknown Topic"}
                    </CardTitle>
                    {groupData.topic?.description && (
                      <CardDescription>{groupData.topic.description}</CardDescription>
                    )}
                    <div className="mt-2">
                      <Badge variant="outline" className="text-sm">
                        {groupData.students.length} {groupData.students.length === 1 ? "student" : "students"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student ID</TableHead>
                            <TableHead>Preference Rank</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupData.students.map((student, idx) => (
                            <TableRow key={`${student.studentId}-${idx}`}>
                              <TableCell className="font-medium">{student.studentId}</TableCell>
                              <TableCell>
                                {student.originalRank ? (
                                  <Badge variant="outline" className="text-green-600 border-green-600">
                                    #{student.originalRank} Preference
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                                    Alternative
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-purple-600 text-white">
                                  Assigned
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
