"use client"

import * as React from "react"
import * as Option from "effect/Option"
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
import { useSignals } from "@preact/signals-react/runtime"
import * as Loadable from "@/lib/Loadable"
import {
  useDashboardVM,
  type ViewType,
  type PeriodFormData,
  type TopicFormData,
  type SelectionPeriodWithStats
} from "./DashboardVM"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { LandingStats } from "@/convex/stats"

// Export the VM hook
export { useDashboardVM }

// ============================================================================
// LEGACY TYPES (for backwards compatibility with existing components)
// ============================================================================

export type { ViewType, PeriodFormData, TopicFormData, SelectionPeriodWithStats }

export interface Assignment {
  readonly studentId: string
  readonly name?: string // Optional name (GDPR: only if provided by teacher)
  readonly topicTitle: string
  readonly preferenceRank: number
  readonly isMatched: boolean
  readonly status: "assigned" | "pending"
}

export interface DashboardState {
  readonly activeView: ViewType
  readonly periods: readonly SelectionPeriodWithStats[] | undefined
  readonly topics: readonly Doc<"topics">[] | undefined
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
    readonly currentPeriodDisplay: string
    readonly currentPeriodVariant: string
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

// ============================================================================
// CONTEXT (for child components that need raw data)
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
  useSignals()
  const vm = useDashboardVM()

  // Get raw data from queries for legacy context
  const periodsData = useQuery(api.selectionPeriods.getAllPeriodsWithStats)
  const topicsData = useQuery(api.topics.getAllTopics, {})

  // Extract signal values for legacy context
  const stats = vm.stats$.value
  const legacyStats = {
    totalTopics: parseInt(stats.totalTopicsDisplay),
    activeTopics: parseInt(stats.activeTopicsDisplay),
    totalStudents: parseInt(stats.totalStudentsDisplay),
    totalSelections: 0,
    averageSelectionsPerStudent: parseFloat(stats.averageSelectionsDisplay),
    matchRate: parseFloat(stats.matchRateDisplay.replace('%', '')),
    topChoiceRate: parseFloat(stats.topChoiceRateDisplay.replace('%', '')),
    currentPeriodDisplay: stats.currentPeriodDisplay,
    currentPeriodVariant: stats.currentPeriodVariant
  }

  const legacyAssignments: Assignment[] = vm.assignments$.value.map(a => ({
    studentId: a.studentId,
    topicTitle: a.topicTitle,
    preferenceRank: a.preferenceRank,
    isMatched: a.isMatched,
    status: a.statusDisplay as "assigned" | "pending"
  }))

  // Legacy interface compatibility - thin wrappers to convert void -> Promise
  const value: DashboardState & DashboardActions = {
    activeView: vm.activeView$.value,
    periods: periodsData ?? undefined,
    topics: topicsData ?? undefined,
    currentPeriod: Option.getOrNull(vm.currentPeriod$.value),
    assignments: legacyAssignments,
    topicAnalytics: vm.topicAnalytics,
    stats: legacyStats,
    setActiveView: vm.setActiveView,
    createPeriod: async (data) => { vm.createPeriod(data); return "mock_id" as Id<"selectionPeriods"> },
    updatePeriod: async (id, updates) => vm.updatePeriod(id, updates),
    deletePeriod: async (id) => vm.deletePeriod(id),
    setActivePeriod: async (id) => vm.setActivePeriod(id),
    createTopic: async (data) => vm.createTopic(data),
    updateTopic: async (id, updates) => vm.updateTopic(id, updates),
    toggleTopicActive: async (id) => vm.toggleTopicActive(id),
    deleteTopic: async (id) => vm.deleteTopic(id),
    assignTopics: async (periodId) => vm.assignTopics(periodId),
    seedTestData: async () => vm.seedTestData(),
    clearAllData: async () => vm.clearAllData()
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

export interface MetricsGridProps {
  readonly stats?: (LandingStats & { matchRate?: number; topChoiceRate?: number }) | null | undefined
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ stats: statsProp }) => {
  // Use provided stats or fall back to context stats
  const { stats: contextStats } = useDashboard()

  // Transform query stats to legacy format if provided
  const stats = statsProp
    ? {
      totalTopics: statsProp.totalTopics,
      activeTopics: statsProp.totalTopics, // All returned topics are active
      totalStudents: statsProp.totalStudents,
      totalSelections: statsProp.totalSelections,
      averageSelectionsPerStudent: statsProp.averageSelectionsPerStudent,
      matchRate: statsProp.matchRate ?? 0, // Use provided matchRate from assignments
      topChoiceRate: statsProp.topChoiceRate ?? 0, // Use provided topChoiceRate
      currentPeriodDisplay: statsProp.isActive ? (statsProp.title ?? "NONE") : "NONE",
      currentPeriodVariant: statsProp.isActive
        ? (statsProp.periodStatus === "open" ? "border-green-200 bg-green-50/50" : "border-purple-200 bg-purple-50/50")
        : ""
    }
    : contextStats

  if (!stats) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <MetricCard
        title="Total Topics"
        value={stats.totalTopics}
        icon={<FileText className="h-4 w-4" />}
      />
      <MetricCard
        title="Active Topics"
        value={stats.activeTopics}
        icon={<CheckCircle className="h-4 w-4" />}
      />
      <MetricCard
        title="Total Students"
        value={stats.totalStudents}
        icon={<Users className="h-4 w-4" />}
      />
      <MetricCard
        title="Average Selections"
        value={stats.averageSelectionsPerStudent.toFixed(1)}
        icon={<Target className="h-4 w-4" />}
      />
      <MetricCard
        title="Match Rate"
        value={`${stats.matchRate.toFixed(0)}%`}
        icon={<Award className="h-4 w-4" />}
        trend={{ value: 12, isPositive: true }}
      />
      <MetricCard
        title="Current Period"
        value={stats.currentPeriodDisplay}
        icon={<Clock className="h-4 w-4" />}
        className={stats.currentPeriodVariant}
      />
    </div>
  )
}

