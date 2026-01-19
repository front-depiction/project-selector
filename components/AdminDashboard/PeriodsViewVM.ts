import { signal, computed, ReadonlySignal, batch } from "@preact/signals-react"
import type { Id } from "@/convex/_generated/dataModel"
import type { SelectionPeriodFormValues, QuestionOption, TemplateOption } from "@/components/forms/selection-period-form"
import * as SelectionPeriod from "@/convex/schemas/SelectionPeriod"
import type { SelectionPeriodWithStats, Assignment } from "./index"
import { format } from "date-fns"
import * as Option from "effect/Option"

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
  readonly editingPeriod$: ReadonlySignal<Option.Option<SelectionPeriodWithStats>>
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
  readonly needsNames: boolean // Whether this period needs student names
  readonly onEdit: () => void
  readonly onDelete: () => void
}

/**
 * View Model for assignment row in the results table
 */
export interface AssignmentRowVM {
  readonly key: string
  readonly studentId: string
  readonly name?: string // Optional name (GDPR: only if provided by teacher)
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
  readonly currentPeriod$: ReadonlySignal<Option.Option<SelectionPeriodWithStats>>

  /** Assignment data for table */
  readonly assignments$: ReadonlySignal<readonly AssignmentRowVM[]>

  /** Whether to show assignment results section */
  readonly showAssignmentResults$: ReadonlySignal<boolean>

  /** All periods for the table */
  readonly periods$: ReadonlySignal<readonly PeriodRowVM[]>

  /** Raw periods data (for accessing full period documents) */
  readonly periodsData$: ReadonlySignal<readonly SelectionPeriodWithStats[] | undefined>

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

  /** ID and title of newly created period (for showing access codes) */
  readonly createdPeriod$: ReadonlySignal<Option.Option<{ id: Id<"selectionPeriods">; title: string }>>

  /** Handle create period submission */
  readonly onCreateSubmit: (values: SelectionPeriodFormValues) => void

  /** Handle edit period submission */
  readonly onEditSubmit: (values: SelectionPeriodFormValues) => void

  /** Finish creation flow and close dialog */
  readonly finishCreation: () => void

  /** Exposed mutations for manual question sync */
  readonly updatePeriod: PeriodsViewVMDeps["updatePeriod"]
  readonly addQuestion: PeriodsViewVMDeps["addQuestion"]
  readonly removeQuestion: PeriodsViewVMDeps["removeQuestion"]
}

// ============================================================================
// Factory Dependencies
// ============================================================================

export interface PeriodsViewVMDeps {
  /** Signal of periods data from Convex */
  readonly periodsData$: ReadonlySignal<readonly SelectionPeriodWithStats[] | undefined>

  /** Signal of current period data from Convex */
  readonly currentPeriodData$: ReadonlySignal<SelectionPeriodWithStats | null | undefined>

  /** Signal of assignments data from Convex */
  readonly assignmentsData$: ReadonlySignal<readonly Assignment[] | undefined>

  /** Signal of questions data from Convex */
  readonly questionsData$: ReadonlySignal<readonly any[] | undefined>

  /** Signal of templates data from Convex */
  readonly templatesData$: ReadonlySignal<readonly any[] | undefined>

  /** Signal of existing questions for editing period */
  readonly existingQuestionsData$: ReadonlySignal<readonly any[] | undefined>

  /** Mutation to create a period */
  readonly createPeriod: (args: {
    title: string
    description: string
    semesterId: string
    openDate: number
    closeDate: number
  }) => Promise<{ periodId: Id<"selectionPeriods"> }>

  /** Mutation to update a period */
  readonly updatePeriod: (args: {
    periodId: Id<"selectionPeriods">
    title?: string
    description?: string
    openDate?: number
    closeDate?: number
  }) => Promise<any>

  /** Mutation to delete a period */
  readonly deletePeriod: (args: { periodId: Id<"selectionPeriods"> }) => Promise<any>


  /** Mutation to add question to period */
  readonly addQuestion: (args: {
    selectionPeriodId: Id<"selectionPeriods">
    questionId: Id<"questions">
  }) => Promise<any>

