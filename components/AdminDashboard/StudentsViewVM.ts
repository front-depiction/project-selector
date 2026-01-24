import { signal, computed, ReadonlySignal, Signal } from "@preact/signals-react"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import type { FunctionReturnType } from "convex/server"
import type { api } from "@/convex/_generated/api"
import * as Option from "effect/Option"

// ============================================================================
// View Model Types
// ============================================================================

export interface StudentItemVM {
  readonly key: string
  readonly studentId: string
  readonly name?: string
  readonly studentIdDisplay: string
  readonly isCompleted: boolean
  readonly answeredCount: number
  readonly totalCount: number
  readonly completionPercentage: number
  readonly edit: () => void
}

export interface DialogVM {
  readonly isOpen$: ReadonlySignal<boolean>
  readonly open: () => void
  readonly close: () => void
}

export interface StudentsViewVM {
  readonly studentGroups$: ReadonlySignal<ReadonlyArray<{
    period: Doc<"selectionPeriods">
    students: readonly StudentItemVM[]
  }>>
  readonly selectedStudentId$: ReadonlySignal<string | null>
  readonly questionnaireDialog: DialogVM
  readonly isLoading$: ReadonlySignal<boolean>
  readonly saveAnswers: (answers: Array<{ questionId: Id<"questions">; kind: "boolean" | "0to6"; value: boolean | number }>, periodId: Id<"selectionPeriods">) => Promise<void>
}

// ============================================================================
// Types for Dependencies
// ============================================================================

export interface StudentsViewDeps {
  readonly allPeriodsStudentsData$: Signal<FunctionReturnType<typeof api.studentAnswers.getAllPeriodsStudentsWithCompletionStatus> | undefined>
  readonly saveAnswersAsTeacher: (args: {
    studentId: string
    selectionPeriodId: Id<"selectionPeriods">
    answers: Array<{ questionId: Id<"questions">; kind: "boolean" | "0to6"; value: boolean | number }>
  }) => Promise<any>
}

type StudentsByPeriod = FunctionReturnType<typeof api.studentAnswers.getAllPeriodsStudentsWithCompletionStatus>
type StudentGroup = NonNullable<StudentsByPeriod>[number]
type StudentEntry = StudentGroup["students"][number]

// ============================================================================
// Factory Function
// ============================================================================

export function createStudentsViewVM(deps: StudentsViewDeps): StudentsViewVM {
  const {
    allPeriodsStudentsData$,
    saveAnswersAsTeacher
  } = deps

  // Local state signals
  const dialogOpen$ = signal(false)
  const selectedStudentId$ = signal<string | null>(null)

  // Track which period the selected student belongs to
  const selectedPeriodId$ = signal<Id<"selectionPeriods"> | null>(null)

  // Computed: Loading state
  const isLoading$ = computed(() => {
    return allPeriodsStudentsData$.value === undefined
  })

  // Computed: Grouped students list with VM items
  const studentGroups$ = computed(() => {
    const data = allPeriodsStudentsData$.value
    if (!data) return []

    return data.map((group: StudentGroup) => ({
      period: group.period,
      students: group.students.map((student: StudentEntry): StudentItemVM => {
        const completionPercentage = student.totalCount > 0
          ? (student.answeredCount / student.totalCount) * 100
          : 100

        // Format: "Name (CODE)" if name exists, otherwise just CODE
        const studentIdDisplay = student.name 
          ? `${student.name} (${student.studentId})` 
          : student.studentId

        return {
          key: `${group.period._id}-${student.studentId}`,
          studentId: student.studentId,
          name: student.name,
          studentIdDisplay,
          isCompleted: student.isCompleted,
          answeredCount: student.answeredCount,
          totalCount: student.totalCount,
          completionPercentage,
          edit: () => {
            selectedStudentId$.value = student.studentId
            selectedPeriodId$.value = group.period._id
            dialogOpen$.value = true
          }
        }
      })
    }))
  })

  // Dialog VM
  const questionnaireDialog: DialogVM = {
    isOpen$: computed(() => dialogOpen$.value),
    open: () => {
      dialogOpen$.value = true
    },
    close: () => {
      dialogOpen$.value = false
      selectedStudentId$.value = null
      selectedPeriodId$.value = null
    }
  }

  // Save answers action
  const saveAnswers = async (
    answers: Array<{ questionId: Id<"questions">; kind: "boolean" | "0to6"; value: boolean | number }>,
    // Optional explicit period ID, otherwise uses selected state
    periodId?: Id<"selectionPeriods">
  ): Promise<void> => {
    const studentId = selectedStudentId$.value
    const targetPeriodId = periodId ?? selectedPeriodId$.value

    if (!studentId || !targetPeriodId) {
      throw new Error("Student ID and period are required")
    }

    await saveAnswersAsTeacher({
      studentId,
      selectionPeriodId: targetPeriodId,
      answers
    })

    // Close dialog after successful save
    dialogOpen$.value = false
    selectedStudentId$.value = null
    selectedPeriodId$.value = null
  }

  return {
    studentGroups$,
    selectedStudentId$: computed(() => selectedStudentId$.value),
    questionnaireDialog,
    isLoading$,
    saveAnswers
  }
}
