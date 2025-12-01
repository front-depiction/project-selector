"use client"
import { signal, computed, ReadonlySignal } from "@preact/signals-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { SelectionPeriodFormValues, QuestionOption, TemplateOption } from "@/components/forms/selection-period-form"
import * as SelectionPeriod from "@/convex/schemas/SelectionPeriod"
import type { SelectionPeriodWithStats, Assignment } from "./index"
import { format } from "date-fns"

// ============================================================================
// View Model Types
// ============================================================================

/**
 * Dialog View Model for managing open/close state
 */
export interface DialogVM {
  readonly isOpen$: ReadonlySignal<boolean>
  readonly open: () => void
  readonly close: () => void
}

/**
 * Dialog View Model with editing period state
 */
export interface EditDialogVM extends DialogVM {
  readonly editingPeriod$: ReadonlySignal<SelectionPeriodWithStats | null>
  readonly openWithPeriod: (period: SelectionPeriodWithStats) => void
}

/**
 * View Model for a single period row in the table
 */
export interface PeriodRowVM {
  readonly key: string
  readonly title: string
  readonly statusDisplay: string
  readonly statusColor: string
  readonly openDateDisplay: string
  readonly closeDateDisplay: string
  readonly studentCountDisplay: string
  readonly onEdit: () => void
  readonly onSetActive: () => void
  readonly onDelete: () => void
  readonly canSetActive: boolean
}

/**
 * View Model for assignment row in the results table
 */
export interface AssignmentRowVM {
  readonly key: string
  readonly studentId: string
  readonly topicTitle: string
  readonly preferenceRank: number
  readonly isMatched: boolean
  readonly statusDisplay: string
  readonly rankBadgeVariant: "default" | "secondary"
}

/**
 * Main PeriodsView View Model
 */
export interface PeriodsViewVM {
  /** Current active/assigned period with stats */
  readonly currentPeriod$: ReadonlySignal<SelectionPeriodWithStats | null>

  /** Assignment data for table */
  readonly assignments$: ReadonlySignal<readonly AssignmentRowVM[]>

  /** Whether to show assignment results section */
  readonly showAssignmentResults$: ReadonlySignal<boolean>

  /** All periods for the table */
  readonly periods$: ReadonlySignal<readonly PeriodRowVM[]>

  /** Create dialog state */
  readonly createDialog: DialogVM

  /** Edit dialog state with editing period */
  readonly editDialog: EditDialogVM

  /** Available questions for form */
  readonly questions$: ReadonlySignal<readonly QuestionOption[]>

  /** Available templates for form */
  readonly templates$: ReadonlySignal<readonly TemplateOption[]>

  /** Questions already linked to editing period */
  readonly existingQuestionIds$: ReadonlySignal<readonly string[]>

  /** Handle create period submission */
  readonly onCreateSubmit: (values: SelectionPeriodFormValues) => void

  /** Handle edit period submission */
  readonly onEditSubmit: (values: SelectionPeriodFormValues) => void
}

// ============================================================================
// Hook - uses Convex as reactive primitive directly
// ============================================================================

