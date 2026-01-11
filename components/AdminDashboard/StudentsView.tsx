"use client"

import * as React from "react"
import { useSignals } from "@preact/signals-react/runtime"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Edit2, Users } from "lucide-react"
import type { StudentsViewVM } from "./StudentsViewVM"
import TeacherQuestionnaireForm from "@/components/forms/teacher-questionnaire-form"

export const StudentsView: React.FC<{ vm: StudentsViewVM }> = ({ vm }) => {
  useSignals()

  // Query student answers when a student is selected
  const selectedStudentAnswers = useQuery(
    api.studentAnswers.getStudentAnswersForTeacher,
    vm.selectedStudentId$.value && vm.currentPeriod$.value?._id
      ? {
          studentId: vm.selectedStudentId$.value,
          selectionPeriodId: vm.currentPeriod$.value._id,
        }
      : "skip"
  )

  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSaveAnswers = async (
    answers: Array<{ questionId: any; kind: "boolean" | "0to10"; value: boolean | number }>
  ) => {
    setIsSubmitting(true)
    try {
      await vm.saveAnswers(answers)
    } catch (error) {
      console.error("Failed to save answers:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    vm.questionnaireDialog.close()
  }

  if (vm.isLoading$.value) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Students</h2>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading students...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const students = vm.students$.value
  const currentPeriod = vm.currentPeriod$.value

  if (!currentPeriod) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Students</h2>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No active project assignment found. Please create or activate one first.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Students</h2>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-muted-foreground" />
            <div>
              <CardTitle>Student Questionnaires</CardTitle>
              <CardDescription>
                View and manage student questionnaire responses. Teachers can fill out or edit questionnaires on behalf of students.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No students found. Generate access codes for students to join this project assignment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Access Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.key}>
                    <TableCell className="font-mono font-medium">{student.studentId}</TableCell>
                    <TableCell>
                      {student.isCompleted ? (
                        <Badge variant="default" className="bg-green-600">
                          Complete
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Incomplete ({student.answeredCount}/{student.totalCount})
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={student.completionPercentage} className="h-2 w-24" />
                        <span className="text-sm text-muted-foreground">
                          {Math.round(student.completionPercentage)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={student.edit} title="Edit questionnaire">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Questionnaire Dialog */}
      <Dialog open={vm.questionnaireDialog.isOpen$.value} onOpenChange={(open) => {
        if (!open) vm.questionnaireDialog.close()
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Questionnaire for Student: {vm.selectedStudentId$.value}
            </DialogTitle>
            <DialogDescription>
              Fill out or edit the questionnaire on behalf of this student.
            </DialogDescription>
          </DialogHeader>
          {selectedStudentAnswers === undefined ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading questions...
            </div>
          ) : (
            <TeacherQuestionnaireForm
              questions={selectedStudentAnswers}
              onSubmit={handleSaveAnswers}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
