"use client"

import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"
import type { Id } from "@/convex/_generated/dataModel"

// ============================================================================
// TYPES
// ============================================================================

export type ViewType = "periods" | "topics" | "students" | "analytics" | "settings"

export interface SelectionPeriod {
  readonly _id: Id<"selectionPeriods">
  readonly title: string
  readonly description: string
  readonly semesterId: string
  readonly openDate: number
  readonly closeDate: number
  readonly status: "open" | "upcoming" | "closed" | "assigned"
  readonly isActive: boolean
  readonly studentCount?: number
  readonly assignmentCount?: number
}

export interface Topic {
  readonly _id: Id<"topics">
  readonly title: string
  readonly description: string
  readonly semesterId: string
  readonly isActive: boolean
  readonly subtopicIds?: readonly Id<"subtopics">[]
}

export interface Subtopic {
  readonly _id: Id<"subtopics">
  readonly title: string
  readonly description: string
}

export interface AdminDashboardState {
  readonly activeView: ViewType
  readonly periods: readonly SelectionPeriod[] | undefined
  readonly topics: readonly Topic[] | undefined
  readonly subtopics: readonly Subtopic[] | undefined
  readonly currentPeriod: SelectionPeriod | null | undefined
  readonly stats: {
    readonly totalTopics: number
    readonly totalStudents: number
    readonly totalSelections: number
    readonly averageSelectionsPerStudent: number
    readonly isActive: boolean
    readonly periodStatus?: string
  } | undefined
  readonly topicAnalytics: readonly unknown[] | undefined
}

export interface AdminDashboardActions {
  readonly setActiveView: (view: ViewType) => void
  readonly createPeriod: (period: PeriodFormData) => Promise<void>
  readonly updatePeriod: (id: Id<"selectionPeriods">, updates: Partial<PeriodFormData>) => Promise<void>
  readonly deletePeriod: (id: Id<"selectionPeriods">) => Promise<void>
  readonly setActivePeriod: (id: Id<"selectionPeriods">) => Promise<void>
  readonly createTopic: (topic: TopicFormData) => Promise<void>
  readonly updateTopic: (id: Id<"topics">, updates: Partial<TopicFormData>) => Promise<void>
  readonly deleteTopic: (id: Id<"topics">) => Promise<void>
  readonly createSubtopic: (subtopic: SubtopicFormData) => Promise<void>
  readonly deleteSubtopic: (id: Id<"subtopics">) => Promise<void>
  readonly seedTestData: () => Promise<void>
  readonly clearAllData: () => Promise<void>
}

export interface PeriodFormData {
  readonly title: string
  readonly description: string
  readonly semesterId: string
  readonly openDate: Date
  readonly closeDate: Date
  readonly setAsActive?: boolean
}

export interface TopicFormData {
  readonly title: string
  readonly description: string
  readonly semesterId: string
  readonly subtopicIds?: readonly Id<"subtopics">[]
}

export interface SubtopicFormData {
  readonly title: string
  readonly description: string
}

// ============================================================================
// CONTEXT
// ============================================================================

const AdminDashboardContext = React.createContext<
  (AdminDashboardState & AdminDashboardActions) | null
>(null)

export const useAdminDashboard = () => {
  const context = React.useContext(AdminDashboardContext)
  if (!context) {
    throw new Error("useAdminDashboard must be used within AdminDashboardProvider")
  }
  return context
}

// ============================================================================
// PROVIDER
// ============================================================================

export interface ProviderProps {
  readonly children: React.ReactNode
}

