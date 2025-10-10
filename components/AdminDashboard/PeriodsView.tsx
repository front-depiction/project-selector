"use client"

import * as React from "react"
import * as AD from "./index"
import * as SelectionPeriod from "@/convex/schemas/SelectionPeriod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import SelectionPeriodForm, { SelectionPeriodFormValues } from "@/components/forms/selection-period-form"

// ============================================================================
// PERIODS VIEW - Clean table-based layout
// ============================================================================

export const PeriodsView: React.FC = () => {
  const { currentPeriod, createPeriod, updatePeriod, assignments } = AD.useDashboard()
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [editingPeriod, setEditingPeriod] = React.useState<AD.SelectionPeriodWithStats | null>(null)

  const handleCreatePeriod = async (values: SelectionPeriodFormValues) => {
    await createPeriod({
      title: values.title,
      description: values.title,
      semesterId: values.selection_period_id,
      openDate: values.start_deadline,
      closeDate: values.end_deadline,
      setAsActive: values.isActive
    })
    setIsCreateOpen(false)
  }

  const handleUpdatePeriod = async (values: SelectionPeriodFormValues) => {
    if (!editingPeriod?._id) return
    await updatePeriod(editingPeriod._id, {
      title: values.title,
      description: values.title,
      semesterId: values.selection_period_id,
      openDate: values.start_deadline,
      closeDate: values.end_deadline
    })
    setEditingPeriod(null)
  }

  return (
    <div className="space-y-6">
      {/* Assignment Results - Clean data table format */}
      {currentPeriod && SelectionPeriod.isAssigned(currentPeriod) && assignments && assignments.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Assignment Results</CardTitle>
            <CardDescription>Students have been assigned to topics for {currentPeriod.title}</CardDescription>
          </CardHeader>
          <CardContent>
            <AD.AssignmentTable />
          </CardContent>
        </Card>
      )}

      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Selection Periods</h2>
          <p className="text-muted-foreground mt-1">Manage when students can select topics</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Create Period
        </Button>
      </div>

      {/* Selection Periods Table - Clean table format */}
      <AD.PeriodsTable onEdit={setEditingPeriod} />

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Selection Period</DialogTitle>
            <DialogDescription>
              Create a new selection period for students to choose topics.
            </DialogDescription>
          </DialogHeader>
          <SelectionPeriodForm onSubmit={handleCreatePeriod} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingPeriod} onOpenChange={(open) => !open && setEditingPeriod(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Selection Period</DialogTitle>
            <DialogDescription>
              Update the details of this selection period.
            </DialogDescription>
          </DialogHeader>
          {editingPeriod && (
            <SelectionPeriodForm
              initialValues={{
                title: editingPeriod.title,
                selection_period_id: editingPeriod.semesterId,
                start_deadline: new Date(editingPeriod.openDate),
                end_deadline: new Date(editingPeriod.closeDate),
                isActive: SelectionPeriod.isOpen(editingPeriod)
              }}
              onSubmit={handleUpdatePeriod}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}