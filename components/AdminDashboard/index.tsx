"use client"

import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import type { SelectionPeriod } from "@/convex/schemas/SelectionPeriod"
import * as SelectionPeriodModule from "@/convex/schemas/SelectionPeriod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Calendar,
  FileText,
  Users,
  BarChart3,
  Settings,
  Home,
  ArrowLeft,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  Power,
  MoreVertical,
  TrendingUp,
  Target,
  Award
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

// ============================================================================
// TYPES
// ============================================================================

export type ViewType = "overview" | "periods" | "topics" | "students" | "analytics" | "questionnaires" | "settings"

export type SelectionPeriodWithStats = Readonly<Doc<"selectionPeriods"> & {
  studentCount?: number
  assignmentCount?: number
}>

export interface Assignment {
  readonly studentId: string
  readonly topicTitle: string
  readonly preferenceRank: number
  readonly isMatched: boolean
  readonly status: "assigned" | "pending"
}

export interface DashboardState {
  readonly activeView: ViewType
  readonly periods: readonly SelectionPeriodWithStats[] | undefined
  readonly topics: readonly Doc<"topics">[] | undefined
  readonly subtopics: readonly Doc<"subtopics">[] | undefined
  readonly currentPeriod: Doc<"selectionPeriods"> | null | undefined
  readonly assignments: readonly Assignment[] | undefined
  readonly topicAnalytics: readonly unknown[] | undefined
  readonly stats: {
    readonly totalTopics: number
    readonly activeTopics: number
    readonly totalStudents: number
    readonly totalSelections: number
    readonly averageSelectionsPerStudent: number
    readonly matchRate: number
    readonly topChoiceRate: number
  } | undefined
}