export const Provider: React.FC<ProviderProps> = ({ children }) => {
  const [activeView, setActiveView] = React.useState<ViewType>("periods")
  
  // Queries
  const periods = useQuery(api.selectionPeriods.getAllPeriodsWithStats)
  const topics = useQuery(api.topics.getAllTopics, {})
  const subtopics = useQuery(api.subtopics.getAllSubtopics, {})
  const currentPeriod = useQuery(api.admin.getCurrentPeriod)
  const stats = useQuery(api.stats.getLandingStats)
  const topicAnalytics = useQuery(api.topicAnalytics.getTopicPerformanceAnalytics, {})

  // Mutations
  const createPeriodMutation = useMutation(api.selectionPeriods.createPeriod)
  const updatePeriodMutation = useMutation(api.selectionPeriods.updatePeriod)
  const deletePeriodMutation = useMutation(api.selectionPeriods.deletePeriod)
  const setActivePeriodMutation = useMutation(api.selectionPeriods.setActivePeriod)
  const createTopicMutation = useMutation(api.admin.createTopic)
  const updateTopicMutation = useMutation(api.admin.updateTopic)
  const deleteTopicMutation = useMutation(api.admin.deleteTopic)
  const createSubtopicMutation = useMutation(api.subtopics.createSubtopic)
  const deleteSubtopicMutation = useMutation(api.subtopics.deleteSubtopic)
  const seedTestDataMutation = useMutation(api.admin.seedTestData)
  const clearAllDataMutation = useMutation(api.admin.clearAllData)

  // Actions
  const createPeriod = React.useCallback(async (data: PeriodFormData) => {
    try {
      await createPeriodMutation({
        title: data.title,
        description: data.description,
        semesterId: data.semesterId,
        openDate: data.openDate.getTime(),
        closeDate: data.closeDate.getTime(),
        setAsActive: data.setAsActive
      })
      toast.success("Selection period created successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create period")
      throw error
    }
  }, [createPeriodMutation])

  const updatePeriod = React.useCallback(async (id: Id<"selectionPeriods">, updates: Partial<PeriodFormData>) => {
    try {
      await updatePeriodMutation({
        periodId: id,
        title: updates.title,
        description: updates.description,
        openDate: updates.openDate?.getTime(),
        closeDate: updates.closeDate?.getTime()
      })
      toast.success("Period updated successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update period")
      throw error
    }
  }, [updatePeriodMutation])

  const deletePeriod = React.useCallback(async (id: Id<"selectionPeriods">) => {
    try {
      await deletePeriodMutation({ periodId: id })
      toast.success("Period deleted successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete period")
      throw error
    }
  }, [deletePeriodMutation])

  const setActivePeriod = React.useCallback(async (id: Id<"selectionPeriods">) => {
    try {
      await setActivePeriodMutation({ periodId: id })
      toast.success("Period activated successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to activate period")
      throw error
    }
  }, [setActivePeriodMutation])

  const createTopic = React.useCallback(async (data: TopicFormData) => {
    try {
      await createTopicMutation({
        title: data.title,
        description: data.description,
        semesterId: data.semesterId,
        subtopicIds: data.subtopicIds ? [...data.subtopicIds] : undefined
      })
      toast.success("Topic created successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create topic")
      throw error
    }
  }, [createTopicMutation])

  const updateTopic = React.useCallback(async (id: Id<"topics">, updates: Partial<TopicFormData>) => {
    try {
      await updateTopicMutation({
        id,
        title: updates.title,
        description: updates.description,
        subtopicIds: updates.subtopicIds ? [...updates.subtopicIds] : undefined
      })
      toast.success("Topic updated successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update topic")
      throw error
    }
  }, [updateTopicMutation])

  const deleteTopic = React.useCallback(async (id: Id<"topics">) => {
    try {
      await deleteTopicMutation({ id })
      toast.success("Topic deleted successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete topic")
      throw error
    }
  }, [deleteTopicMutation])

  const createSubtopic = React.useCallback(async (data: SubtopicFormData) => {
    try {
      await createSubtopicMutation({
        title: data.title,
        description: data.description
      })
      toast.success("Subtopic created successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create subtopic")
      throw error
    }
  }, [createSubtopicMutation])

  const deleteSubtopic = React.useCallback(async (id: Id<"subtopics">) => {
    try {
      await deleteSubtopicMutation({ id })
      toast.success("Subtopic deleted successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete subtopic")
      throw error
    }
  }, [deleteSubtopicMutation])

  const seedTestData = React.useCallback(async () => {
    try {
      await seedTestDataMutation({})
      toast.success("Test data seeded successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to seed test data")
      throw error
    }
  }, [seedTestDataMutation])

  const clearAllData = React.useCallback(async () => {
    try {
      await clearAllDataMutation({})
      toast.success("All data cleared successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear data")
      throw error
    }
  }, [clearAllDataMutation])

  const value = React.useMemo(
    () => ({
      activeView,
      periods,
      topics,
      subtopics,
      currentPeriod,
      stats,
      topicAnalytics,
      setActiveView,
      createPeriod,
      updatePeriod,
      deletePeriod,
      setActivePeriod,
      createTopic,
      updateTopic,
      deleteTopic,
      createSubtopic,
      deleteSubtopic,
      seedTestData,
      clearAllData
    }),
    [
      activeView, periods, topics, subtopics, currentPeriod, stats, topicAnalytics,
      createPeriod, updatePeriod, deletePeriod, setActivePeriod,
      createTopic, updateTopic, deleteTopic, createSubtopic, deleteSubtopic,
      seedTestData, clearAllData
    ]
  )

  return (
    <AdminDashboardContext.Provider value={value}>
      {children}
    </AdminDashboardContext.Provider>
  )
}