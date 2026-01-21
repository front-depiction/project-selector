"use client"
import * as React from "react"
import { signal, computed, ReadonlySignal, batch } from "@preact/signals-react"
import { useQuery, useMutation, useConvex } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import type { SelectionPeriod } from "@/convex/schemas/SelectionPeriod"
import * as SelectionPeriodModule from "@/convex/schemas/SelectionPeriod"
import { format } from "date-fns"
import * as Option from "effect/Option"
import { toast } from "sonner"

import * as Loadable from "@/lib/Loadable"
import { createPeriodsViewVM } from "./PeriodsViewVM"
import { createTopicsViewVM } from "./TopicsViewVM"
import { createQuestionnairesViewVM } from "./QuestionnairesViewVM"
import { createSettingsViewVM } from "./SettingsViewVM"
import { createStudentsViewVM } from "./StudentsViewVM"
// ============================================================================
// View Model Types
// ============================================================================

export type ViewType = "overview" | "periods" | "topics" | "students" | "questionnaires" | "settings" | "help"

export type SelectionPeriodWithStats = Doc<"selectionPeriods"> & {
  studentCount?: number
  assignmentCount?: number
}

export interface PeriodItemVM {
  readonly key: string
  readonly title: string
  readonly statusDisplay: string
  readonly statusVariant: "default" | "secondary" | "outline"
  readonly statusColor: string
  readonly openDateDisplay: string
  readonly closeDateDisplay: string
  readonly studentCount: number
  readonly assignmentCount: number
  readonly setActive: () => void
  readonly edit: () => void
  readonly remove: () => void
  readonly canSetActive: boolean
}

export interface TopicItemVM {
  readonly key: string
  readonly title: string
  readonly description: string
  readonly statusDisplay: string
  readonly statusVariant: "default" | "secondary"
  readonly selectionCount: number
  readonly toggleActive: () => void
  readonly edit: () => void
  readonly remove: () => void
}

export interface AssignmentItemVM {
  readonly key: string
  readonly studentId: string
  readonly topicTitle: string
  readonly preferenceRank: number
  readonly isMatched: boolean
  readonly matchDisplay: string
  readonly matchVariant: "outline"
  readonly matchColor: string
  readonly rankDisplay: string
  readonly rankVariant: "default" | "secondary"
  readonly statusDisplay: string
  readonly statusColor: string
}

export interface StatsVM {
  readonly totalTopicsDisplay: string
  readonly activeTopicsDisplay: string
  readonly totalStudentsDisplay: string
  readonly totalSelectionsDisplay: string
  readonly averageSelectionsDisplay: string
  readonly matchRateDisplay: string
  readonly topChoiceRateDisplay: string
  readonly currentPeriodDisplay: string
  readonly currentPeriodVariant: string
}

export interface EditPeriodDialogVM {
  readonly isOpen$: ReadonlySignal<boolean>
  readonly editingPeriod$: ReadonlySignal<Option.Option<SelectionPeriodWithStats>>
  readonly open: (period: SelectionPeriodWithStats) => void
  readonly close: () => void
}

export interface EditTopicDialogVM {
  readonly isOpen$: ReadonlySignal<boolean>
  readonly editingTopic$: ReadonlySignal<Option.Option<Doc<"topics">>>
  readonly open: (topic: Doc<"topics">) => void
  readonly close: () => void
}

export interface PeriodOption {
  readonly value: string
  readonly label: string
  readonly id?: string // Optional unique ID for React keys
}

export interface DashboardVM {
  readonly activeView$: ReadonlySignal<ViewType>
  readonly currentPeriod$: ReadonlySignal<Option.Option<Doc<"selectionPeriods">>>
  readonly stats$: ReadonlySignal<StatsVM>
  readonly hasAssignments$: ReadonlySignal<boolean>
  readonly hasPeriods$: ReadonlySignal<boolean>
  readonly hasTopics$: ReadonlySignal<boolean>
  readonly constraintOptions$: ReadonlySignal<readonly PeriodOption[]>
  readonly periodOptions$: ReadonlySignal<readonly PeriodOption[]>

