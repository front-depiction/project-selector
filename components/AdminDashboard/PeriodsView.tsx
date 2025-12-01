"use client"

import * as React from "react"
import * as AD from "./index"
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
import { Plus, Edit, Power, Trash2, MoreVertical } from "lucide-react"
import SelectionPeriodForm from "@/components/forms/selection-period-form"
import { usePeriodsViewVM } from "./PeriodsViewVM"
import { useSignal } from "@preact/signals-react/runtime"

// ============================================================================
// PERIODS VIEW - Clean table-based layout using View Model
// ============================================================================

export const PeriodsView: React.FC = () => {
  const vm = usePeriodsViewVM()

  // Subscribe to reactive signals
  const currentPeriod = vm.currentPeriod$.value
  const assignments = vm.assignments$.value
  const showAssignmentResults = vm.showAssignmentResults$.value
  const periods = vm.periods$.value
  const questions = vm.questions$.value
  const templates = vm.templates$.value
  const existingQuestionIds = vm.existingQuestionIds$.value
  const isCreateOpen = vm.createDialog.isOpen$.value
  const isEditOpen = vm.editDialog.isOpen$.value
  const editingPeriod = vm.editDialog.editingPeriod$.value

  return (
    <div className="space-y-6">
      {/* Assignment Results - Clean data table format */}
      {showAssignmentResults && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Assignment Results</CardTitle>
            <CardDescription>
              Students have been assigned to topics for {currentPeriod?.title}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-sm">
                  Total Assignments: {assignments.length}
                </Badge>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Assigned Topic</TableHead>
                      <TableHead>Preference Match</TableHead>
                      <TableHead>Rank</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.key}>
                        <TableCell className="font-medium">{assignment.studentId}</TableCell>
                        <TableCell>{assignment.topicTitle}</TableCell>
                        <TableCell>
                          {assignment.isMatched ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              ✓ Matched
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              Alternative
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={assignment.rankBadgeVariant}>
                            #{assignment.preferenceRank}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-purple-600 text-white">
                            {assignment.statusDisplay}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Selection Periods</h2>
          <p className="text-muted-foreground mt-1">Manage when students can select topics</p>
        </div>
        <Button onClick={vm.createDialog.open} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Create Period
        </Button>
      </div>

      {/* Selection Periods Table - Clean table format */}
      {periods.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>No Selection Periods</CardTitle>
            <CardDescription>Create your first selection period to get started.</CardDescription>
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
              {periods.map((period) => (
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
                        {period.canSetActive && (
                          <DropdownMenuItem onClick={period.onSetActive}>
                            <Power className="mr-2 h-4 w-4" />
                            Set Active
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => open ? vm.createDialog.open() : vm.createDialog.close()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Selection Period</DialogTitle>
            <DialogDescription>
              Create a new selection period for students to choose topics.
            </DialogDescription>
          </DialogHeader>
          <SelectionPeriodForm
            questions={questions}
            templates={templates}
            onSubmit={vm.onCreateSubmit}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => open ? vm.editDialog.open() : vm.editDialog.close()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Selection Period</DialogTitle>
            <DialogDescription>
              Update the details of this selection period.
            </DialogDescription>
          </DialogHeader>
          {editingPeriod && (
            <SelectionPeriodForm
              questions={questions}
              templates={templates}
              initialValues={{
                title: editingPeriod.title,
                selection_period_id: editingPeriod.semesterId,
                start_deadline: new Date(editingPeriod.openDate),
                end_deadline: new Date(editingPeriod.closeDate),
                isActive: editingPeriod.kind === "open",
                questionIds: [...existingQuestionIds],
              }}
              onSubmit={vm.onEditSubmit}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