  /** Mutation to remove question from period */
  readonly removeQuestion: (args: {
    selectionPeriodId: Id<"selectionPeriods">
    questionId: Id<"questions">
  }) => Promise<any>
}

// ============================================================================
// Factory Function - creates VM with stable signals
// ============================================================================

export function createPeriodsViewVM(deps: PeriodsViewVMDeps): PeriodsViewVM {
  // Dialog state - signals created ONCE when factory is called
  const createDialogOpen$ = signal(false)
  const editDialogOpen$ = signal(false)
  const editingPeriod$ = signal<Option.Option<SelectionPeriodWithStats>>(Option.none())
  const createdPeriod$ = signal<Option.Option<{ id: Id<"selectionPeriods">; title: string }>>(Option.none())

  // Computed: current period (may be open or assigned)
  const currentPeriod$ = computed((): Option.Option<SelectionPeriodWithStats> => {
    const periodOption = Option.fromNullable(deps.currentPeriodData$.value)
    return Option.map(periodOption, (period) => {
      // Add stats to the current period
      const assignments = deps.assignmentsData$.value ?? []
      return {
        ...period,
        studentCount: assignments.length,
        assignmentCount: assignments.length,
      }
    })
  })

  // Computed: assignments for table
  const assignments$ = computed((): readonly AssignmentRowVM[] => {
    const assignmentsData = deps.assignmentsData$.value
    if (!assignmentsData) return []

    return assignmentsData.map((assignment, idx): AssignmentRowVM => ({
      key: `${assignment.studentId}-${assignment.topicTitle}-${idx}`,
      studentId: assignment.studentId,
      name: (assignment as any).name, // Include name if available
      topicTitle: assignment.topicTitle,
      preferenceRank: assignment.preferenceRank,
      isMatched: assignment.isMatched,
      statusDisplay: assignment.status,
      rankBadgeVariant: assignment.preferenceRank === 1 ? "default" : "secondary",
    }))
  })

  // Computed: whether to show assignment results
  const showAssignmentResults$ = computed((): boolean => {
    return Option.match(currentPeriod$.value, {
      onNone: () => false,
      onSome: (current) => {
        if (!SelectionPeriod.isAssigned(current)) return false
        const assignments = assignments$.value
        return assignments.length > 0
      }
    })
  })

  // Computed: periods for table
  const periods$ = computed((): readonly PeriodRowVM[] => {
    const periodsData = deps.periodsData$.value
    if (!periodsData) return []

    return periodsData.map((period: any): PeriodRowVM => {
      const statusDisplay = SelectionPeriod.match(period)({
        open: () => "Open",
        inactive: () => "Inactive",
        closed: () => "Closed",
        assigned: () => "Assigned",
      })

      const statusColor = SelectionPeriod.match(period)({
        open: () => "bg-green-600 text-white",
        inactive: () => "bg-blue-600 text-white",
        closed: () => "bg-red-600 text-white",
        assigned: () => "bg-purple-600 text-white",
      })

      return {
        key: period._id,
        title: period.title,
        statusDisplay,
        statusColor,
        openDateDisplay: format(period.openDate, "MMM d, yyyy"),
        closeDateDisplay: format(period.closeDate, "MMM d, yyyy"),
        studentCountDisplay: String(period.studentCount || 0),
        needsNames: false, // Will be set by component-level query
        onEdit: () => {
          batch(() => {
            editingPeriod$.value = Option.some(period)
            editDialogOpen$.value = true
          })
        },
        onDelete: () => {
          if (period._id) {
            deps.deletePeriod({ periodId: period._id }).catch(console.error)
          }
        },
      }
    })
  })

  // Computed: questions for form
  const questions$ = computed((): readonly QuestionOption[] => {
    const questionsData = deps.questionsData$.value
    return (questionsData ?? []).map((q): QuestionOption => ({
      id: q._id,
      questionText: q.question,
      kindDisplay: q.kind === "boolean" ? "Yes/No" : "0-6",
      kindVariant: q.kind === "boolean" ? "secondary" : "outline",
    }))
  })

  // Computed: templates for form
  const templates$ = computed((): readonly TemplateOption[] => {
    const templatesData = deps.templatesData$.value
    return (templatesData ?? []).map((t): TemplateOption => ({
      id: t._id,
      title: t.title,
      questionIds: t.questionIds,
    }))
  })

  // Computed: existing question IDs
  const existingQuestionIds$ = computed((): readonly string[] => {
    const existingQuestionsData = deps.existingQuestionsData$.value
    const ids = (existingQuestionsData ?? []).map((sq) => sq.questionId)
    console.log('[PeriodsViewVM] existingQuestionIds$ computed:', {
      existingQuestionsData,
      ids,
      length: ids.length
    })
    return ids
  })

  // Create dialog
  const createDialog: DialogVM = {
    isOpen$: createDialogOpen$,
    open: () => {
      batch(() => {
        createDialogOpen$.value = true
        createdPeriod$.value = Option.none()
      })
    },
    close: () => {
      batch(() => {
        createDialogOpen$.value = false
        createdPeriod$.value = Option.none()
      })
    },
  }

  // Finish creation flow
  const finishCreation = (): void => {
    createDialog.close()
  }

  // Edit dialog
  const editDialog: EditDialogVM = {
    isOpen$: editDialogOpen$,
    editingPeriod$,
    open: () => {
      editDialogOpen$.value = true
    },
    close: () => {
      batch(() => {
        editDialogOpen$.value = false
        editingPeriod$.value = Option.none()
      })
    },
    openWithPeriod: (period: SelectionPeriodWithStats) => {
      batch(() => {
        editingPeriod$.value = Option.some(period)
        editDialogOpen$.value = true
      })
    },
  }

  // Form submission handlers
  const onCreateSubmit = (values: SelectionPeriodFormValues): void => {
    const periodTitle = values.title

    deps.createPeriod({
      title: values.title,
      description: values.title,
      semesterId: values.selection_period_id,
      openDate: values.start_deadline.getTime(),
      closeDate: values.end_deadline.getTime(),
    })
      .then((result: { success: boolean; periodId: Id<"selectionPeriods"> }) => {
        const createdPeriodId = result.periodId

        // Add selected questions to the period
        if (values.questionIds.length > 0) {
          const promises = values.questionIds.map(questionId =>
            deps.addQuestion({
              selectionPeriodId: createdPeriodId,
              questionId: questionId as Id<"questions">,
            })
          )
          return Promise.all(promises).then(() => createdPeriodId)
        }
        return createdPeriodId
      })
      .then((createdPeriodId: Id<"selectionPeriods">) => {
        // Show access codes panel instead of closing
        createdPeriod$.value = Option.some({ id: createdPeriodId, title: periodTitle })
      })
      .catch((error) => {
        console.error("Failed to create period:", error)
        // Optionally show error toast here
      })
  }

  const onEditSubmit = (values: SelectionPeriodFormValues): void => {
    Option.match(editingPeriod$.value, {
      onNone: () => { },
      onSome: (editingPeriodValue) => {
        if (!editingPeriodValue._id) return

        deps.updatePeriod({
          periodId: editingPeriodValue._id,
          title: values.title,
          description: values.title,
          openDate: values.start_deadline.getTime(),
          closeDate: values.end_deadline.getTime(),
        })
          .then(() => {
            // Sync questions: remove those not in new selection, add new ones
            const newQuestionIds = new Set(values.questionIds)
            const oldQuestionIds = new Set(existingQuestionIds$.value)

            const removePromises = existingQuestionIds$.value
              .filter(qId => !newQuestionIds.has(qId))
              .map(qId =>
                deps.removeQuestion({
                  selectionPeriodId: editingPeriodValue._id,
                  questionId: qId as Id<"questions">,
                })
              )

            const addPromises = values.questionIds
              .filter(qId => !oldQuestionIds.has(qId as Id<"questions">))
              .map(qId =>
                deps.addQuestion({
                  selectionPeriodId: editingPeriodValue._id,
                  questionId: qId as Id<"questions">,
                })
              )

            return Promise.all([...removePromises, ...addPromises])
          })
          .then(() => {
            editDialog.close()
          })
          .catch(console.error)
      }
    })
  }

  return {
    currentPeriod$,
    assignments$,
    showAssignmentResults$,
    periods$,
    periodsData$: deps.periodsData$,
    createDialog,
    editDialog,
    questions$,
    templates$,
    existingQuestionIds$,
    createdPeriod$,
    onCreateSubmit,
    onEditSubmit,
    finishCreation,
    updatePeriod: deps.updatePeriod,
    addQuestion: deps.addQuestion,
    removeQuestion: deps.removeQuestion,
  }
}

