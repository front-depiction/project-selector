"use client"

import * as React from "react"
import * as AD from "./index"
import * as SelectionPeriod from "@/convex/schemas/SelectionPeriod"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Settings, Database, RefreshCw, Trash2, Users, Upload } from "lucide-react"
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

export const SettingsView: React.FC = () => {
  const { seedTestData, clearAllData, currentPeriod } = AD.useDashboard()
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
              onClick={() => setIsClearDialogOpen(true)}
              variant="destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Allow-List Management */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-muted-foreground" />
            <div>
              <CardTitle>Email Allow-List</CardTitle>
              <CardDescription>
                Manage which students can access restricted topics
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bulk Import Section */}
          <AllowListBulkImport />

          {/* Current Allow-List */}
          <div className="space-y-2">
            <Label>Current Allow-List</Label>
            <AllowListDisplay />
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

// ============================================================================
// ALLOW-LIST COMPONENTS
// ============================================================================

const AllowListBulkImport: React.FC = () => {
  const [emailText, setEmailText] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const bulkAdd = useMutation(api.users.bulkAddToAllowList)

  const handleBulkImport = async () => {
    // Parse emails from textarea (one per line or comma-separated)
    const emails = emailText
      .split(/[,\n]/)
      .map(e => e.trim())
      .filter(e => {
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return e.length > 0 && emailRegex.test(e)
      })
    
    if (emails.length === 0) {
      toast.error("Please enter at least one valid email address")
      return
    }

    setIsLoading(true)
    try {
      const result = await bulkAdd({ 
        emails, 
        note: "Bulk import from admin panel" 
      })
      toast.success(`Added ${result.added} new emails, updated ${result.updated} existing entries`)
      setEmailText("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add emails")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="email-import">Bulk Import Emails</Label>
      <Textarea
        id="email-import"
        value={emailText}
        onChange={(e) => setEmailText(e.target.value)}
        placeholder="Enter emails (one per line or comma-separated)&#10;student1@university.edu&#10;student2@university.edu"
        className="font-mono text-sm min-h-[120px]"
        rows={6}
      />
      <p className="text-xs text-muted-foreground">
        Paste email addresses separated by commas or new lines. Invalid emails will be skipped.
      </p>
      <Button 
        onClick={handleBulkImport} 
        disabled={isLoading || !emailText.trim()}
        className="w-full"
      >
        <Upload className="mr-2 h-4 w-4" />
        {isLoading ? "Importing..." : "Import Emails"}
      </Button>
    </div>
  )
}

const AllowListDisplay: React.FC = () => {
  const allowList = useQuery(api.users.getAllowList)
  const removeEmail = useMutation(api.users.removeFromAllowList)
  const [removingEmail, setRemovingEmail] = React.useState<string | null>(null)

  const handleRemove = async (email: string) => {
    setRemovingEmail(email)
    try {
      await removeEmail({ email })
      toast.success(`Removed ${email} from allow-list`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove email")
    } finally {
      setRemovingEmail(null)
    }
  }

  if (allowList === undefined) {
    return (
      <div className="border rounded-lg p-4 text-center text-muted-foreground">
        Loading allow-list...
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{allowList.length} email{allowList.length !== 1 ? "s" : ""} in allow-list</span>
      </div>
      <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-1">
        {allowList.length > 0 ? (
          allowList.map((entry) => (
            <div 
              key={entry._id} 
              className="flex items-center justify-between p-2 hover:bg-muted rounded transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.email}</p>
                {entry.note && (
                  <p className="text-xs text-muted-foreground truncate">{entry.note}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemove(entry.email)}
                disabled={removingEmail === entry.email}
                className="ml-2 flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No emails in allow-list. Add emails above to restrict topic access.
          </p>
        )}
      </div>
    </div>
  )
}