  // Child View Models
  readonly periodsView: import("./PeriodsViewVM").PeriodsViewVM
  readonly topicsView: import("./TopicsViewVM").TopicsViewVM
  readonly questionnairesView: import("./QuestionnairesViewVM").QuestionnairesViewVM
  readonly settingsView: import("./SettingsViewVM").SettingsViewVM
  readonly studentsView: import("./StudentsViewVM").StudentsViewVM

  // Legacy support - for backward compatibility with existing overview components
  readonly periods$: ReadonlySignal<Loadable.Loadable<readonly PeriodItemVM[]>>
  readonly topics$: ReadonlySignal<Loadable.Loadable<readonly TopicItemVM[]>>
  readonly assignments$: ReadonlySignal<readonly AssignmentItemVM[]>
  readonly editPeriodDialog: EditPeriodDialogVM
  readonly editTopicDialog: EditTopicDialogVM
  readonly updatePeriodFromForm: (values: SelectionPeriodFormValues) => void
  readonly updateTopicFromForm: (values: TopicFormValues) => void

  // Actions
  readonly setActiveView: (view: ViewType) => void

  // Legacy actions for backward compatibility (used by context/overview)
  readonly createPeriod: (data: PeriodFormData) => void
  readonly updatePeriod: (id: Id<"selectionPeriods">, updates: Partial<PeriodFormData>) => void
  readonly deletePeriod: (id: Id<"selectionPeriods">) => void
  readonly setActivePeriod: (id: Id<"selectionPeriods">) => void
  readonly createTopic: (data: TopicFormData) => void
  readonly updateTopic: (id: Id<"topics">, updates: Partial<TopicFormData>) => void
  readonly toggleTopicActive: (id: Id<"topics">) => void
  readonly deleteTopic: (id: Id<"topics">) => void
  readonly assignTopics: (periodId: Id<"selectionPeriods">) => void
  readonly seedTestData: () => void
  readonly clearAllData: () => void

  // Raw data for child components that need full objects
  readonly topicAnalytics: readonly unknown[] | undefined
  readonly existingQuestionIds$: ReadonlySignal<readonly string[]>
}

export interface SelectionPeriodFormValues {
  readonly title: string
  readonly selection_period_id: string
  readonly start_deadline: Date

  readonly end_deadline: Date
  readonly questionIds: string[]
}

export interface TopicFormValues {
  readonly title: string
  readonly description: string
  readonly duplicateCount: number
  readonly constraintIds?: string[]
}

export interface PeriodFormData {
  readonly title: string
  readonly description: string
  readonly semesterId: string
  readonly openDate: Date
  readonly closeDate: Date
}

export interface TopicFormData {
  readonly title: string
  readonly description: string
  readonly semesterId: string
}

// ============================================================================
// Hook - ROOT VM that composes all child VMs
// ============================================================================

