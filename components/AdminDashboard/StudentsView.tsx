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
import { Edit2, Users, ChevronDown, ChevronRight } from "lucide-react"
import type { StudentsViewVM } from "./StudentsViewVM"
import TeacherQuestionnaireForm from "@/components/forms/teacher-questionnaire-form"

export const StudentsView: React.FC<{ vm: StudentsViewVM }> = ({ vm }) => {
  useSignals()

  // Track which project assignments are expanded
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set())

  const toggleGroup = (periodId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(periodId)) {
        next.delete(periodId)
      } else {
        next.add(periodId)
      }
      return next
    })
  }

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

  // Sort student groups: open periods first, then by closeDate descending
  // NOTE: This useMemo must be called before any early returns to satisfy React's Rules of Hooks
  const studentGroups = React.useMemo(() => {
    const groups = [...vm.studentGroups$.value]
    return groups.sort((a, b) => {
      const aIsOpen = SelectionPeriod.isOpen(a.period)
      const bIsOpen = SelectionPeriod.isOpen(b.period)
      if (aIsOpen && !bIsOpen) return -1
      if (!aIsOpen && bIsOpen) return 1
      return (b.period.closeDate || 0) - (a.period.closeDate || 0)
    })
  }, [vm.studentGroups$.value])

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

  // Keep all sections collapsed by default

  return (
    <div className="space-y-6">
      {/* Header with description */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Students</h2>
          <p className="text-muted-foreground mt-1">View student progress and manage questionnaire responses</p>
        </div>
      </div>

      {studentGroups.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>No Students</CardTitle>
            <CardDescription>Generate access codes for students to join a project assignment.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {studentGroups.map((group) => {
            const periodId = group.period._id
            const isExpanded = expandedGroups.has(periodId)
            const isOpen = SelectionPeriod.isOpen(group.period)

            return (
              <Card key={periodId}>
                {/* Clickable Section Header */}
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleGroup(periodId)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                    <CardTitle className="text-lg flex items-center gap-2">
                      {group.period.title}
                      <Badge variant="outline" className="text-muted-foreground">
                        {group.students.length} {group.students.length === 1 ? "Student" : "Students"}
                      </Badge>
                      {isOpen && (
                        <Badge variant="default" className="bg-green-600 text-white">
                          Open
                        </Badge>
                      )}
                      {!isOpen && (
                        <Badge variant="secondary" className="text-xs">
                          {new Date(group.period.closeDate).toLocaleDateString()}
                        </Badge>
                      )}
                    </CardTitle>
                  </div>
                  <CardDescription className="ml-7">
                    Student questionnaire progress for this project assignment period.
                  </CardDescription>
                </CardHeader>

                {/* Collapsible Students Table */}
                {isExpanded && (
                  <CardContent>
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
                        {group.students.map((student) => (
                          <TableRow key={student.key}>
                            <TableCell className="font-medium">{student.studentIdDisplay}</TableCell>
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
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={student.edit} title="Edit questionnaire">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Questionnaire Dialog */}
      <Dialog open={vm.questionnaireDialog.isOpen$.value} onOpenChange={(open) => {
        if (!open) vm.questionnaireDialog.close()
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
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