export function usePeriodsViewVM(): PeriodsViewVM {
  // Convex queries - already reactive!
  const periodsData = useQuery(api.selectionPeriods.getAllPeriodsWithStats, {})
  const currentPeriodData = useQuery(api.admin.getCurrentPeriod, {})
  const assignmentsData = useQuery(
    api.assignments.getAllAssignmentsForExport,
    currentPeriodData?._id ? { periodId: currentPeriodData._id } : "skip"
  )
  const questionsData = useQuery(api.questions.getAllQuestions, {})
  const templatesData = useQuery(api.questionTemplates.getAllTemplatesWithQuestionIds, {})

  // Convex mutations
  const createPeriodMutation = useMutation(api.selectionPeriods.createPeriod)
  const updatePeriodMutation = useMutation(api.selectionPeriods.updatePeriod)
  const deletePeriodMutation = useMutation(api.selectionPeriods.deletePeriod)
  const setActivePeriodMutation = useMutation(api.selectionPeriods.setActivePeriod)
  const addQuestionMutation = useMutation(api.selectionQuestions.addQuestion)
  const removeQuestionMutation = useMutation(api.selectionQuestions.removeQuestion)

  // Dialog state
  const createDialogOpen$ = signal(false)
  const editDialogOpen$ = signal(false)
  const editingPeriod$ = signal<SelectionPeriodWithStats | null>(null)

  // Existing questions for editing period
  const existingQuestionsData = useQuery(
    api.selectionQuestions.getQuestionsForPeriod,
    editingPeriod$.value?._id ? { selectionPeriodId: editingPeriod$.value._id } : "skip"
  )

  // Computed: current period (may be open or assigned)
  const currentPeriod$ = computed((): SelectionPeriodWithStats | null => {
    if (!currentPeriodData) return null

    // Add stats to the current period
    const assignments = assignmentsData ?? []
    return {
      ...currentPeriodData,
      studentCount: assignments.length,
      assignmentCount: assignments.length,
    }
  })

  // Computed: assignments for table
  const assignments$ = computed((): readonly AssignmentRowVM[] => {
    if (!assignmentsData) return []

    return assignmentsData.map((assignment, idx): AssignmentRowVM => ({
      key: `${assignment.student_id}-${assignment.assigned_topic}-${idx}`,
      studentId: assignment.student_id,
      topicTitle: assignment.assigned_topic,
      preferenceRank: 0, // Not available in export data
      isMatched: false, // Not available in export data
      statusDisplay: "assigned",
      rankBadgeVariant: "secondary",
    }))
  })

  // Computed: whether to show assignment results
  const showAssignmentResults$ = computed((): boolean => {
    const current = currentPeriod$.value
    if (!current) return false
    if (!SelectionPeriod.isAssigned(current)) return false
    const assignments = assignments$.value
    return assignments.length > 0
  })

  // Computed: periods for table
  const periods$ = computed((): readonly PeriodRowVM[] => {
    if (!periodsData) return []

    return periodsData.map((period: any): PeriodRowVM => {
      const statusDisplay = SelectionPeriod.match(period)({
        open: () => "open",
        inactive: () => "inactive",
        closed: () => "closed",
        assigned: () => "assigned",
      })

      const statusColor = SelectionPeriod.match(period)({
        open: () => "bg-green-600 text-white",
        inactive: () => "bg-blue-600 text-white",
        closed: () => "bg-red-600 text-white",
        assigned: () => "bg-purple-600 text-white",
      })

      const canSetActive = SelectionPeriod.match(period)({
        open: () => false,
        inactive: () => true,
        closed: () => true,
        assigned: () => true,
      })

      return {
        key: period._id,
        title: period.title,
        statusDisplay,
        statusColor,
        openDateDisplay: format(period.openDate, "MMM d, yyyy"),
        closeDateDisplay: format(period.closeDate, "MMM d, yyyy"),
        studentCountDisplay: String(period.studentCount || 0),
        onEdit: () => {
          editingPeriod$.value = period
          editDialogOpen$.value = true
        },
        onSetActive: () => {
          if (period._id && canSetActive) {
            setActivePeriodMutation({ periodId: period._id }).catch(console.error)
          }
        },
        onDelete: () => {
          if (period._id) {
            deletePeriodMutation({ periodId: period._id }).catch(console.error)
          }
        },
        canSetActive,
      }
    })
  })

  // Computed: questions for form
  const questions$ = computed((): readonly QuestionOption[] =>
    (questionsData ?? []).map((q): QuestionOption => ({
      id: q._id,
      questionText: q.question,
      kindDisplay: q.kind === "boolean" ? "Yes/No" : "0-10",
      kindVariant: q.kind === "boolean" ? "secondary" : "outline",
    }))
  )

  // Computed: templates for form
  const templates$ = computed((): readonly TemplateOption[] =>
    (templatesData ?? []).map((t): TemplateOption => ({
      id: t._id,
      title: t.title,
      questionIds: t.questionIds,
    }))
  )

  // Computed: existing question IDs
  const existingQuestionIds$ = computed((): readonly string[] =>
    (existingQuestionsData ?? []).map((sq) => sq.questionId)
  )

  // Create dialog
  const createDialog: DialogVM = {
    isOpen$: createDialogOpen$,
    open: () => {
      createDialogOpen$.value = true
    },
    close: () => {
      createDialogOpen$.value = false
    },
  }

  // Edit dialog
  const editDialog: EditDialogVM = {
    isOpen$: editDialogOpen$,
    editingPeriod$,
    open: () => {
      editDialogOpen$.value = true
    },
    close: () => {
      editDialogOpen$.value = false
      editingPeriod$.value = null
    },
    openWithPeriod: (period: SelectionPeriodWithStats) => {
      editingPeriod$.value = period
      editDialogOpen$.value = true
    },
  }

  // Form submission handlers
  const onCreateSubmit = async (values: SelectionPeriodFormValues): Promise<void> => {
    const result = await createPeriodMutation({
      title: values.title,
      description: values.title,
      semesterId: values.selection_period_id,
      openDate: values.start_deadline.getTime(),
      closeDate: values.end_deadline.getTime(),
      setAsActive: values.isActive,
    })

    const periodId = result.periodId

    // Add selected questions to the period
    if (values.questionIds.length > 0) {
      for (const questionId of values.questionIds) {
        await addQuestionMutation({
          selectionPeriodId: periodId,
          questionId: questionId as Id<"questions">,
        })
      }
    }

    createDialog.close()
  }

  const onEditSubmit = async (values: SelectionPeriodFormValues): Promise<void> => {
    const editingPeriodValue = editingPeriod$.value
    if (!editingPeriodValue?._id) return

    await updatePeriodMutation({
      periodId: editingPeriodValue._id,
      title: values.title,
      description: values.title,
      openDate: values.start_deadline.getTime(),
      closeDate: values.end_deadline.getTime(),
    })

    // Sync questions: remove those not in new selection, add new ones
    const newQuestionIds = new Set(values.questionIds)
    const oldQuestionIds = new Set(existingQuestionIds$.value)

    // Remove questions that are no longer selected
    for (const qId of existingQuestionIds$.value) {
      if (!newQuestionIds.has(qId)) {
        await removeQuestionMutation({
          selectionPeriodId: editingPeriodValue._id,
          questionId: qId as Id<"questions">,
        })
      }
    }

    // Add new questions
    for (const qId of values.questionIds) {
      if (!oldQuestionIds.has(qId as Id<"questions">)) {
        await addQuestionMutation({
          selectionPeriodId: editingPeriodValue._id,
          questionId: qId as Id<"questions">,
        })
      }
    }

    editDialog.close()
  }

  return {
    currentPeriod$,
    assignments$,
    showAssignmentResults$,
    periods$,
    createDialog,
    editDialog,
    questions$,
    templates$,
    existingQuestionIds$,
    onCreateSubmit,
    onEditSubmit,
  }
}
