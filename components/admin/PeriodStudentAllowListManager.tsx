"use client"

import * as React from "react"
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
  ShieldCheck,
  Upload,
  Check,
  Edit
} from "lucide-react"

interface PeriodStudentAllowListManagerProps {
  selectionPeriodId: Id<"selectionPeriods">
  periodTitle?: string
}

export function PeriodStudentAllowListManager({ 
  selectionPeriodId, 
  periodTitle 
}: PeriodStudentAllowListManagerProps) {
  const [studentCount, setStudentCount] = useState(10)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [editingEntryId, setEditingEntryId] = React.useState<string | null>(null)
  const [editingName, setEditingName] = React.useState<string>("")

  const allowList = useQuery(api.periodStudentAccessCodes.getPeriodAccessCodes, { selectionPeriodId })
  const generateCodes = useMutation(api.periodStudentAccessCodes.generateStudentAccessCodes)
  const removeStudent = useMutation(api.periodStudentAccessCodes.removeStudentCode)
  const clearAll = useMutation(api.periodStudentAccessCodes.clearAllStudentCodes)
  const importNames = useMutation(api.periodStudentAccessCodes.importStudentNames)
  const updateName = useMutation(api.periodStudentAccessCodes.updateStudentName)

  const handleGenerateCodes = useCallback(async () => {
    if (studentCount < 1 || studentCount > 500) {
      toast.error("Please enter a number between 1 and 500")
      return
    }

    setIsGenerating(true)
    try {
      const result = await generateCodes({ selectionPeriodId, count: studentCount })
      setGeneratedCodes(result.codes)
      toast.success(`Generated ${result.total} access codes`)
    } catch (error) {
      console.error("Failed to generate codes:", error)
      toast.error("Failed to generate codes")
    } finally {
      setIsGenerating(false)
    }
  }, [selectionPeriodId, studentCount, generateCodes])

  const handleDownloadCSV = useCallback(() => {
    if (!allowList || allowList.length === 0) {
      toast.error("No codes to download")
      return
    }

    // Create CSV content with headers (Name column for teacher to fill)
    // Use exact header names that match what we're looking for in import
    const headers = ["Access Code", "Student Name"]
    const rows = allowList.map(entry => [
      entry.code,
      entry.name || "" // Include existing names if any
    ])
    
    // Quote cells to handle commas in names, and escape quotes
    const csvContent = [
      headers.map(h => `"${h}"`).join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n")

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `student_codes_${periodTitle?.replace(/\s+/g, "_") || "project_assignment"}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success("Downloaded CSV template")
  }, [allowList, periodTitle])

  const handleImportCSV = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      if (lines.length < 2) {
        toast.error("CSV file must have at least a header row and one data row")
        return
      }
      
      // Helper to parse CSV line handling quoted values
      const parseCSVLine = (line: string): string[] => {
        const cells: string[] = []
        let currentCell = ""
        let inQuotes = false
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              currentCell += '"'
              i++ // Skip next quote
            } else {
              inQuotes = !inQuotes
            }
          } else if (char === ',' && !inQuotes) {
            cells.push(currentCell.trim())
            currentCell = ""
          } else {
            currentCell += char
          }
        }
        cells.push(currentCell.trim()) // Add last cell
        return cells
      }
      
      // Parse header row
      const headerLine = lines[0]
      const headers = parseCSVLine(headerLine).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase())
      
      const codeIndex = headers.findIndex(h => h.includes('code') || h.includes('access'))
      const nameIndex = headers.findIndex(h => (h.includes('name') || h.includes('student')) && !h.includes('code'))
      
      if (codeIndex === -1 || nameIndex === -1) {
        toast.error(`CSV must have 'Access Code' and 'Student Name' columns. Found: ${headers.join(", ")}`)
        return
      }
      
      // Parse data rows
      
      const mappings = lines.slice(1)
        .map((line, lineNum) => {
          const cells = parseCSVLine(line)
          
          const code = cells[codeIndex]?.replace(/^"|"$/g, '').trim() || ""
          const name = cells[nameIndex]?.replace(/^"|"$/g, '').trim() || ""
          
          return {
            code,
            name,
            lineNum: lineNum + 2 // +2 because we skip header and 1-indexed
          }
        })
        .filter(m => {
          if (!m.code) {
            console.warn(`Skipping row ${m.lineNum}: missing code`)
            return false
          }
          if (!m.name) {
            console.warn(`Skipping row ${m.lineNum}: missing name`)
            return false
          }
          return true
        })
        .map(({ code, name }) => ({ code, name })) // Remove lineNum from final mapping
      
      if (mappings.length === 0) {
        toast.error("No valid code-name pairs found in CSV")
        return
      }
      
      console.log("Importing mappings:", mappings)
      const result = await importNames({ 
        selectionPeriodId, 
        nameMappings: mappings 
      })
      
      console.log("Import result:", result)
      
      if (result.errors && result.errors.length > 0) {
        const errorMsg = result.errors.slice(0, 3).join(", ")
        const moreErrors = result.errors.length > 3 ? ` and ${result.errors.length - 3} more` : ""
        toast.warning(`Imported ${result.updated} names. Issues: ${errorMsg}${moreErrors}`)
      } else if (result.updated > 0) {
        toast.success(`Imported ${result.updated} student names`)
      } else {
        toast.error("No names were imported. Check that codes match and names are not empty.")
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error("Failed to import CSV:", error)
      toast.error(error instanceof Error ? error.message : "Failed to import CSV. Please check the format.")
    } finally {
      setIsImporting(false)
    }
  }, [selectionPeriodId, importNames])

  const handleStartEdit = useCallback((entryId: string, currentName: string) => {
    setEditingEntryId(entryId)
    setEditingName(currentName || "")
  }, [])

  const handleSaveName = useCallback(async (entryId: string, code: string) => {
    try {
      await updateName({
        selectionPeriodId,
        studentId: code,
        name: editingName
      })
      setEditingEntryId(null)
      setEditingName("")
      toast.success("Name updated")
    } catch (error) {
      console.error("Failed to update name:", error)
      toast.error("Failed to update name")
    }
  }, [selectionPeriodId, editingName, updateName])

  const handleCancelEdit = useCallback(() => {
    setEditingEntryId(null)
    setEditingName("")
  }, [])

  const handleCopyAllCodes = useCallback(() => {
    if (!allowList || allowList.length === 0) return
    
    const codes = allowList.map(e => e.code).join("\n")
    navigator.clipboard.writeText(codes)
    toast.success("Copied all codes to clipboard")
  }, [allowList])

  const handleRemove = useCallback(async (studentId: string) => {
    try {
      await removeStudent({ selectionPeriodId, studentId })
      toast.success(`Removed code ${studentId}`)
    } catch (error) {
      toast.error("Failed to remove code")
    }
  }, [selectionPeriodId, removeStudent])

  const handleClearAll = useCallback(async () => {
    try {
      const result = await clearAll({ selectionPeriodId })
      setGeneratedCodes([])
      toast.success(`Removed ${result.deleted} codes`)
    } catch (error) {
      toast.error("Failed to clear codes")
    }
  }, [selectionPeriodId, clearAll])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Student Access Codes
        </CardTitle>
        <CardDescription>
          Generate anonymous access codes for students. Students with these codes can access all topics in this project assignment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* GDPR Notice */}
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>GDPR Compliant:</strong> Student names are optional and only stored if you explicitly provide them via CSV import. 
            Names are only visible to authenticated admins. You can download the CSV, add names locally, and import them back.
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
            Codes are 6 characters (letters & numbers). Students use these to access all topics.
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
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
              id="csv-import"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              <Upload className="h-4 w-4 mr-1" />
              {isImporting ? "Importing..." : "Import Names"}
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
                    Students using these codes will lose access to all topics.
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

        {/* Names Needed Alert */}
        {allowList && allowList.length > 0 && !allowList.some(entry => entry.name) && (
          <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
            <AlertDescription className="text-sm">
              <strong>Names Needed:</strong> You have {allowList.length} access codes but no student names assigned. 
              Download the CSV, add names, and import them back.
            </AlertDescription>
          </Alert>
        )}

        {/* Codes list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Active Access Codes</Label>
            <Badge variant="secondary">
              <Users className="h-3 w-3 mr-1" />
              {allowList?.length ?? 0} codes
              {allowList && allowList.some(e => e.name) && (
                <span className="ml-1">• {allowList.filter(e => e.name).length} with names</span>
              )}
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
              <div className="space-y-2">
                {allowList.map((entry) => {
                  const isEditing = editingEntryId === entry._id
                  return (
                  <div key={entry._id} className="flex items-center justify-between p-2 border rounded hover:bg-muted/50">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge variant="outline" className="font-mono text-xs shrink-0">
                        {entry.code}
                      </Badge>
                      {isEditing ? (
                        <div className="flex items-center gap-1 flex-1">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveName(entry._id, entry.code)
                              } else if (e.key === "Escape") {
                                handleCancelEdit()
                              }
                            }}
                            placeholder="Enter student name"
                            className="h-7 text-sm"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => handleSaveName(entry._id, entry.code)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span 
                          className="text-sm truncate cursor-pointer hover:text-primary"
                          onClick={() => handleStartEdit(entry._id, entry.name || "")}
                          title="Click to edit name"
                        >
                          {entry.name || <span className="text-muted-foreground italic">No name (click to add)</span>}
                        </span>
                      )}
                    </div>
                    {!isEditing && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground shrink-0"
                        onClick={() => handleRemove(entry.code)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
