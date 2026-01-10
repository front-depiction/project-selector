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
import { Textarea } from "@/components/ui/textarea"
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
  Upload, 
  X, 
  Users, 
  Loader2,
  FileSpreadsheet 
} from "lucide-react"

interface StudentAllowListManagerProps {
  topicId: Id<"topics">
  topicTitle?: string
}

export function StudentAllowListManager({ 
  topicId, 
  topicTitle 
}: StudentAllowListManagerProps) {
  const [newStudentId, setNewStudentId] = useState("")
  const [bulkInput, setBulkInput] = useState("")
  const [note, setNote] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [showBulkInput, setShowBulkInput] = useState(false)

  const allowList = useQuery(api.topicStudentAllowList.getTopicStudentAllowList, { topicId })
  const addStudent = useMutation(api.topicStudentAllowList.addStudentId)
  const bulkAdd = useMutation(api.topicStudentAllowList.bulkAddStudentIds)
  const removeStudent = useMutation(api.topicStudentAllowList.removeStudentId)
  const clearAll = useMutation(api.topicStudentAllowList.clearAllStudentIds)

  const handleAddStudent = useCallback(async () => {
    const trimmed = newStudentId.trim()
    if (!trimmed) return

    try {
      await addStudent({ topicId, studentId: trimmed, note: note || undefined })
      setNewStudentId("")
      setNote("")
      toast.success(`Added student ${trimmed}`)
    } catch (error) {
      toast.error("Failed to add student")
    }
  }, [topicId, newStudentId, note, addStudent])

  const handleBulkAdd = useCallback(async () => {
    const studentIds = bulkInput
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(Boolean)

    if (studentIds.length === 0) {
      toast.error("No valid student IDs found")
      return
    }

    try {
      const result = await bulkAdd({ topicId, studentIds, note: note || undefined })
      setBulkInput("")
      setNote("")
      setShowBulkInput(false)
      toast.success(`Added ${result.added} students, updated ${result.updated}, skipped ${result.skipped}`)
    } catch (error) {
      toast.error("Failed to add students")
    }
  }, [topicId, bulkInput, note, bulkAdd])

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      const content = await file.text()
      const studentIds: string[] = []

      if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
        const lines = content.split(/[\r\n]+/)
        for (const line of lines) {
          const parts = line.split(/[,;\t]+/)
          for (const part of parts) {
            const trimmed = part.trim()
            if (trimmed && /^[a-zA-Z0-9]+$/.test(trimmed)) {
              studentIds.push(trimmed)
            }
          }
        }
      }

      if (studentIds.length === 0) {
        toast.error("No valid student IDs found in file")
        return
      }

      const result = await bulkAdd({ 
        topicId, 
        studentIds: [...new Set(studentIds)], 
        note: `Imported from ${file.name}` 
      })
      toast.success(`Imported ${result.added} students from ${file.name}`)
    } catch (error) {
      toast.error("Failed to process file")
    } finally {
      setIsUploading(false)
      event.target.value = ""
    }
  }, [topicId, bulkAdd])

  const handleRemove = useCallback(async (studentId: string) => {
    try {
      await removeStudent({ topicId, studentId })
      toast.success(`Removed student ${studentId}`)
    } catch (error) {
      toast.error("Failed to remove student")
    }
  }, [topicId, removeStudent])

  const handleClearAll = useCallback(async () => {
    try {
      const result = await clearAll({ topicId })
      toast.success(`Removed ${result.deleted} students`)
    } catch (error) {
      toast.error("Failed to clear students")
    }
  }, [topicId, clearAll])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Student Allow List
        </CardTitle>
        <CardDescription>
          {topicTitle ? `Manage which students can access "${topicTitle}"` : "Manage student access"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add single student */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Enter student ID"
              value={newStudentId}
              onChange={(e) => setNewStudentId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddStudent()}
            />
          </div>
          <Button onClick={handleAddStudent} disabled={!newStudentId.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Bulk actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowBulkInput(!showBulkInput)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Bulk Add
          </Button>
          
          <Label className="cursor-pointer">
            <Button variant="outline" size="sm" asChild disabled={isUploading}>
              <span>
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                Import CSV
              </span>
            </Button>
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </Label>

          {allowList && allowList.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all students?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all {allowList.length} students from the allow list.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll}>
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Bulk input area */}
        {showBulkInput && (
          <div className="space-y-2 p-3 border rounded-lg bg-muted/50">
            <Label>Paste student IDs (one per line or comma-separated)</Label>
            <Textarea
              placeholder="STU001&#10;STU002&#10;STU003"
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleBulkAdd} disabled={!bulkInput.trim()}>
                Add Students
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => {
                  setShowBulkInput(false)
                  setBulkInput("")
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Student list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Current Students</Label>
            <Badge variant="secondary">
              {allowList?.length ?? 0} students
            </Badge>
          </div>
          
          {!allowList ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : allowList.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No students added yet</p>
              <p className="text-xs">Add student IDs to restrict access to this topic</p>
            </div>
          ) : (
            <ScrollArea className="h-[200px] border rounded-md p-2">
              <div className="flex flex-wrap gap-2">
                {allowList.map((entry) => (
                  <Badge 
                    key={entry._id} 
                    variant="outline"
                    className="flex items-center gap-1 pr-1"
                  >
                    {entry.studentId}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemove(entry.studentId)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
