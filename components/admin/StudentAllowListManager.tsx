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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { 
  Wand2, 
  Trash2, 
  Download, 
  X, 
  Users, 
  Loader2,
  Copy,
  Key,
  ShieldCheck
} from "lucide-react"

interface StudentAllowListManagerProps {
  topicId: Id<"topics">
  topicTitle?: string
}

export function StudentAllowListManager({ 
  topicId, 
  topicTitle 
}: StudentAllowListManagerProps) {
  const [studentCount, setStudentCount] = useState(10)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])

  const allowList = useQuery(api.topicStudentAllowList.getTopicStudentAllowList, { topicId })
  const generateCodes = useMutation(api.studentAccessCodes.generateStudentAccessCodes)
  const removeStudent = useMutation(api.topicStudentAllowList.removeStudentId)
  const clearAll = useMutation(api.topicStudentAllowList.clearAllStudentIds)

  const handleGenerateCodes = useCallback(async () => {
    if (studentCount < 1 || studentCount > 500) {
      toast.error("Please enter a number between 1 and 500")
      return
    }

    setIsGenerating(true)
    try {
      const result = await generateCodes({ topicId, count: studentCount })
      setGeneratedCodes(result.codes)
      toast.success(`Generated ${result.total} access codes`)
    } catch (error) {
      console.error("Failed to generate codes:", error)
      toast.error("Failed to generate codes")
    } finally {
      setIsGenerating(false)
    }
  }, [topicId, studentCount, generateCodes])

  const handleDownloadCSV = useCallback(() => {
    if (!allowList || allowList.length === 0) {
      toast.error("No codes to download")
      return
    }

    // Create CSV content with headers
    const headers = ["Access Code", "Student Name", "Email (optional)", "Notes"]
    const rows = allowList.map(entry => [entry.studentId, "", "", ""])
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n")

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `student_codes_${topicTitle?.replace(/\s+/g, "_") || topicId}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success("Downloaded CSV template")
  }, [allowList, topicId, topicTitle])

  const handleCopyAllCodes = useCallback(() => {
    if (!allowList || allowList.length === 0) return
    
    const codes = allowList.map(e => e.studentId).join("\n")
    navigator.clipboard.writeText(codes)
    toast.success("Copied all codes to clipboard")
  }, [allowList])

  const handleRemove = useCallback(async (studentId: string) => {
    try {
      await removeStudent({ topicId, studentId })
      toast.success(`Removed code ${studentId}`)
    } catch (error) {
      toast.error("Failed to remove code")
    }
  }, [topicId, removeStudent])

  const handleClearAll = useCallback(async () => {
    try {
      const result = await clearAll({ topicId })
      setGeneratedCodes([])
      toast.success(`Removed ${result.deleted} codes`)
    } catch (error) {
      toast.error("Failed to clear codes")
    }
  }, [topicId, clearAll])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Student Access Codes
        </CardTitle>
        <CardDescription>
          Generate anonymous access codes for students. Map codes to names locally for GDPR compliance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* GDPR Notice */}
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>GDPR Compliant:</strong> Only anonymous codes are stored. 
            Download the CSV and add student names locally on your machine.
          </AlertDescription>
        </Alert>

        {/* Generate codes section */}
        <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
          <Label className="text-sm font-medium">Generate New Access Codes</Label>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Number of Students</Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={studentCount}
                onChange={(e) => setStudentCount(Number(e.target.value) || 0)}
                placeholder="10"
              />
            </div>
            <Button 
              onClick={handleGenerateCodes} 
              disabled={isGenerating || studentCount < 1}
              className="min-w-[140px]"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? "Generating..." : "Generate Codes"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Codes are 6 characters (letters & numbers), easy for students to type.
          </p>
        </div>

        {/* Recently generated codes notification */}
        {generatedCodes.length > 0 && (
          <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
            <AlertDescription className="text-sm">
              ✓ Generated {generatedCodes.length} new codes! Download the CSV to map them to student names.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        {allowList && allowList.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
              <Download className="h-4 w-4 mr-1" />
              Download CSV Template
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleCopyAllCodes}>
              <Copy className="h-4 w-4 mr-1" />
              Copy All Codes
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all access codes?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all {allowList.length} access codes. 
                    Students using these codes will lose access to this topic.
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
          </div>
        )}

        {/* Codes list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Active Access Codes</Label>
            <Badge variant="secondary">
              <Users className="h-3 w-3 mr-1" />
              {allowList?.length ?? 0} codes
            </Badge>
          </div>
          
          {!allowList ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : allowList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
              <Key className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No access codes yet</p>
              <p className="text-xs mt-1">Generate codes above for your students</p>
            </div>
          ) : (
            <ScrollArea className="h-[200px] border rounded-md p-3">
              <div className="flex flex-wrap gap-2">
                {allowList.map((entry) => (
                  <Badge 
                    key={entry._id} 
                    variant="outline"
                    className="flex items-center gap-1 pr-1 font-mono text-sm"
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