// ============================================================================
// ATOMIC COMPONENTS - Data Tables
// ============================================================================

export interface AssignmentTableProps {
  readonly assignments?: readonly Assignment[] | null
}

export const AssignmentTable: React.FC<AssignmentTableProps> = ({ assignments: assignmentsProp }) => {
  const { assignments: contextAssignments, stats } = useDashboard()
  const assignments = assignmentsProp ?? contextAssignments

  if (!assignments || assignments.length === 0) return null

  // Calculate match rate for provided assignments
  const matchedAssignments = assignments.filter(a => a.isMatched).length
  const topChoiceAssignments = assignments.filter(a => a.preferenceRank === 1).length
  const matchRate = assignments.length > 0 ? (matchedAssignments / assignments.length) * 100 : 0
  const topChoiceRate = assignments.length > 0 ? (topChoiceAssignments / assignments.length) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Badge variant="outline" className="text-sm">
          Total Assignments: {assignments.length}
        </Badge>
        <Badge variant="outline" className="text-sm">
          Match Rate: {matchRate.toFixed(0)}%
        </Badge>
        <Badge variant="outline" className="text-sm">
          Top Choice: {topChoiceRate.toFixed(0)}%
        </Badge>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Assigned Topic</TableHead>
              <TableHead className="text-center">Preference Match</TableHead>
              <TableHead className="text-center">Rank</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((assignment, idx) => {
              const displayName = assignment.name || assignment.studentId
              return (
              <TableRow key={idx}>
                <TableCell className="font-medium">{displayName}</TableCell>
                <TableCell>{assignment.topicTitle}</TableCell>
                <TableCell className="text-center">
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
                <TableCell className="text-center">
                  <Badge variant={assignment.preferenceRank === 1 ? "default" : "secondary"}>
                    #{assignment.preferenceRank}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className="bg-purple-600 text-white">
                    {assignment.status}
                  </Badge>
                </TableCell>
              </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export interface TopicsTableProps {
  readonly onEdit?: (topic: Doc<"topics">) => void
  readonly showActions?: boolean
}

export const TopicsTable: React.FC<TopicsTableProps> = ({ onEdit, showActions = true }) => {
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
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Selections</TableHead>
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {topics.map((topic) => (
            <TableRow key={topic._id}>
              <TableCell className="font-medium">{topic.title}</TableCell>
              <TableCell className="max-w-xs truncate">{topic.description}</TableCell>
              <TableCell className="text-center">
                <Badge variant={topic.isActive ? "default" : "secondary"}>
                  {topic.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-center">0</TableCell>
              {showActions && (
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
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export interface PeriodsTableProps {
  readonly onEdit?: (period: SelectionPeriodWithStats) => void
  readonly showActions?: boolean
}

export const PeriodsTable: React.FC<PeriodsTableProps> = ({ onEdit, showActions = true }) => {
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
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Open Date</TableHead>
            <TableHead className="text-center">Close Date</TableHead>
            <TableHead className="text-center">Students</TableHead>
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {periods.map((period) => {
            const periodId = period._id
            const rowKey = periodId ?? `${period.semesterId}-${period.openDate}-${period.closeDate}-${period.title}`
            return (
              <TableRow key={rowKey}>
                <TableCell className="font-medium">{period.title}</TableCell>
                <TableCell className="text-center">
                  <Badge className={SelectionPeriodModule.match(period)({
                    open: () => "bg-green-600 text-white",
                    inactive: () => "bg-blue-600 text-white",
                    closed: () => "bg-red-600 text-white",
                    assigned: () => "bg-purple-600 text-white"
                  })}>
                    {SelectionPeriodModule.match(period)({
                      open: () => "Open",
                      inactive: () => "Inactive",
                      closed: () => "Closed",
                      assigned: () => "Assigned"
                    })}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">{format(period.openDate, "MMM d, yyyy")}</TableCell>
                <TableCell className="text-center">{format(period.closeDate, "MMM d, yyyy")}</TableCell>
                <TableCell className="text-center">{period.studentCount || 0}</TableCell>
                {showActions && (
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
                )}
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