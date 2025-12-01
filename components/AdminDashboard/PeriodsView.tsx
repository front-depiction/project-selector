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
import SelectionPeriodForm, { SelectionPeriodFormValues, QuestionOption, TemplateOption } from "@/components/forms/selection-period-form"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

// ============================================================================
// PERIODS VIEW - Clean table-based layout
// ============================================================================

export const PeriodsView: React.FC = () => {
  const { currentPeriod, createPeriod, updatePeriod, assignments } = AD.useDashboard()
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [editingPeriod, setEditingPeriod] = React.useState<AD.SelectionPeriodWithStats | null>(null)

  // Fetch questions and templates for the form
  const questionsData = useQuery(api.questions.getAllQuestions, {})
  const templatesData = useQuery(api.questionTemplates.getAllTemplatesWithQuestionIds, {})
  const existingQuestionsData = useQuery(
    api.selectionQuestions.getQuestionsForPeriod,
    editingPeriod?._id ? { selectionPeriodId: editingPeriod._id } : "skip"
  )

  // Mutations for linking questions
  const addQuestion = useMutation(api.selectionQuestions.addQuestion)
  const removeQuestion = useMutation(api.selectionQuestions.removeQuestion)

  // Transform data for form props
  const questions: QuestionOption[] = React.useMemo(() =>
    (questionsData ?? []).map(q => ({
      id: q._id,
      questionText: q.question,
      kindDisplay: q.kind === "boolean" ? "Yes/No" : "0-10",
      kindVariant: q.kind === "boolean" ? "secondary" : "outline" as const,
    })),
    [questionsData]
  )

  const templates: TemplateOption[] = React.useMemo(() =>
    (templatesData ?? []).map(t => ({
      id: t._id,
      title: t.title,
      questionIds: t.questionIds,
    })),
    [templatesData]
  )

  const existingQuestionIds = React.useMemo(() =>
    (existingQuestionsData ?? []).map(sq => sq.questionId),
    [existingQuestionsData]
  )

  const handleCreatePeriod = async (values: SelectionPeriodFormValues) => {
    const periodId = await createPeriod({
      title: values.title,
      description: values.title,
      semesterId: values.selection_period_id,
      openDate: values.start_deadline,
      closeDate: values.end_deadline,
      setAsActive: values.isActive
    })

    // Add selected questions to the period
    if (values.questionIds.length > 0) {
      for (const questionId of values.questionIds) {
        await addQuestion({
          selectionPeriodId: periodId,
          questionId: questionId as Id<"questions">
        })
      }
    }

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

    // Sync questions: remove those not in new selection, add new ones
    const newQuestionIds = new Set(values.questionIds)
    const oldQuestionIds = new Set(existingQuestionIds)

    // Remove questions that are no longer selected
    for (const qId of existingQuestionIds) {
      if (!newQuestionIds.has(qId)) {
        await removeQuestion({
          selectionPeriodId: editingPeriod._id,
          questionId: qId as Id<"questions">
        })
      }
    }

    // Add new questions
    for (const qId of values.questionIds) {
      if (!oldQuestionIds.has(qId as Id<"questions">)) {
        await addQuestion({
          selectionPeriodId: editingPeriod._id,
          questionId: qId as Id<"questions">
        })
      }
    }

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
          <SelectionPeriodForm
            questions={questions}
            templates={templates}
            onSubmit={handleCreatePeriod}
          />
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
              questions={questions}
              templates={templates}
              initialValues={{
                title: editingPeriod.title,
                selection_period_id: editingPeriod.semesterId,
                start_deadline: new Date(editingPeriod.openDate),
                end_deadline: new Date(editingPeriod.closeDate),
                isActive: SelectionPeriod.isOpen(editingPeriod),
                questionIds: existingQuestionIds,
              }}
              onSubmit={handleUpdatePeriod}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}