// ============================================================================
// Temporary Compatibility Hook (DEPRECATED - will be removed)
// ============================================================================
// This hook is provided for backward compatibility while parent components
// are being migrated to the factory pattern. Once DashboardVM is refactored
// to use the factory pattern and compose this VM, this hook should be removed.
// DO NOT use this in new code - use createPeriodsViewVM() instead.

import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

/**
 * @deprecated Use createPeriodsViewVM() factory function instead.
 * This hook exists only for backward compatibility during migration.
 */
export function usePeriodsViewVM(): PeriodsViewVM {
  // Fetch data from Convex
  const periodsData = useQuery(api.selectionPeriods.getAllPeriodsWithStats, {})
  const currentPeriodData = useQuery(api.admin.getCurrentPeriod, {})
  const assignmentsData = useQuery(
    api.assignments.getAllAssignmentsForExport,
    currentPeriodData?._id ? { periodId: currentPeriodData._id } : "skip"
  )
  const questionsData = useQuery(api.questions.getAllQuestions, {})
  const templatesData = useQuery(api.questionTemplates.getAllTemplatesWithQuestionIds, {})

  // We need to create a signal for editingPeriod to track which period is being edited
  // so we can fetch its questions
  const editingPeriodSignal = React.useMemo(() => signal<Option.Option<SelectionPeriodWithStats>>(Option.none()), [])

  const existingQuestionsData = useQuery(
    api.selectionQuestions.getQuestionsForPeriod,
    Option.match(editingPeriodSignal.value, {
      onNone: () => "skip" as const,
      onSome: (period) => ({ selectionPeriodId: period._id })
    })
  )

  // Get mutations
  const createPeriodMutation = useMutation(api.selectionPeriods.createPeriod)
  const updatePeriodMutation = useMutation(api.selectionPeriods.updatePeriod)
  const deletePeriodMutation = useMutation(api.selectionPeriods.deletePeriod)
  const setActivePeriodMutation = useMutation(api.selectionPeriods.setActivePeriod)
  const addQuestionMutation = useMutation(api.selectionQuestions.addQuestion)
  const removeQuestionMutation = useMutation(api.selectionQuestions.removeQuestion)

  // Wrap data in signals for the factory
  const deps = React.useMemo(() => {
    const periodsData$ = computed(() => periodsData)
    const currentPeriodData$ = computed(() => currentPeriodData)
    const assignmentsData$ = computed(() => {
      if (!assignmentsData) return undefined
      return assignmentsData.map((a): Assignment => ({
        studentId: a.student_id,
        topicTitle: a.assigned_topic,
        preferenceRank: 0,
        isMatched: false,
        status: "assigned"
      }))
    })
    const questionsData$ = computed(() => questionsData)
    const templatesData$ = computed(() => templatesData)
    const existingQuestionsData$ = computed(() => existingQuestionsData)

    return {
      periodsData$,
      currentPeriodData$,
      assignmentsData$,
      questionsData$,
      templatesData$,
      existingQuestionsData$,
      createPeriod: createPeriodMutation,
      updatePeriod: updatePeriodMutation,
      deletePeriod: deletePeriodMutation,
      setActivePeriod: setActivePeriodMutation,
      addQuestion: addQuestionMutation,
      removeQuestion: removeQuestionMutation,
    }
  }, [
    periodsData,
    currentPeriodData,
    assignmentsData,
    questionsData,
    templatesData,
    existingQuestionsData,
    createPeriodMutation,
    updatePeriodMutation,
    deletePeriodMutation,
    setActivePeriodMutation,
    addQuestionMutation,
    removeQuestionMutation,
  ])

  // Create the VM once
  const vm = React.useMemo(() => createPeriodsViewVM(deps), [deps])

  // Wire up the editing period signal to track changes
  React.useEffect(() => {
    editingPeriodSignal.value = vm.editDialog.editingPeriod$.value
  }, [vm.editDialog.editingPeriod$.value])

  return vm
}
