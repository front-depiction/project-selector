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
} from "lucide-react"
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
import SelectionPeriodForm from "@/components/forms/selection-period-form"
import TopicForm from "@/components/forms/topic-form"
import { PeriodsView } from "./PeriodsView"
import { TopicsView } from "./TopicsView"
import { StudentsView } from "./StudentsView"
import { AnalyticsView } from "./AnalyticsView"
import { SettingsView } from "./SettingsView"
import { QuestionnairesView } from "./QuestionnairesView"

// ============================================================================
// OVERVIEW VIEW - Composed from atomic components
// ============================================================================

const OverviewView: React.FC = () => {
  useSignals()
  const { currentPeriod, assignments } = AD.useDashboard()
  const vm = AD.useDashboardVM()

  return (
    <div className="space-y-6">
      {/* Metrics Grid - Clean, no nesting */}
      <AD.MetricsGrid />

      {/* Assignment Results when period is assigned */}
      {currentPeriod && SelectionPeriod.isAssigned(currentPeriod) && assignments && assignments.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Assignments</CardTitle>
            <CardDescription>Latest topic assignments for students</CardDescription>
          </CardHeader>
          <CardContent>
            <AD.AssignmentTable />
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Selection Periods</CardTitle>
            <CardDescription>Manage when students can select topics</CardDescription>
          </CardHeader>
          <CardContent>
            <AD.PeriodsTable onEdit={(period) => vm.editPeriodDialog.open(period)} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Topics</CardTitle>
            <CardDescription>Available topics for selection</CardDescription>
          </CardHeader>
          <CardContent>
            <AD.TopicsTable onEdit={(topic) => vm.editTopicDialog.open(topic)} />
          </CardContent>
        </Card>
      </div>

      {/* Edit Period Dialog */}
      <Dialog open={vm.editPeriodDialog.isOpen$.value} onOpenChange={(open) => !open && vm.editPeriodDialog.close()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Selection Period</DialogTitle>
            <DialogDescription>
              Update the details of this selection period.
            </DialogDescription>
          </DialogHeader>
          {Option.isSome(vm.editPeriodDialog.editingPeriod$.value) && (
            <SelectionPeriodForm
              initialValues={{
                title: vm.editPeriodDialog.editingPeriod$.value.value.title,
                selection_period_id: vm.editPeriodDialog.editingPeriod$.value.value.semesterId,
                start_deadline: new Date(vm.editPeriodDialog.editingPeriod$.value.value.openDate),
                end_deadline: new Date(vm.editPeriodDialog.editingPeriod$.value.value.closeDate),
                isActive: SelectionPeriod.isOpen(vm.editPeriodDialog.editingPeriod$.value.value)
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
      return <StudentsView />
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
              <p className="text-sm text-muted-foreground">Manage topics, periods, and student assignments</p>
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