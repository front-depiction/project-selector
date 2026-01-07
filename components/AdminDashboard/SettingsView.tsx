"use client"

import * as React from "react"
import * as AD from "./index"
import * as SelectionPeriod from "@/convex/schemas/SelectionPeriod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Database, RefreshCw, Trash2 } from "lucide-react"
import { AssignNowButton } from "@/components/admin/AssignNowButton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SettingsViewVM } from "./SettingsViewVM"
import { useSignals } from "@preact/signals-react/runtime"

export const SettingsView: React.FC<{ vm: SettingsViewVM }> = ({ vm }) => {
  useSignals()
  const { currentPeriod } = AD.useDashboard()

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">System Settings</h2>

      {/* Development Tools */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-muted-foreground" />
            <div>
              <CardTitle>Development Tools</CardTitle>
              <CardDescription>Tools for testing and development</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Seed Test Data</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Generate sample topics and periods for testing
              </p>
            </div>
            <Button onClick={vm.seedTestData} variant="outline" disabled={vm.isSeedingData$.value}>
              <RefreshCw className={`mr-2 h-4 w-4 ${vm.isSeedingData$.value ? "animate-spin" : ""}`} />
              {vm.isSeedingData$.value ? "Seeding..." : "Seed Data"}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Assign Now</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Manually trigger assignment for the current period
              </p>
            </div>
            {SelectionPeriod.matchOptional(currentPeriod)({
              open: (p) => <AssignNowButton periodId={p._id} status="open" />,
              assigned: (p) => <AssignNowButton periodId={p._id} status="assigned" />,
              inactive: () => (
                <Button disabled variant="outline">
                  No Active Period
                </Button>
              ),
              closed: () => (
                <Button disabled variant="outline">
                  Period Closed
                </Button>
              ),
              none: () => (
                <Button disabled variant="outline">
                  No Active Period
                </Button>
              )
            })}
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50 dark:bg-red-950/20">
            <div>
              <h4 className="font-medium text-red-900 dark:text-red-400">Clear All Data</h4>
              <p className="text-sm text-red-700 dark:text-red-500 mt-1">
                Remove all topics, periods, and selections. This cannot be undone.
              </p>
            </div>
            <Button
              onClick={vm.clearAllData}
              variant="destructive"
              disabled={vm.isClearingData$.value}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {vm.isClearingData$.value ? "Clearing..." : "Clear Data"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Configuration */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-muted-foreground" />
            <div>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>Configure system-wide settings and preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            System configuration options coming soon. You'll be able to configure email notifications,
            assignment algorithms, and other system-wide settings.
          </p>
        </CardContent>
      </Card>

      {/* Clear Data Confirmation Dialog */}
      <AlertDialog open={vm.clearDialog.isOpen$.value} onOpenChange={(open) => !open && vm.clearDialog.close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>This action will permanently delete all data including:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>All topics and subtopics</li>
                  <li>All selection periods</li>
                  <li>All student preferences</li>
                  <li>All assignments</li>
                </ul>
                <p className="font-semibold text-red-600 mt-2">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={vm.clearDialog.close}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={vm.confirmClear}
              className="bg-red-600 hover:bg-red-700"
              disabled={vm.isClearingData$.value}
            >
              {vm.isClearingData$.value ? "Clearing..." : "Yes, clear all data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
