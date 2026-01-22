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
  Users,
  User,
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
import { SettingsView } from "./SettingsView"
import { QuestionnairesView } from "./QuestionnairesView"
import { HelpView } from "./HelpView"
import { OnboardingCard } from "./OnboardingCard"
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
      if (saved && sortedPeriods.find(p => p._id === saved)) {
        return saved as Id<"selectionPeriods">
      }
    }
    return defaultPeriodId
  })

  // Update selected period when default changes (e.g., new period created) or if current selection is invalid
  React.useEffect(() => {
    if (defaultPeriodId && (!selectedPeriodId || !sortedPeriods.find(p => p._id === selectedPeriodId))) {
      setSelectedPeriodId(defaultPeriodId)
    }
  }, [defaultPeriodId, selectedPeriodId, sortedPeriods])

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
      const topicData = data as { topic?: { title: string }; students: Array<{ studentId: string; name?: string; originalRank?: number }> }
      for (const student of topicData.students) {
        assignments.push({
          studentId: student.studentId,
          name: student.name, // Include name if available
          topicTitle: topicData.topic?.title ?? "Unknown Topic",
          preferenceRank: student.originalRank ?? 0,
          isMatched: student.originalRank !== undefined,
          status: "assigned" as const
        })
      }
    }
    return assignments
  }, [selectedPeriodAssignmentsData])

  // Transform assignments data to topics with groups format
  const topicsWithGroups = React.useMemo(() => {
    if (!selectedPeriodAssignmentsData) {
      return []
    }

    const topics: Array<{
      topicId: string
      title: string
      students: Array<{ studentId: string; name?: string; originalRank?: number; studentIdDisplay: string }>
    }> = []

    // Debug: log the data structure
    console.log("selectedPeriodAssignmentsData:", selectedPeriodAssignmentsData)

    for (const [topicId, data] of Object.entries(selectedPeriodAssignmentsData)) {
      const topicData = data as { 
        topic?: { title: string }
        students: Array<{ studentId: string; name?: string; originalRank?: number }>
      }
      
      if (topicData.topic && topicData.students && topicData.students.length > 0) {
        topics.push({
          topicId,
          title: topicData.topic.title,
          students: topicData.students.map(student => ({
            studentId: student.studentId,
            name: student.name,
            originalRank: student.originalRank,
            studentIdDisplay: student.name 
              ? `${student.name} (${student.studentId})` 
              : student.studentId
          }))
        })
      }
    }

    // Sort by title
    return topics.sort((a, b) => a.title.localeCompare(b.title))
  }, [selectedPeriodAssignmentsData])

  // Check if selected period is assigned
  const isSelectedPeriodAssigned = selectedPeriod && SelectionPeriod.isAssigned(selectedPeriod)

  // Calculate match rate from actual assignments
  const matchRate = React.useMemo(() => {
    if (!selectedPeriodAssignments || selectedPeriodAssignments.length === 0) return 0
    const matched = selectedPeriodAssignments.filter(a => a.isMatched).length
    return (matched / selectedPeriodAssignments.length) * 100
  }, [selectedPeriodAssignments])

  const topChoiceRate = React.useMemo(() => {
    if (!selectedPeriodAssignments || selectedPeriodAssignments.length === 0) return 0
    const topChoice = selectedPeriodAssignments.filter(a => a.preferenceRank === 1).length
    return (topChoice / selectedPeriodAssignments.length) * 100
  }, [selectedPeriodAssignments])

  return (
    <div className="space-y-6">
      {/* Onboarding Card - Show at top of Overview */}
      <OnboardingCard vm={vm.onboardingVM} />

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
      <AD.MetricsGrid
        stats={selectedPeriodStats ? {
          ...selectedPeriodStats,
          matchRate,
          topChoiceRate
        } as any : undefined}
      />

      {/* Topics with Groups - Show for selected period */}
      {selectedPeriodId && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Topics & Groups</CardTitle>
            <CardDescription>
              Topic assignments with student groups for "{selectedPeriod?.title}"
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedPeriodAssignmentsData ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No assignments yet</p>
                <p className="text-xs mt-1">
                  {selectedPeriod && SelectionPeriod.isOpen(selectedPeriod)
                    ? "Assignments will appear after the period closes and assignments are made."
                    : "This period doesn't have any student assignments yet."}
                </p>
              </div>
            ) : topicsWithGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No topic groups found</p>
                <p className="text-xs mt-1">Assignments exist but no topics have students assigned yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topicsWithGroups.map((topic) => (
                  <Card key={topic.topicId} className="border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{topic.title}</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          {topic.students.length} {topic.students.length === 1 ? "student" : "students"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {topic.students.map((student) => (
                          <div
                            key={student.studentId}
                            className="flex items-center gap-2 text-sm py-2 px-3 rounded border bg-muted/30 border-border hover:bg-muted/50"
                          >
                            <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate flex-1">
                              {student.studentIdDisplay}
                            </span>
                            {student.originalRank !== undefined && (
                              <Badge
                                variant={student.originalRank === 1 ? "default" : "outline"}
                                className="text-xs h-5 flex-shrink-0"
                              >
                                Rank {student.originalRank}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Project Assignments</CardTitle>
            <CardDescription>Manage project assignment periods</CardDescription>
          </CardHeader>
          <CardContent>
            <AD.PeriodsTable onEdit={(period) => vm.editPeriodDialog.open(period)} showActions={false} />
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
                topicIds: [],
                minimizeCategoryIds: []
              }}
              onSubmit={vm.updatePeriodFromForm as any}
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
              constraints={[...vm.constraintOptions$.value]}
              initialValues={{
                title: vm.editTopicDialog.editingTopic$.value.value.title,
                description: vm.editTopicDialog.editingTopic$.value.value.description,
                constraintIds: [], // TODO: Get constraintIds from topic if stored
                duplicateCount: 1
              }}
              onSubmit={vm.updateTopicFromForm as any}
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
    case "settings":
      return <SettingsView vm={vm.settingsView} />
    case "help":
      return <HelpView />
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