export function useDashboardVM(): DashboardVM {
  const convex = useConvex()
  // Reactive state - stable signal created once per component lifecycle
  const activeView$ = React.useMemo(() => signal<ViewType>("overview"), [])

  // Legacy dialog state for overview components
  const editPeriodDialogOpen$ = React.useMemo(() => signal(false), [])
  const editingPeriod$ = React.useMemo(() => signal<Option.Option<SelectionPeriodWithStats>>(Option.none()), [])
  const editTopicDialogOpen$ = React.useMemo(() => signal(false), [])
  const editingTopic$ = React.useMemo(() => signal<Option.Option<Doc<"topics">>>(Option.none()), [])

  // ============================================================================
  // CONVEX QUERIES - Root VM fetches all data
  // ============================================================================

  const periodsData = useQuery(api.selectionPeriods.getAllPeriodsWithStats)
  const topicsData = useQuery(api.topics.getAllTopics, {})
  const currentPeriodData = useQuery(api.admin.getCurrentPeriod)
  const statsData = useQuery(api.stats.getLandingStats, {})
  const topicAnalyticsData = useQuery(api.topicAnalytics.getTopicPerformanceAnalytics, {})

  // Additional queries for child VMs
  const assignmentsData = useQuery(
    api.assignments.getAllAssignmentsForExport,
    currentPeriodData?._id ? { periodId: currentPeriodData._id } : "skip"
  )
  const questionsData = useQuery(api.questions.getAllQuestions, {})
  const templatesData = useQuery(api.questionTemplates.getAllTemplatesWithQuestionIds, {})
  const existingQuestionsData = useQuery(
    api.selectionQuestions.getQuestionsForPeriod,
    editingPeriod$.value && Option.isSome(editingPeriod$.value)
      ? { selectionPeriodId: editingPeriod$.value.value._id }
      : "skip"
  )
  const categoriesData = useQuery(api.categories.getAllCategories, {})
  const categoryNamesData = useQuery(api.categories.getCategoryNames, {})
  const studentsData = useQuery(
    api.studentAnswers.getAllPeriodsStudentsWithCompletionStatus,
    {}
  )

  // ============================================================================
  // CONVEX MUTATIONS - Root VM owns all mutations
  // ============================================================================

  const createPeriodMutation = useMutation(api.selectionPeriods.createPeriod)
  const updatePeriodMutation = useMutation(api.selectionPeriods.updatePeriod)
  const deletePeriodMutation = useMutation(api.selectionPeriods.deletePeriod)
  const setActivePeriodMutation = useMutation(api.selectionPeriods.setActivePeriod)
  const addQuestionMutation = useMutation(api.selectionQuestions.addQuestion)
  const removeQuestionMutation = useMutation(api.selectionQuestions.removeQuestion)

  const createTopicMutation = useMutation(api.admin.createTopic)
  const updateTopicMutation = useMutation(api.admin.updateTopic)
  const deleteTopicMutation = useMutation(api.admin.deleteTopic)
  const toggleTopicActiveMutation = useMutation(api.admin.toggleTopicActive)

  const createQuestionMutation = useMutation(api.questions.createQuestion)
  const updateQuestionMutation = useMutation(api.questions.updateQuestion)
  const deleteQuestionMutation = useMutation(api.questions.deleteQuestion)
  const createTemplateMutation = useMutation(api.questionTemplates.createTemplate)
  const updateTemplateMutation = useMutation(api.questionTemplates.updateTemplate)
  const deleteTemplateMutation = useMutation(api.questionTemplates.deleteTemplate)
  const addQuestionToTemplateMutation = useMutation(api.templateQuestions.addQuestion)
  const reorderTemplateQuestionsMutation = useMutation(api.templateQuestions.reorder)
  const createCategoryMutation = useMutation(api.categories.createCategory)
  const updateCategoryMutation = useMutation(api.categories.updateCategory)
  const deleteCategoryMutation = useMutation(api.categories.deleteCategory)
  const saveAnswersAsTeacherMutation = useMutation(api.studentAnswers.saveAnswersAsTeacher)

  const seedTestDataMutation = useMutation(api.admin.seedTestData)
  const clearAllDataMutation = useMutation(api.admin.clearAllData)
  const setupExperimentMutation = useMutation(api.admin.setupExperiment)
  const generateRandomAnswersMutation = useMutation(api.admin.generateRandomAnswers)

  // ============================================================================
  // DATA SIGNALS - Updated when query data changes
  // ============================================================================

  const dataSignals = React.useRef({
    periodsData$: signal<typeof periodsData>(undefined),
    currentPeriodData$: signal<typeof currentPeriodData>(undefined),
    assignmentsData$: signal<typeof assignmentsData>(undefined),
    topicsData$: signal<typeof topicsData>(undefined),
    periodsForTopics$: signal<typeof periodsData>(undefined),
    questionsData$: signal<typeof questionsData>(undefined),
    templatesData$: signal<typeof templatesData>(undefined),
    existingQuestionsData$: signal<typeof existingQuestionsData>(undefined),
    categoriesData$: signal<typeof categoriesData>(undefined),
    categoryNamesData$: signal<typeof categoryNamesData>(undefined),
    studentsData$: signal<typeof studentsData>(undefined),
    statsData$: signal<typeof statsData>(undefined),
    topicAnalyticsData$: signal<typeof topicAnalyticsData>(undefined),
  }).current

  // Update signals when query data changes - must be in useEffect to avoid setState during render
  React.useEffect(() => {
    batch(() => {
      dataSignals.periodsData$.value = periodsData
      dataSignals.currentPeriodData$.value = currentPeriodData
      dataSignals.assignmentsData$.value = assignmentsData
      dataSignals.topicsData$.value = topicsData
      dataSignals.periodsForTopics$.value = periodsData
      dataSignals.questionsData$.value = questionsData
      dataSignals.templatesData$.value = templatesData
      dataSignals.existingQuestionsData$.value = existingQuestionsData
      dataSignals.categoriesData$.value = categoriesData
      dataSignals.categoryNamesData$.value = categoryNamesData
      dataSignals.studentsData$.value = studentsData
      dataSignals.statsData$.value = statsData
      dataSignals.topicAnalyticsData$.value = topicAnalyticsData
    })
  }, [periodsData, currentPeriodData, assignmentsData, topicsData, questionsData, templatesData, existingQuestionsData, categoriesData, categoryNamesData, studentsData, statsData, topicAnalyticsData, dataSignals])

  // Computed: mock assignments based on current period
  // (Will be replaced with real data when available)
  const assignments$ = computed((): readonly AssignmentItemVM[] => {
    const periodOption = Option.fromNullable(currentPeriodData)
    return Option.match(periodOption, {
      onNone: () => [],
      onSome: (period) => SelectionPeriodModule.match(period)({
        assigned: () => [
          {
            key: "a1",
            studentId: "#6367261",
            topicTitle: "ML Recommendation System",
            preferenceRank: 5,
            isMatched: true,
            matchDisplay: "✓ Matched",
            matchVariant: "outline" as const,
            matchColor: "text-green-600 border-green-600",
            rankDisplay: "#5",
            rankVariant: "secondary" as const,
            statusDisplay: "assigned",
            statusColor: "bg-purple-600 text-white"
          },
          {
            key: "a2",
            studentId: "#6367262",
            topicTitle: "Blockchain Smart Contracts",
            preferenceRank: 1,
            isMatched: true,
            matchDisplay: "✓ Matched",
            matchVariant: "outline" as const,
            matchColor: "text-green-600 border-green-600",
            rankDisplay: "#1",
            rankVariant: "default" as const,
            statusDisplay: "assigned",
            statusColor: "bg-purple-600 text-white"
          },
          {
            key: "a3",
            studentId: "#6367263",
            topicTitle: "Cloud Migration Strategy",
            preferenceRank: 2,
            isMatched: true,
            matchDisplay: "✓ Matched",
            matchVariant: "outline" as const,
            matchColor: "text-green-600 border-green-600",
            rankDisplay: "#2",
            rankVariant: "default" as const,
            statusDisplay: "assigned",
            statusColor: "bg-purple-600 text-white"
          },
        ],
        open: () => [],
        inactive: () => [],
        closed: () => []
      })
    })
  })

  // Computed: existing question IDs for the currently editing period (if any)
  const existingQuestionIds$ = computed((): readonly string[] => {
    const existingQuestionsData = dataSignals.existingQuestionsData$.value
    return (existingQuestionsData ?? []).map((sq) => sq.questionId)
  })

  // Computed: periods list for table
  const periods$ = computed((): Loadable.Loadable<readonly PeriodItemVM[]> => {
    if (periodsData === undefined) {
      return Loadable.pending()
    }

    const items = periodsData.map((p): PeriodItemVM => {
      const status: { display: string; variant: "default" | "secondary" | "outline"; color: string } = SelectionPeriodModule.match(p)({
        open: () => ({ display: "OPEN", variant: "default" as "default" | "secondary" | "outline", color: "bg-green-600 text-white" }),
        inactive: () => ({ display: "INACTIVE", variant: "secondary" as "default" | "secondary" | "outline", color: "bg-blue-600 text-white" }),
        closed: () => ({ display: "CLOSED", variant: "outline" as "default" | "secondary" | "outline", color: "bg-red-600 text-white" }),
        assigned: () => ({ display: "ASSIGNED", variant: "secondary" as "default" | "secondary" | "outline", color: "bg-purple-600 text-white" })
      })

      const canSetActive = SelectionPeriodModule.match(p)({
        open: () => false,
        inactive: () => true,
        closed: () => true,
        assigned: () => true
      })

      return {
        key: p._id,
        title: p.title,
        statusDisplay: status.display,
        statusVariant: status.variant,
        statusColor: status.color,
        openDateDisplay: format(p.openDate, "MMM d, yyyy"),
        closeDateDisplay: format(p.closeDate, "MMM d, yyyy"),
        studentCount: p.studentCount ?? 0,
        assignmentCount: p.assignmentCount ?? 0,
        setActive: () => {
          setActivePeriodMutation({ periodId: p._id }).catch(console.error)
        },
        edit: () => {
          editingPeriod$.value = Option.some(p)
          editPeriodDialogOpen$.value = true
        },
        remove: () => {
          deletePeriodMutation({ periodId: p._id }).catch(console.error)
        },
        canSetActive
      }
    })

    return Loadable.ready(items)
  })

  // Computed: topics list for table
  const topics$ = computed((): Loadable.Loadable<readonly TopicItemVM[]> => {
    if (topicsData === undefined) {
      return Loadable.pending()
    }

    const items = topicsData.map((t): TopicItemVM => ({
      key: t._id,
      title: t.title,
      description: t.description,
      statusDisplay: t.isActive ? "Active" : "Inactive",
      statusVariant: t.isActive ? "default" : "secondary",
      selectionCount: 0, // TODO: Add real selection count when available
      toggleActive: () => {
        toggleTopicActiveMutation({ id: t._id }).catch(console.error)
      },
      edit: () => {
        editingTopic$.value = Option.some(t)
        editTopicDialogOpen$.value = true
      },
      remove: () => {
        deleteTopicMutation({ id: t._id }).catch((error) => {
          console.error("Failed to delete topic:", error)
          toast.error(
            error instanceof Error && error.message.includes("student selections")
              ? "Cannot delete topic with existing student selections"
              : "Failed to delete topic. Please try again."
          )
        })
      }
    }))

    return Loadable.ready(items)
  })

  // Computed: current period signal (readonly wrapper)
  const currentPeriod$ = computed(() => Option.fromNullable(currentPeriodData))

  // Computed: stats with pre-formatted displays
  const stats$ = computed((): StatsVM => {
    const activeTopicsCount = (topicsData ?? []).filter(t => t.isActive).length
    const totalTopicsCount = topicsData?.length ?? 0
    const totalStudents = statsData?.totalStudents ?? 0
    const totalSelections = statsData?.totalSelections ?? 0
    const avgSelections = statsData?.averageSelectionsPerStudent ?? 0

    const assignmentsArray = assignments$.value
    const matchedAssignments = assignmentsArray.filter(a => a.isMatched).length
    const topChoiceAssignments = assignmentsArray.filter(a => a.preferenceRank === 1).length
    const matchRate = assignmentsArray.length > 0 ? (matchedAssignments / assignmentsArray.length) * 100 : 0
    const topChoiceRate = assignmentsArray.length > 0 ? (topChoiceAssignments / assignmentsArray.length) * 100 : 0

    const periodOption = Option.fromNullable(currentPeriodData)
    const currentPeriodDisplay = Option.match(periodOption, {
      onNone: () => "NONE",
      onSome: (period) => SelectionPeriodModule.match(period)({
        open: () => "OPEN",
        assigned: () => "ASSIGNED",
        inactive: () => "INACTIVE",
        closed: () => "CLOSED"
      })
    })

    const currentPeriodVariant = Option.match(periodOption, {
      onNone: () => "",
      onSome: (period) => SelectionPeriodModule.match(period)({
        open: () => "border-green-200 bg-green-50/50",
        assigned: () => "border-purple-200 bg-purple-50/50",
        inactive: () => "",
        closed: () => ""
      })
    })

    return {
      totalTopicsDisplay: String(totalTopicsCount),
      activeTopicsDisplay: String(activeTopicsCount),
      totalStudentsDisplay: String(totalStudents),
      totalSelectionsDisplay: String(totalSelections),
      averageSelectionsDisplay: avgSelections.toFixed(1),
      matchRateDisplay: `${matchRate.toFixed(0)}%`,
      topChoiceRateDisplay: `${topChoiceRate.toFixed(0)}%`,
      currentPeriodDisplay,
      currentPeriodVariant
    }
  })

  // Computed: helper booleans
  const hasAssignments$ = computed(() => assignments$.value.length > 0)
  const hasPeriods$ = computed(() =>
    Loadable.isReady(periods$.value) && periods$.value.value.length > 0
  )
  const hasTopics$ = computed(() =>
    Loadable.isReady(topics$.value) && topics$.value.value.length > 0
  )

  // Computed: period options for forms
  // Deduplicate by semesterId - keep the most recent period for each semester
  const periodOptions$ = computed((): readonly PeriodOption[] => {
    const periods = periodsData ?? []

    // Group by semesterId and keep the most recent one (already sorted by closeDate desc)
    const seenSemesters = new Map<string, typeof periods[0]>()
    for (const period of periods) {
      if (!seenSemesters.has(period.semesterId)) {
        seenSemesters.set(period.semesterId, period)
      }
    }

    // Convert to options with unique keys
    return Array.from(seenSemesters.values()).map(p => ({
      value: p.semesterId,
      label: p.title,
      id: p._id // Use period ID as unique key for React
    }))
  })

  // Actions
  const setActiveView = (view: ViewType): void => {
    activeView$.value = view
  }

  const createPeriod = (data: PeriodFormData): void => {
    createPeriodMutation({
      title: data.title,
      description: data.description,
      semesterId: data.semesterId,
      openDate: data.openDate.getTime(),
      closeDate: data.closeDate.getTime(),
    }).catch(console.error)
  }

  const updatePeriod = (id: Id<"selectionPeriods">, updates: Partial<PeriodFormData>): void => {
    updatePeriodMutation({
      periodId: id,
      title: updates.title,
      description: updates.description,
      openDate: updates.openDate?.getTime(),
      closeDate: updates.closeDate?.getTime()
    }).catch(console.error)
  }

  const deletePeriod = (id: Id<"selectionPeriods">): void => {
    deletePeriodMutation({ periodId: id }).catch(console.error)
  }

  const setActivePeriod = (id: Id<"selectionPeriods">): void => {
    setActivePeriodMutation({ periodId: id }).catch(console.error)
  }

  const createTopic = (data: TopicFormData): void => {
    createTopicMutation({
      title: data.title,
      description: data.description,
      semesterId: data.semesterId,
    }).catch(console.error)
  }

  const updateTopic = (id: Id<"topics">, updates: Partial<TopicFormData>): void => {
    updateTopicMutation({
      id,
      title: updates.title,
      description: updates.description,
    }).catch(console.error)
  }

  const toggleTopicActive = (id: Id<"topics">): void => {
    toggleTopicActiveMutation({ id }).catch(console.error)
  }

  const deleteTopic = (id: Id<"topics">): void => {
    deleteTopicMutation({ id }).catch(console.error)
  }

  const assignTopics = (_periodId: Id<"selectionPeriods">): void => {
    // TODO: Implement actual assignment logic
    console.log("Assign topics not yet implemented")
  }

  const seedTestData = (): void => {
    seedTestDataMutation({}).catch(console.error)
  }

  const clearAllData = (): void => {
    clearAllDataMutation({}).catch(console.error)
  }

  // ============================================================================
  // COMPOSE CHILD VMs ONCE using useRef
  // ============================================================================

  const vm = React.useRef<DashboardVM | null>(null)

  if (vm.current === null) {
    // Create child VMs by calling their factory functions
    const periodsView = createPeriodsViewVM({
      periodsData$: dataSignals.periodsData$,
      currentPeriodData$: dataSignals.currentPeriodData$,
      assignmentsData$: computed(() => {
        const data = dataSignals.assignmentsData$.value
        if (!data) return undefined
        return data.map((a): any => ({
          studentId: a.student_id,
          topicTitle: a.assigned_topic,
          preferenceRank: 0,
          isMatched: false,
          status: "assigned"
        }))
      }),
      topicsData$: dataSignals.topicsData$,
      existingTopicsData$: computed(() => []), // Will be computed based on editing period's semester
      categoriesData$: dataSignals.categoriesData$, // Will be filtered to minimize in PeriodsViewVM
      createPeriod: createPeriodMutation,
      updatePeriod: updatePeriodMutation,
      deletePeriod: deletePeriodMutation,
      addQuestion: addQuestionMutation,
      removeQuestion: removeQuestionMutation,
    })

    const topicsView = createTopicsViewVM({
      topics$: dataSignals.topicsData$,
      categories$: dataSignals.categoriesData$, // Will be filtered to pull/prerequisite in TopicsViewVM
      createTopic: createTopicMutation as any, // Type cast to handle constraintIds type mismatch
      updateTopic: updateTopicMutation,
      deleteTopic: deleteTopicMutation,
    })

    const questionnairesView = createQuestionnairesViewVM({
      questions$: dataSignals.questionsData$ as any, // Type cast to handle "0to6" vs "numeric" mismatch
      templates$: dataSignals.templatesData$,
      categories$: dataSignals.categoriesData$,
      existingCategories$: dataSignals.categoryNamesData$,
      createQuestion: createQuestionMutation as any, // Type cast to handle category optional vs required mismatch
      updateQuestion: updateQuestionMutation,
      deleteQuestion: deleteQuestionMutation,
      createTemplate: createTemplateMutation,
      updateTemplate: updateTemplateMutation,
      deleteTemplate: deleteTemplateMutation,
      getTemplateWithQuestions: (args) => convex.query(api.questionTemplates.getTemplateWithQuestions, args) as Promise<any>,
      addQuestionToTemplate: addQuestionToTemplateMutation,
      reorderTemplateQuestions: reorderTemplateQuestionsMutation,
      createCategory: createCategoryMutation as any, // Type cast to handle criterionType null vs optional mismatch
      updateCategory: updateCategoryMutation as any, // Type cast to handle criterionType null vs optional mismatch
      deleteCategory: deleteCategoryMutation,
    })

    const settingsView = createSettingsViewVM({
      seedTestDataMutation,
      clearAllDataMutation,
      setupExperimentMutation,
      generateRandomAnswersMutation,
    })

    const studentsView = createStudentsViewVM({
      allPeriodsStudentsData$: dataSignals.studentsData$,
      saveAnswersAsTeacher: saveAnswersAsTeacherMutation,
    })

    // Legacy dialog VMs for overview compatibility
    const editPeriodDialog: EditPeriodDialogVM = {
      isOpen$: editPeriodDialogOpen$,
      editingPeriod$,
      open: (period: SelectionPeriodWithStats) => {
        editingPeriod$.value = Option.some(period)
        editPeriodDialogOpen$.value = true
      },
      close: () => {
        editPeriodDialogOpen$.value = false
        editingPeriod$.value = Option.none()
      }
    }

    const editTopicDialog: EditTopicDialogVM = {
      isOpen$: editTopicDialogOpen$,
      editingTopic$,
      open: (topic: Doc<"topics">) => {
        editingTopic$.value = Option.some(topic)
        editTopicDialogOpen$.value = true
      },
      close: () => {
        editTopicDialogOpen$.value = false
        editingTopic$.value = Option.none()
      }
    }

    // Actions
    const setActiveView = (view: ViewType): void => {
      activeView$.value = view
    }

    // Legacy actions for backward compatibility
    const createPeriod = (data: PeriodFormData): void => {
      createPeriodMutation({
        title: data.title,
        description: data.description,
        semesterId: data.semesterId,
        openDate: data.openDate.getTime(),
        closeDate: data.closeDate.getTime(),
      }).catch(console.error)
    }

    const updatePeriod = (id: Id<"selectionPeriods">, updates: Partial<PeriodFormData>): void => {
      updatePeriodMutation({
        periodId: id,
        title: updates.title,
        description: updates.description,
        openDate: updates.openDate?.getTime(),
        closeDate: updates.closeDate?.getTime()
      }).catch(console.error)
    }

    const deletePeriod = (id: Id<"selectionPeriods">): void => {
      deletePeriodMutation({ periodId: id }).catch(console.error)
    }

    const setActivePeriod = (id: Id<"selectionPeriods">): void => {
      setActivePeriodMutation({ periodId: id }).catch(console.error)
    }

    const createTopic = (data: TopicFormData): void => {
      createTopicMutation({
        title: data.title,
        description: data.description,
        semesterId: data.semesterId,
      }).catch(console.error)
    }

    const updateTopic = (id: Id<"topics">, updates: Partial<TopicFormData>): void => {
      updateTopicMutation({
        id,
        title: updates.title,
        description: updates.description,
      }).catch(console.error)
    }

    const toggleTopicActive = (id: Id<"topics">): void => {
      toggleTopicActiveMutation({ id }).catch(console.error)
    }

    const deleteTopic = (id: Id<"topics">): void => {
      deleteTopicMutation({ id }).catch(console.error)
    }

    const assignTopics = (_periodId: Id<"selectionPeriods">): void => {
      // TODO: Implement actual assignment logic
      console.log("Assign topics not yet implemented")
    }

    const seedTestData = (): void => {
      seedTestDataMutation({}).catch(console.error)
    }

    const clearAllData = (): void => {
      clearAllDataMutation({}).catch(console.error)
    }

    const updatePeriodFromForm = (values: SelectionPeriodFormValues): void => {
      Option.match(editingPeriod$.value, {
        onNone: () => { },
        onSome: (editingPeriod) => {
          if (!editingPeriod._id) return
          updatePeriodMutation({
            periodId: editingPeriod._id,
            title: values.title,
            openDate: values.start_deadline.getTime(),
            closeDate: values.end_deadline.getTime()
          }).then(() => {
            editPeriodDialogOpen$.value = false
            editingPeriod$.value = Option.none()
          }).catch(console.error)
        }
      })
    }

    const updateTopicFromForm = (values: TopicFormValues): void => {
      Option.match(editingTopic$.value, {
        onNone: () => { },
        onSome: (editingTopic) => {
          if (!editingTopic._id) return
          updateTopicMutation({
            id: editingTopic._id,
            title: values.title,
            description: values.description
          }).then(() => {
            editTopicDialogOpen$.value = false
            editingTopic$.value = Option.none()
          }).catch(console.error)
        }
      })
    }

    // Create the complete VM
    vm.current = {
      activeView$,
      currentPeriod$,
      stats$,
      hasAssignments$,
      hasPeriods$,
      hasTopics$,
      periodOptions$,
      constraintOptions$: periodOptions$, // Alias for TopicsView compatibility

      // Child VMs
      periodsView,
      topicsView,
      questionnairesView,
      settingsView,
      studentsView,

      // Legacy support for overview
      periods$,
      topics$,
      assignments$,
      editPeriodDialog,
      editTopicDialog,
      updatePeriodFromForm,
      updateTopicFromForm,

      // Actions
      setActiveView,
      createPeriod,
      updatePeriod,
      deletePeriod,
      setActivePeriod,
      createTopic,
      updateTopic,
      toggleTopicActive,
      deleteTopic,
      assignTopics,
      seedTestData,
      clearAllData,

      // Raw data
      topicAnalytics: topicAnalyticsData,
      existingQuestionIds$: existingQuestionIds$,
    }
  }

  return vm.current as DashboardVM
}
