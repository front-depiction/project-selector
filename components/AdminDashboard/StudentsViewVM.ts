import { signal, computed, ReadonlySignal, Signal } from "@preact/signals-react"
import type { Id } from "@/convex/_generated/dataModel"
import type { FunctionReturnType } from "convex/server"
import type { api } from "@/convex/_generated/api"
import * as Option from "effect/Option"

// ============================================================================
// View Model Types
// ============================================================================

export interface StudentItemVM {
  readonly key: string
  readonly studentId: string
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
  readonly students$: ReadonlySignal<readonly StudentItemVM[]>
  readonly selectedStudentId$: ReadonlySignal<string | null>
  readonly currentPeriod$: ReadonlySignal<FunctionReturnType<typeof api.admin.getCurrentPeriod> | undefined>
  readonly questionnaireDialog: DialogVM
  readonly isLoading$: ReadonlySignal<boolean>
  readonly saveAnswers: (answers: Array<{ questionId: Id<"questions">; kind: "boolean" | "0to6"; value: boolean | number }>) => Promise<void>
}

// ============================================================================
// Types for Dependencies
// ============================================================================

export interface StudentsViewDeps {
  readonly studentsData$: Signal<FunctionReturnType<typeof api.studentAnswers.getAllStudentsWithCompletionStatus> | undefined>
  readonly currentPeriod$: Signal<FunctionReturnType<typeof api.admin.getCurrentPeriod> | undefined>
  readonly saveAnswersAsTeacher: (args: {
    studentId: string
    selectionPeriodId: Id<"selectionPeriods">
    answers: Array<{ questionId: Id<"questions">; kind: "boolean" | "0to6"; value: boolean | number }>
  }) => Promise<any>
}

// ============================================================================
// Factory Function
// ============================================================================

export function createStudentsViewVM(deps: StudentsViewDeps): StudentsViewVM {
  const {
    studentsData$,
    currentPeriod$: currentPeriodData$,
    saveAnswersAsTeacher
  } = deps

  // Local state signals
  const dialogOpen$ = signal(false)
  const selectedStudentId$ = signal<string | null>(null)

  // Computed: Loading state
  const isLoading$ = computed(() => {
    return studentsData$.value === undefined || currentPeriodData$.value === undefined
  })

  // Computed: Students list with VM items
  const students$ = computed((): readonly StudentItemVM[] => {
    const studentsData = studentsData$.value
    if (!studentsData) return []

    return studentsData.map((student): StudentItemVM => {
      const completionPercentage = student.totalCount > 0
        ? (student.answeredCount / student.totalCount) * 100
        : 100

      return {
        key: student.studentId,
        studentId: student.studentId,
        isCompleted: student.isCompleted,
        answeredCount: student.answeredCount,
        totalCount: student.totalCount,
        completionPercentage,
        edit: () => {
          selectedStudentId$.value = student.studentId
          dialogOpen$.value = true
        }
      }
    })
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
    }
  }

  // Save answers action
  const saveAnswers = async (
    answers: Array<{ questionId: Id<"questions">; kind: "boolean" | "0to6"; value: boolean | number }>
  ): Promise<void> => {
    const studentId = selectedStudentId$.value
    const period = currentPeriodData$.value

    if (!studentId || !period) {
      throw new Error("Student ID and period are required")
    }

    await saveAnswersAsTeacher({
      studentId,
      selectionPeriodId: period._id,
      answers
    })

    // Close dialog after successful save
    dialogOpen$.value = false
    selectedStudentId$.value = null
  }

  return {
    students$,
    selectedStudentId$: computed(() => selectedStudentId$.value),
    currentPeriod$: computed(() => currentPeriodData$.value),
    questionnaireDialog,
    isLoading$,
    saveAnswers
  }
}
