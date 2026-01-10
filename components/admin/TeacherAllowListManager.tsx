"use client"

import { useState, useCallback } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { 
  Plus, 
  Trash2, 
  X, 
  UserCog, 
  Loader2,
  Mail 
} from "lucide-react"

interface TeacherAllowListManagerProps {
  topicId: Id<"topics">
  topicTitle?: string
}

export function TeacherAllowListManager({ 
  topicId, 
  topicTitle 
}: TeacherAllowListManagerProps) {
  const [newEmail, setNewEmail] = useState("")
  const [note, setNote] = useState("")

  const allowList = useQuery(api.topicTeacherAllowList.getTopicTeachers, { topicId })
  const addTeacher = useMutation(api.topicTeacherAllowList.addTeacherEmail)
  const removeTeacher = useMutation(api.topicTeacherAllowList.removeTeacherEmail)
  const clearAll = useMutation(api.topicTeacherAllowList.clearAllTeachers)

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleAddTeacher = useCallback(async () => {
    const trimmed = newEmail.trim().toLowerCase()
    if (!trimmed) return

    if (!isValidEmail(trimmed)) {
      toast.error("Please enter a valid email address")
      return
    }

    try {
      await addTeacher({ topicId, email: trimmed, note: note || undefined })
      setNewEmail("")
      setNote("")
      toast.success(`Added teacher ${trimmed}`)
    } catch (error) {
      toast.error("Failed to add teacher")
    }
  }, [topicId, newEmail, note, addTeacher])

  const handleRemove = useCallback(async (email: string) => {
    try {
      await removeTeacher({ topicId, email })
      toast.success(`Removed teacher ${email}`)
    } catch (error) {
      toast.error("Failed to remove teacher")
    }
  }, [topicId, removeTeacher])

  const handleClearAll = useCallback(async () => {
    try {
      const result = await clearAll({ topicId })
      toast.success(`Removed ${result.deleted} teachers`)
    } catch (error) {
      toast.error("Failed to clear teachers")
    }
  }, [topicId, clearAll])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          Teacher Collaborators
        </CardTitle>
        <CardDescription>
          {topicTitle 
            ? `Add other teachers who can manage "${topicTitle}"` 
            : "Add teachers who can collaborate on this topic"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add teacher */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="email"
              placeholder="Enter teacher email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTeacher()}
            />
          </div>
          <Button 
            onClick={handleAddTeacher} 
            disabled={!newEmail.trim() || !isValidEmail(newEmail.trim())}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Optional note */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Note (optional)</Label>
          <Input
            placeholder="e.g., Co-supervisor, TA"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {/* Clear all button */}
        {allowList && allowList.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="h-4 w-4 mr-1" />
                Remove All Collaborators
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove all collaborators?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all {allowList.length} teachers from this topic.
                  They will no longer be able to manage this topic.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll}>
                  Remove All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Teacher list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Current Collaborators</Label>
            <Badge variant="secondary">
              {allowList?.length ?? 0} teachers
            </Badge>
          </div>
          
          {!allowList ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : allowList.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No collaborators added</p>
              <p className="text-xs">Add teacher emails to let them manage this topic</p>
            </div>
          ) : (
            <ScrollArea className="h-[200px] border rounded-md p-2">
              <div className="space-y-2">
                {allowList.map((entry) => (
                  <div 
                    key={entry._id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{entry.email}</span>
                      {entry.note && (
                        <span className="text-xs text-muted-foreground">{entry.note}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Added by {entry.addedBy}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemove(entry.email)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
