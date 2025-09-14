"use client"

import * as React from "react"
import * as AD from "./index"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Database, RefreshCw, Trash2 } from "lucide-react"
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

export const SettingsView: React.FC = () => {
  const { seedTestData, clearAllData } = AD.useDashboard()
  const [isClearDialogOpen, setIsClearDialogOpen] = React.useState(false)

  const handleSeedData = async () => {
    await seedTestData()
  }

  const handleClearData = async () => {
    await clearAllData()
    setIsClearDialogOpen(false)
  }

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
            <Button onClick={handleSeedData} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Seed Data
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50 dark:bg-red-950/20">
            <div>
              <h4 className="font-medium text-red-900 dark:text-red-400">Clear All Data</h4>
              <p className="text-sm text-red-700 dark:text-red-500 mt-1">
                Remove all topics, periods, and selections. This cannot be undone.
              </p>
            </div>
            <Button 
              onClick={() => setIsClearDialogOpen(true)} 
              variant="destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Data
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
      <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete all data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All topics and subtopics</li>
                <li>All selection periods</li>
                <li>All student preferences</li>
                <li>All assignments</li>
              </ul>
              <span className="font-semibold text-red-600">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleClearData}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, clear all data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}