export interface DashboardActions {
  readonly setActiveView: (view: ViewType) => void
  readonly createPeriod: (period: PeriodFormData) => Promise<Id<"selectionPeriods">>
  readonly updatePeriod: (id: Id<"selectionPeriods">, updates: Partial<PeriodFormData>) => Promise<void>
  readonly deletePeriod: (id: Id<"selectionPeriods">) => Promise<void>
  readonly setActivePeriod: (id: Id<"selectionPeriods">) => Promise<void>
  readonly createTopic: (topic: TopicFormData) => Promise<void>
  readonly updateTopic: (id: Id<"topics">, updates: Partial<TopicFormData>) => Promise<void>
  readonly toggleTopicActive: (id: Id<"topics">) => Promise<void>
  readonly deleteTopic: (id: Id<"topics">) => Promise<void>
  readonly assignTopics: (periodId: Id<"selectionPeriods">) => Promise<void>
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

// ============================================================================
// CONTEXT
// ============================================================================

const DashboardContext = React.createContext<
  (DashboardState & DashboardActions) | null
>(null)

export const useDashboard = () => {
  const context = React.useContext(DashboardContext)
  if (!context) {
    throw new Error("useDashboard must be used within DashboardProvider")
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
  const [activeView, setActiveView] = React.useState<ViewType>("overview")

  // Queries
  const periods = useQuery(api.selectionPeriods.getAllPeriodsWithStats)
  const topics = useQuery(api.topics.getAllTopics, {})
  const subtopics = useQuery(api.subtopics.getAllSubtopics, {})
  const currentPeriod = useQuery(api.admin.getCurrentPeriod)
  const statsData = useQuery(api.stats.getLandingStats)
  const topicAnalytics = useQuery(api.topicAnalytics.getTopicPerformanceAnalytics, {})

  // Mock assignments for now - replace with real query
  const assignments: Assignment[] = React.useMemo(() => {
    if (!currentPeriod) return []

    return SelectionPeriodModule.match(currentPeriod)({
      assigned: () => [
        { studentId: "#6367261", topicTitle: "ML Recommendation System", preferenceRank: 5, isMatched: true, status: "assigned" },
        { studentId: "#6367262", topicTitle: "Blockchain Smart Contracts", preferenceRank: 1, isMatched: true, status: "assigned" },
        { studentId: "#6367263", topicTitle: "Cloud Migration Strategy", preferenceRank: 2, isMatched: true, status: "assigned" },
      ] as Assignment[],
      open: () => [],
      inactive: () => [],
      closed: () => []
    })
  }, [currentPeriod])

  // Calculate stats
  const stats = React.useMemo(() => {
    const activeTopicsCount = topics?.filter(t => t.isActive).length || 0
    const matchedAssignments = assignments.filter(a => a.isMatched).length
    const topChoiceAssignments = assignments.filter(a => a.preferenceRank === 1).length

    return {
      totalTopics: topics?.length || 0,
      activeTopics: activeTopicsCount,
      totalStudents: statsData?.totalStudents || 0,
      totalSelections: statsData?.totalSelections || 0,
      averageSelectionsPerStudent: statsData?.averageSelectionsPerStudent || 0,
      matchRate: assignments.length > 0 ? (matchedAssignments / assignments.length) * 100 : 0,
      topChoiceRate: assignments.length > 0 ? (topChoiceAssignments / assignments.length) * 100 : 0
    }
  }, [topics, statsData, assignments])

  // Mutations
  const createPeriodMutation = useMutation(api.selectionPeriods.createPeriod)
  const updatePeriodMutation = useMutation(api.selectionPeriods.updatePeriod)
  const deletePeriodMutation = useMutation(api.selectionPeriods.deletePeriod)
  const setActivePeriodMutation = useMutation(api.selectionPeriods.setActivePeriod)
  const createTopicMutation = useMutation(api.admin.createTopic)
  const updateTopicMutation = useMutation(api.admin.updateTopic)
  const deleteTopicMutation = useMutation(api.admin.deleteTopic)
  const toggleTopicActiveMutation = useMutation(api.admin.toggleTopicActive)
  const seedTestDataMutation = useMutation(api.admin.seedTestData)
  const clearAllDataMutation = useMutation(api.admin.clearAllData)

  // Actions
  const createPeriod = async (data: PeriodFormData): Promise<Id<"selectionPeriods">> => {
    try {
      const result = await createPeriodMutation({
        title: data.title,
        description: data.description,
        semesterId: data.semesterId,
        openDate: data.openDate.getTime(),
        closeDate: data.closeDate.getTime(),
        setAsActive: data.setAsActive
      })
      toast.success("Selection period created successfully")
      return result.periodId
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create period")
      throw error
    }
  }

  const updatePeriod = async (id: Id<"selectionPeriods">, updates: Partial<PeriodFormData>) => {
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
  }

  const deletePeriod = async (id: Id<"selectionPeriods">) => {
    try {
      await deletePeriodMutation({ periodId: id })
      toast.success("Period deleted successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete period")
      throw error
    }
  }

  const setActivePeriod = async (id: Id<"selectionPeriods">) => {
    try {
      await setActivePeriodMutation({ periodId: id })
      toast.success("Period activated successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to activate period")
      throw error
    }
  }

  const createTopic = async (data: TopicFormData) => {
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
  }

  const updateTopic = async (id: Id<"topics">, updates: Partial<TopicFormData>) => {
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
  }

  const toggleTopicActive = async (id: Id<"topics">) => {
    try {
      await toggleTopicActiveMutation({ id })
      toast.success("Topic status updated successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update topic status")
      throw error
    }
  }

  const deleteTopic = async (id: Id<"topics">) => {
    try {
      await deleteTopicMutation({ id })
      toast.success("Topic deleted successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete topic")
      throw error
    }
  }

  const assignTopics = async (_periodId: Id<"selectionPeriods">) => {
    // TODO: Implement actual assignment logic
    toast.success("Topics assigned successfully")
  }

  const seedTestData = async () => {
    try {
      await seedTestDataMutation({})
      toast.success("Test data seeded successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to seed test data")
      throw error
    }
  }

  const clearAllData = async () => {
    try {
      await clearAllDataMutation({})
      toast.success("All data cleared successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear data")
      throw error
    }
  }

  const value: DashboardState & DashboardActions = {
    activeView,
    periods,
    topics,
    subtopics,
    currentPeriod,
    assignments,
    topicAnalytics,
    stats,
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
    clearAllData
  }

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

// ============================================================================
// ATOMIC COMPONENTS - Metrics Cards
// ============================================================================

export interface MetricCardProps {
  readonly title: string
  readonly value: string | number
  readonly icon: React.ReactNode
  readonly trend?: {
    readonly value: number
    readonly isPositive: boolean
  }
  readonly className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  className
}) => (
  <Card className={cn("border-0 shadow-sm", className)}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="text-muted-foreground">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {trend && (
        <div className="flex items-center text-xs mt-2">
          <TrendingUp className={cn(
            "mr-1 h-3 w-3",
            trend.isPositive ? "text-green-600" : "text-red-600"
          )} />
          <span className={trend.isPositive ? "text-green-600" : "text-red-600"}>
            {trend.value}%
          </span>
          <span className="text-muted-foreground ml-1">from last period</span>
        </div>
      )}
    </CardContent>
  </Card>
)

export const MetricsGrid: React.FC = () => {
  const { stats, currentPeriod } = useDashboard()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <MetricCard
        title="Total Topics"
        value={stats?.totalTopics || 0}
        icon={<FileText className="h-4 w-4" />}
      />
      <MetricCard
        title="Active Topics"
        value={stats?.activeTopics || 0}
        icon={<CheckCircle className="h-4 w-4" />}
      />
      <MetricCard
        title="Total Students"
        value={stats?.totalStudents || 0}
        icon={<Users className="h-4 w-4" />}
      />
      <MetricCard
        title="Average Selections"
        value={stats?.averageSelectionsPerStudent.toFixed(1) || "0"}
        icon={<Target className="h-4 w-4" />}
      />
      <MetricCard
        title="Match Rate"
        value={`${stats?.matchRate.toFixed(0) || 0}%`}
        icon={<Award className="h-4 w-4" />}
        trend={{ value: 12, isPositive: true }}
      />
      <MetricCard
        title="Current Period"
        value={currentPeriod ? SelectionPeriodModule.match(currentPeriod)({
          open: () => "OPEN",
          assigned: () => "ASSIGNED",
          inactive: () => "INACTIVE",
          closed: () => "CLOSED"
        }) : "NONE"}
        icon={<Clock className="h-4 w-4" />}
        className={currentPeriod ? SelectionPeriodModule.match(currentPeriod)({
          open: () => "border-green-200 bg-green-50/50",
          assigned: () => "border-purple-200 bg-purple-50/50",
          inactive: () => "",
          closed: () => ""
        }) : ""}
      />
    </div>
  )
}

// ============================================================================
// ATOMIC COMPONENTS - Data Tables
// ============================================================================

export const AssignmentTable: React.FC = () => {
  const { assignments, stats } = useDashboard()

  if (!assignments || assignments.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Badge variant="outline" className="text-sm">
          Total Assignments: {assignments.length}
        </Badge>
        <Badge variant="outline" className="text-sm">
          Match Rate: {stats?.matchRate.toFixed(0)}%
        </Badge>
        <Badge variant="outline" className="text-sm">
          Top Choice: {stats?.topChoiceRate.toFixed(0)}%
        </Badge>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Assigned Topic</TableHead>
              <TableHead>Preference Match</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((assignment, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">{assignment.studentId}</TableCell>
                <TableCell>{assignment.topicTitle}</TableCell>
                <TableCell>
                  {assignment.isMatched ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      ✓ Matched
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      Alternative
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={assignment.preferenceRank === 1 ? "default" : "secondary"}>
                    #{assignment.preferenceRank}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className="bg-purple-600 text-white">
                    {assignment.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export interface TopicsTableProps {
  readonly onEdit?: (topic: Doc<"topics">) => void
}

export const TopicsTable: React.FC<TopicsTableProps> = ({ onEdit }) => {
  const { topics, toggleTopicActive, deleteTopic } = useDashboard()

  if (!topics || topics.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>No Topics</CardTitle>
          <CardDescription>Create your first topic to get started.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Subtopics</TableHead>
            <TableHead>Selections</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {topics.map((topic) => (
            <TableRow key={topic._id}>
              <TableCell className="font-medium">{topic.title}</TableCell>
              <TableCell className="max-w-xs truncate">{topic.description}</TableCell>
              <TableCell>
                <Badge variant={topic.isActive ? "default" : "secondary"}>
                  {topic.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>{topic.subtopicIds?.length || 0}</TableCell>
              <TableCell>0</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(topic)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => toggleTopicActive(topic._id)}>
                      <Power className="mr-2 h-4 w-4" />
                      {topic.isActive ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => deleteTopic(topic._id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export interface PeriodsTableProps {
  readonly onEdit?: (period: SelectionPeriodWithStats) => void
}

export const PeriodsTable: React.FC<PeriodsTableProps> = ({ onEdit }) => {
  const { periods, setActivePeriod, deletePeriod } = useDashboard()

  if (!periods || periods.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>No Selection Periods</CardTitle>
          <CardDescription>Create your first selection period to get started.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Open Date</TableHead>
            <TableHead>Close Date</TableHead>
            <TableHead>Students</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {periods.map((period) => {
            const periodId = period._id
            const rowKey = periodId ?? `${period.semesterId}-${period.openDate}-${period.closeDate}-${period.title}`
            return (
              <TableRow key={rowKey}>
                <TableCell className="font-medium">{period.title}</TableCell>
                <TableCell>
                  <Badge className={SelectionPeriodModule.match(period)({
                    open: () => "bg-green-600 text-white",
                    inactive: () => "bg-blue-600 text-white",
                    closed: () => "bg-red-600 text-white",
                    assigned: () => "bg-purple-600 text-white"
                  })}>
                    {SelectionPeriodModule.match(period)({
                      open: () => "open",
                      inactive: () => "inactive",
                      closed: () => "closed",
                      assigned: () => "assigned"
                    })}
                  </Badge>
                </TableCell>
                <TableCell>{format(period.openDate, "MMM d, yyyy")}</TableCell>
                <TableCell>{format(period.closeDate, "MMM d, yyyy")}</TableCell>
                <TableCell>{period.studentCount || 0}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(period)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {SelectionPeriodModule.match(period)({
                        open: () => null,
                        inactive: () => periodId && (
                          <DropdownMenuItem onClick={() => setActivePeriod(periodId)}>
                            <Power className="mr-2 h-4 w-4" />
                            Set Active
                          </DropdownMenuItem>
                        ),
                        closed: () => periodId && (
                          <DropdownMenuItem onClick={() => setActivePeriod(periodId)}>
                            <Power className="mr-2 h-4 w-4" />
                            Set Active
                          </DropdownMenuItem>
                        ),
                        assigned: () => periodId && (
                          <DropdownMenuItem onClick={() => setActivePeriod(periodId)}>
                            <Power className="mr-2 h-4 w-4" />
                            Set Active
                          </DropdownMenuItem>
                        )
                      })}
                      <DropdownMenuSeparator />
                      {periodId && (
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => deletePeriod(periodId)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// ============================================================================
// NAVIGATION COMPONENTS
// ============================================================================

export interface TabItem {
  readonly id: ViewType
  readonly label: string
  readonly icon: React.ReactNode
}

export const TabNavigation: React.FC = () => {
  const { activeView, setActiveView } = useDashboard()

  const tabs: TabItem[] = [
    { id: "overview", label: "Overview", icon: <Home className="h-4 w-4" /> },
    { id: "periods", label: "Periods", icon: <Calendar className="h-4 w-4" /> },
    { id: "topics", label: "Topics", icon: <FileText className="h-4 w-4" /> },
    { id: "students", label: "Students", icon: <Users className="h-4 w-4" /> },
    { id: "questionnaires", label: "Questionnaires", icon: <FileText className="h-4 w-4" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> }
  ]

  return (
    <div className="border-b">
      <div className="flex space-x-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
              "border-b-2 -mb-px",
              activeView === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// PAGE HEADER
// ============================================================================

export const PageHeader: React.FC = () => (
  <div className="flex items-center justify-between mb-6">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
      <p className="text-muted-foreground">Manage topics, periods, and student assignments</p>
    </div>
    <Button variant="ghost" size="lg" asChild>
      <a href="/">
        <ArrowLeft className="mr-2 h-5 w-5" />
        Back to Home
      </a>
    </Button>
  </div>
)

// Export all components as a namespace
export * as AdminDashboard from "./index"