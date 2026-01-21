"use client"

import * as React from "react"
import * as AD from "./index"
import * as SelectionPeriod from "@/convex/schemas/SelectionPeriod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Database, RefreshCw, Trash2, Beaker, Copy, CheckCircle2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null)
  const [selectedSeedType, setSelectedSeedType] = React.useState<"default" | "leadership-python" | "it-skills">("default")

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCode(text)
      setTimeout(() => setCopiedCode(null), 2000)
    })
  }

  const copyAllMapping = () => {
    if (!vm.experimentMapping$.value) return
    const text = vm.experimentMapping$.value
      .map(m => `${m.name} -> ${m.accessCode} (Original Team ${m.originalTeam})`)
      .join('\n')
    copyToClipboard(text)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">System Settings</h2>

      {/* Experiment Setup */}
      <Card className="border-0 shadow-sm border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Beaker className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle>User Test Experiment</CardTitle>
              <CardDescription>Set up the team assignment experiment with questionnaire and access codes</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-950">
              <div>
                <h4 className="font-medium">Setup Experiment</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Creates 4 categories, 16 questions, 7 groups, and 28 access codes with exclusion pairs
                </p>
              </div>
              <Button onClick={vm.setupExperiment} variant="default" disabled={vm.isSettingUpExperiment$.value}>
                <Beaker className={`mr-2 h-4 w-4 ${vm.isSettingUpExperiment$.value ? "animate-pulse" : ""}`} />
                {vm.isSettingUpExperiment$.value ? "Setting up..." : "Setup Experiment"}
              </Button>
            </div>

            {vm.experimentPeriodId$.value && (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-950">
                <div>
                  <h4 className="font-medium">Generate Test Answers</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generate random answers (0-6) for all students for testing purposes
                  </p>
                </div>
                <Button 
                  onClick={vm.generateRandomAnswers} 
                  variant="outline" 
                  disabled={vm.isGeneratingAnswers$.value}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${vm.isGeneratingAnswers$.value ? "animate-spin" : ""}`} />
                  {vm.isGeneratingAnswers$.value ? "Generating..." : "Generate Answers"}
                </Button>
              </div>
            )}
          </div>

          {vm.experimentMapping$.value && (
            <div className="p-4 border rounded-lg bg-white dark:bg-gray-950">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Access Code Mapping</h4>
                <Button onClick={copyAllMapping} variant="outline" size="sm">
                  <Copy className="mr-2 h-3 w-3" />
                  Copy All
                </Button>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-1 text-sm font-mono">
                {vm.experimentMapping$.value.map((item) => (
                  <div
                    key={item.accessCode}
                    className="flex items-center justify-between p-2 hover:bg-muted/50 rounded"
                  >
                    <span>{item.name} → {item.accessCode} (Team {item.originalTeam})</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(item.accessCode)}
                      className="h-6 px-2"
                    >
                      {copiedCode === item.accessCode ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
            <div className="flex-1">
              <h4 className="font-medium">Seed Test Data</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Generate sample topics and project assignments for testing
              </p>
              <div className="mt-3">
                <Select value={selectedSeedType} onValueChange={(value) => setSelectedSeedType(value as typeof selectedSeedType)}>
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Select seed type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (20 students, 5 groups)</SelectItem>
                    <SelectItem value="leadership-python">Leadership + Python (70 students, 10 groups)</SelectItem>
                    <SelectItem value="it-skills">IT Skills (60 students, 5 groups)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => vm.seedTestData(selectedSeedType)} variant="outline" disabled={vm.isSeedingData$.value} className="ml-4">
              <RefreshCw className={`mr-2 h-4 w-4 ${vm.isSeedingData$.value ? "animate-spin" : ""}`} />
              {vm.isSeedingData$.value ? "Seeding..." : "Seed Data"}
            </Button>
          </div>


          <div className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50 dark:bg-red-950/20">
            <div>
              <h4 className="font-medium text-red-900 dark:text-red-400">Clear All Data</h4>
              <p className="text-sm text-red-700 dark:text-red-500 mt-1">
                Remove all topics, project assignments, and selections. This cannot be undone.
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
                  <li>All topics</li>
                  <li>All project assignments</li>
                  <li>All student preferences and answers</li>
                  <li>All questions and categories</li>
                  <li>All access codes and assignments</li>
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
