"use client"

import * as React from "react"
import * as AD from "./index"
import * as SelectionPeriod from "@/convex/schemas/SelectionPeriod"
import type { Doc } from "@/convex/_generated/dataModel"
import { useRouter } from "next/navigation"
import { useSignals } from "@preact/signals-react/runtime"
import * as Option from "effect/Option"
import {
  ArrowLeft,
  ChevronDown,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AdminSidebar } from "./AdminSidebar"
import { Separator } from "@/components/ui/separator"
import { UserMenu } from "@/components/auth"
import { format } from "date-fns"
import SelectionPeriodForm from "@/components/forms/selection-period-form"
import TopicForm from "@/components/forms/topic-form"
import { PeriodsView } from "./PeriodsView"
import { TopicsView } from "./TopicsView"
import { StudentsView } from "./StudentsView"
import { AnalyticsView } from "./AnalyticsView"
import { SettingsView } from "./SettingsView"
import { QuestionnairesView } from "./QuestionnairesView"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { LandingStats } from "@/convex/stats"

// ============================================================================
// OVERVIEW VIEW - Composed from atomic components
// ============================================================================

const OverviewView: React.FC = () => {
  useSignals()
  const { currentPeriod, assignments, periods } = AD.useDashboard()
  const vm = AD.useDashboardVM()

  // Get all periods for the selector
  const allPeriods = periods ?? []

  // Sort periods: open first, then by closeDate descending
  const sortedPeriods = [...allPeriods].sort((a, b) => {
    const aIsOpen = SelectionPeriod.isOpen(a)
    const bIsOpen = SelectionPeriod.isOpen(b)
    if (aIsOpen && !bIsOpen) return -1
    if (!aIsOpen && bIsOpen) return 1
    return (b.closeDate || 0) - (a.closeDate || 0)
  })

  // Default to most recent open period, or most recent period if no open ones
  const defaultPeriodId = sortedPeriods.length > 0 ? sortedPeriods[0]._id : null

  // State for selected period (persist in localStorage)
  const [selectedPeriodId, setSelectedPeriodId] = React.useState<Id<"selectionPeriods"> | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("overviewSelectedPeriodId")
      if (saved) return saved as Id<"selectionPeriods">
    }
    return defaultPeriodId
  })

  // Update selected period when default changes (e.g., new period created)
  React.useEffect(() => {
    if (defaultPeriodId && !selectedPeriodId) {
      setSelectedPeriodId(defaultPeriodId)
    }
  }, [defaultPeriodId, selectedPeriodId])

  // Save to localStorage when selection changes
  React.useEffect(() => {
    if (selectedPeriodId && typeof window !== "undefined") {
      localStorage.setItem("overviewSelectedPeriodId", selectedPeriodId)
    }
  }, [selectedPeriodId])

  // Get selected period object
  const selectedPeriod = selectedPeriodId
    ? sortedPeriods.find(p => p._id === selectedPeriodId)
    : sortedPeriods[0] ?? null

  // Fetch stats for the selected period
  const selectedPeriodStats = useQuery(
    api.stats.getLandingStats,
    selectedPeriodId ? { periodId: selectedPeriodId } : {}
  )

  // Fetch assignments for the selected period using getAssignments (returns full data)
  const selectedPeriodAssignmentsData = useQuery(
    api.assignments.getAssignments,
    selectedPeriodId ? { periodId: selectedPeriodId } : "skip"
  )

  // Transform assignments data to Assignment format
  const selectedPeriodAssignments: AD.Assignment[] = React.useMemo(() => {
    if (!selectedPeriodAssignmentsData) return []

    const assignments: AD.Assignment[] = []
    for (const [topicId, data] of Object.entries(selectedPeriodAssignmentsData)) {
      const topicData = data as { topic?: { title: string }; students: Array<{ studentId: string; originalRank?: number }> }
      for (const student of topicData.students) {
        assignments.push({
          studentId: student.studentId,
          topicTitle: topicData.topic?.title ?? "Unknown Topic",
          preferenceRank: student.originalRank ?? 0,
          isMatched: student.originalRank !== undefined,
          status: "assigned" as const
        })
      }
    }
    return assignments
  }, [selectedPeriodAssignmentsData])

  // Check if selected period is assigned
  const isSelectedPeriodAssigned = selectedPeriod && SelectionPeriod.isAssigned(selectedPeriod)

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      {sortedPeriods.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-muted-foreground">
                  View Stats For:
                </label>
                <Select
                  value={selectedPeriodId ?? undefined}
                  onValueChange={(value) => setSelectedPeriodId(value as Id<"selectionPeriods">)}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select a project assignment" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedPeriods.map((period) => {
                      const statusLabel = SelectionPeriod.match(period)({
                        open: () => "Open",
                        inactive: () => "Inactive",
                        closed: () => "Closed",
                        assigned: () => "Assigned"
                      })
                      const statusColor = SelectionPeriod.match(period)({
                        open: () => "bg-green-600",
                        inactive: () => "bg-blue-600",
                        closed: () => "bg-red-600",
                        assigned: () => "bg-purple-600"
                      })

                      return (
                        <SelectItem key={period._id} value={period._id}>
                          <div className="flex items-center gap-2 w-full">
                            <Badge className={`${statusColor} text-white text-xs shrink-0`}>
                              {statusLabel}
                            </Badge>
                            <span className="flex-1 truncate">{period.title}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {format(period.closeDate, "MMM d, yyyy")}
                            </span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              {selectedPeriod && (
                <div className="text-sm text-muted-foreground">
                  {selectedPeriod.studentCount ?? 0} students • {selectedPeriod.assignmentCount ?? 0} assignments
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Grid - Clean, no nesting */}
      <AD.MetricsGrid stats={selectedPeriodStats as LandingStats | undefined} />

      {/* Assignment Results when selected period is assigned */}
      {isSelectedPeriodAssigned && selectedPeriodAssignments && selectedPeriodAssignments.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Assignments</CardTitle>
            <CardDescription>Latest topic assignments for students in "{selectedPeriod?.title}"</CardDescription>
          </CardHeader>
          <CardContent>
            <AD.AssignmentTable assignments={selectedPeriodAssignments} />
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Project Assignments</CardTitle>
            <CardDescription>Manage project assignment periods</CardDescription>
          </CardHeader>
          <CardContent>
            <AD.PeriodsTable onEdit={(period) => vm.editPeriodDialog.open(period)} showActions={false} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Topics</CardTitle>
            <CardDescription>Available topics for selection</CardDescription>
          </CardHeader>
          <CardContent>
            <AD.TopicsTable onEdit={(topic) => vm.editTopicDialog.open(topic)} showActions={false} />
          </CardContent>
        </Card>
      </div>

      {/* Edit Period Dialog */}
      <Dialog open={vm.editPeriodDialog.isOpen$.value} onOpenChange={(open) => !open && vm.editPeriodDialog.close()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Project Assignment</DialogTitle>
            <DialogDescription>
              Update the details of this project assignment.
            </DialogDescription>
          </DialogHeader>
          {Option.isSome(vm.editPeriodDialog.editingPeriod$.value) && (
            <SelectionPeriodForm
              initialValues={{
                title: vm.editPeriodDialog.editingPeriod$.value.value.title,
                selection_period_id: vm.editPeriodDialog.editingPeriod$.value.value.semesterId,
                start_deadline: new Date(vm.editPeriodDialog.editingPeriod$.value.value.openDate),
                end_deadline: new Date(vm.editPeriodDialog.editingPeriod$.value.value.closeDate),
                questionIds: [...vm.existingQuestionIds$.value]
              }}
              onSubmit={vm.updatePeriodFromForm}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Topic Dialog */}
      <Dialog open={vm.editTopicDialog.isOpen$.value} onOpenChange={(open) => !open && vm.editTopicDialog.close()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Topic</DialogTitle>
            <DialogDescription>
              Update the details of this topic.
            </DialogDescription>
          </DialogHeader>
          {Option.isSome(vm.editTopicDialog.editingTopic$.value) && (
            <TopicForm
              periods={[...vm.periodOptions$.value]}
              initialValues={{
                title: vm.editTopicDialog.editingTopic$.value.value.title,
                description: vm.editTopicDialog.editingTopic$.value.value.description,
                selection_period_id: vm.editTopicDialog.editingTopic$.value.value.semesterId
              }}
              onSubmit={vm.updateTopicFromForm}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// MAIN CONTENT SWITCHER
// ============================================================================

const MainContent: React.FC = () => {
  // Enable signals reactivity
  useSignals()

  const { activeView } = AD.useDashboard()
  const vm = AD.useDashboardVM()

  switch (activeView) {
    case "overview":
      return <OverviewView />
    case "periods":
      return <PeriodsView vm={vm.periodsView} />
    case "topics":
      return <TopicsView vm={vm.topicsView} />
    case "students":
      return <StudentsView vm={vm.studentsView} />
    case "questionnaires":
      return <QuestionnairesView vm={vm.questionnairesView} />
    case "analytics":
      return <AnalyticsView vm={vm.analyticsView} />
    case "settings":
      return <SettingsView vm={vm.settingsView} />
    default:
      return <OverviewView />
  }
}

// ============================================================================
// ADMIN DASHBOARD VIEW WITH SIDEBAR
// ============================================================================

export const AdminDashboardView: React.FC = () => {
  // Enable signals reactivity
  useSignals()

  const router = useRouter()

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center justify-between flex-1">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage topics, project assignments, and students</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
              <UserMenu />
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <MainContent />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

// ============================================================================
// ROOT COMPONENT WITH PROVIDER
// ============================================================================

export const AdminDashboard: React.FC = () => (
  <AD.Provider>
    <AdminDashboardView />
  </AD.Provider>
)