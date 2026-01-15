"use client"

import * as React from "react"
import { useSignals } from "@preact/signals-react/runtime"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import * as SelectionPeriod from "@/convex/schemas/SelectionPeriod"
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
  // Note: We need to pass the period ID from the VM now
  const selectedStudentAnswers = useQuery(
    api.studentAnswers.getStudentAnswersForTeacher,
    vm.selectedStudentId$.value
      ? {
        studentId: vm.selectedStudentId$.value,
        selectionPeriodId: vm.studentGroups$.value
          .find(g => g.students.some(s => s.studentId === vm.selectedStudentId$.value))
          ?.period._id!
      }
      : "skip"
  )

  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSaveAnswers = async (
    answers: Array<{ questionId: any; kind: "boolean" | "0to6"; value: boolean | number }>
  ) => {
    setIsSubmitting(true)
    try {
      // Find the period matching the selected student
      const periodId = vm.studentGroups$.value
        .find(g => g.students.some(s => s.studentId === vm.selectedStudentId$.value))
        ?.period._id

      if (periodId) {
        await vm.saveAnswers(answers, periodId)
      } else {
        console.error("Could not find period for selected student")
      }
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

  const studentGroups = vm.studentGroups$.value

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Students</h2>

      {studentGroups.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No students found. Generate access codes for students to join a project assignment.
            </p>
          </CardContent>
        </Card>
      ) : (
        studentGroups.map((group) => (
          <div key={group.period._id} className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{group.period.title}</h3>
              <Badge variant="outline" className="text-muted-foreground">
                {group.students.length} Students
              </Badge>
              {!SelectionPeriod.isOpen(group.period) && (
                <Badge variant="secondary" className="text-xs">
                  {new Date(group.period.closeDate).toLocaleDateString()}
                </Badge>
              )}
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Access Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="w-[100px] pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.students.map((student) => (
                      <TableRow key={student.key}>
                        <TableCell className="pl-6 font-mono font-medium">{student.studentId}</TableCell>
                        <TableCell>
                          {student.isCompleted ? (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
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
                        <TableCell className="pr-6">
                          <Button variant="ghost" size="icon" onClick={student.edit} title="Edit questionnaire">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ))
      )}

      {/* Questionnaire Dialog */}
      <Dialog open={vm.questionnaireDialog.isOpen$.value} onOpenChange={(open) => {
        if (!open) vm.questionnaireDialog.close()
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
