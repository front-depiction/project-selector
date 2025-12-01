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
import { Plus, Edit, Power, Trash2, MoreVertical } from "lucide-react"
import SelectionPeriodForm from "@/components/forms/selection-period-form"
import type { PeriodsViewVM } from "./PeriodsViewVM"
import { useSignals } from "@preact/signals-react/runtime"

// ============================================================================
// PERIODS VIEW - Clean table-based layout using View Model
// ============================================================================

export const PeriodsView: React.FC<{ vm: PeriodsViewVM }> = ({ vm }) => {
  useSignals()

  return (
    <div className="space-y-6">
      {/* Assignment Results - Clean data table format */}
      {vm.showAssignmentResults$.value && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Assignment Results</CardTitle>
            <CardDescription>
              Students have been assigned to topics for {Option.match(vm.currentPeriod$.value, {
                onNone: () => "Unknown Period",
                onSome: (period) => period.title
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-sm">
                  Total Assignments: {vm.assignments$.value.length}
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
                    {vm.assignments$.value.map((assignment) => (
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
      {vm.periods$.value.length === 0 ? (
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
              {vm.periods$.value.map((period) => (
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
      <Dialog open={vm.createDialog.isOpen$.value} onOpenChange={(open) => open ? vm.createDialog.open() : vm.createDialog.close()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Selection Period</DialogTitle>
            <DialogDescription>
              Create a new selection period for students to choose topics.
            </DialogDescription>
          </DialogHeader>
          <SelectionPeriodForm
            questions={vm.questions$.value}
            templates={vm.templates$.value}
            onSubmit={vm.onCreateSubmit}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={vm.editDialog.isOpen$.value} onOpenChange={(open) => open ? vm.editDialog.open() : vm.editDialog.close()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Selection Period</DialogTitle>
            <DialogDescription>
              Update the details of this selection period.
            </DialogDescription>
          </DialogHeader>
          {Option.isSome(vm.editDialog.editingPeriod$.value) && (
            <SelectionPeriodForm
              questions={vm.questions$.value}
              templates={vm.templates$.value}
              initialValues={{
                title: vm.editDialog.editingPeriod$.value.value.title,
                selection_period_id: vm.editDialog.editingPeriod$.value.value.semesterId,
                start_deadline: new Date(vm.editDialog.editingPeriod$.value.value.openDate),
                end_deadline: new Date(vm.editDialog.editingPeriod$.value.value.closeDate),
                isActive: vm.editDialog.editingPeriod$.value.value.kind === "open",
                questionIds: [...vm.existingQuestionIds$.value],
              }}
              onSubmit={vm.onEditSubmit}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
