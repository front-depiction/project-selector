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
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Settings, Database, RefreshCw, Trash2, ShieldCheck, UserPlus, X, Crown } from "lucide-react"
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

      {/* Admin Access Management */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-muted-foreground" />
            <div>
              <CardTitle>Admin Access</CardTitle>
              <CardDescription>
                Manage who can access the admin dashboard and manage topics
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Admin Section */}
          <AdminAddForm />

          {/* Current Admins */}
          <div className="space-y-2">
            <Label>Current Administrators</Label>
            <AdminListDisplay />
          </div>
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
// ADMIN ACCESS COMPONENTS
// ============================================================================

const AdminAddForm: React.FC = () => {
  const [email, setEmail] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const addAdmin = useMutation(api.users.addToAllowList)

  const handleAddAdmin = async () => {
    const trimmedEmail = email.trim().toLowerCase()
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      toast.error("Please enter a valid email address")
      return
    }

    setIsLoading(true)
    try {
      await addAdmin({ 
        email: trimmedEmail, 
        note: "Admin access granted" 
      })
      toast.success(`Admin access granted to ${trimmedEmail}`)
      setEmail("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add admin")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="admin-email">Add Administrator</Label>
      <div className="flex items-center gap-2">
        <Input
          id="admin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teacher@university.edu"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              handleAddAdmin()
            }
          }}
        />
        <Button 
          onClick={handleAddAdmin} 
          disabled={isLoading || !email.trim()}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Administrators can access this dashboard, create topics, manage periods, and view all data.
      </p>
    </div>
  )
}

const AdminListDisplay: React.FC = () => {
  const adminList = useQuery(api.users.getAllowList)
  const currentUser = useQuery(api.users.getMe)
  const removeAdmin = useMutation(api.users.removeFromAllowList)
  const [removingEmail, setRemovingEmail] = React.useState<string | null>(null)

  const handleRemove = async (email: string) => {
    // Prevent removing yourself
    if (currentUser?.email?.toLowerCase() === email.toLowerCase()) {
      toast.error("You cannot remove yourself from the admin list")
      return
    }

    setRemovingEmail(email)
    try {
      await removeAdmin({ email })
      toast.success(`Removed admin access for ${email}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove admin")
    } finally {
      setRemovingEmail(null)
    }
  }

  if (adminList === undefined) {
    return (
      <div className="border rounded-lg p-4 text-center text-muted-foreground">
        Loading administrators...
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{adminList.length} administrator{adminList.length !== 1 ? "s" : ""}</span>
      </div>
      
      {adminList.length > 0 ? (
        <ScrollArea className="h-[200px] rounded-md border">
          <div className="p-2 space-y-1">
            {adminList.map((entry) => {
              const isCurrentUser = currentUser?.email?.toLowerCase() === entry.email.toLowerCase()
              
              return (
                <div 
                  key={entry._id} 
                  className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {isCurrentUser ? (
                        <Crown className="h-4 w-4 text-primary" />
                      ) : (
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate flex items-center gap-2">
                        {entry.email}
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(entry.addedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {!isCurrentUser && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(entry.email)}
                      disabled={removingEmail === entry.email}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border rounded-lg border-dashed">
          <ShieldCheck className="h-10 w-10 mb-3 opacity-50" />
          <p className="text-sm font-medium">No administrators added yet</p>
          <p className="text-xs mt-1">Add an email above to grant admin access</p>
        </div>
      )}
    </div>
  )
}
