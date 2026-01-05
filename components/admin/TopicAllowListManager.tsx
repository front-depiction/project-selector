"use client"

import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Upload,
  X,
  Plus,
  Trash2,
  FileSpreadsheet,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"

interface TopicAllowListManagerProps {
  topicId: Id<"topics">
  topicTitle?: string
}

/**
 * Parse emails from file content (CSV or Excel)
 */
function parseEmails(content: string | ArrayBuffer, fileName: string): string[] {
  const emails: string[] = []

  if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
    // Parse CSV/TXT
    const text = typeof content === "string" ? content : new TextDecoder().decode(content)
    const lines = text.split(/[\r\n]+/)

    for (const line of lines) {
      // Split by comma, semicolon, tab, or whitespace
      const parts = line.split(/[,;\t\s]+/)
      for (const part of parts) {
        const trimmed = part.trim().toLowerCase()
        if (trimmed && trimmed.includes("@")) {
          emails.push(trimmed)
        }
      }
    }
  } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    // Parse Excel
    const workbook = XLSX.read(content, { type: "array" })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 })

    for (const row of data) {
      if (Array.isArray(row)) {
        for (const cell of row) {
          if (typeof cell === "string") {
            const trimmed = cell.trim().toLowerCase()
            if (trimmed && trimmed.includes("@")) {
              emails.push(trimmed)
            }
          }
        }
      }
    }
  }

  // Remove duplicates
  return [...new Set(emails)]
}

export function TopicAllowListManager({ topicId, topicTitle }: TopicAllowListManagerProps) {
  const allowList = useQuery(api.topicAllowList.getTopicAllowList, { topicId })
  const bulkAddEmails = useMutation(api.topicAllowList.bulkAddEmails)
  const addEmail = useMutation(api.topicAllowList.addEmail)
  const removeEmail = useMutation(api.topicAllowList.removeEmail)
  const clearAllEmails = useMutation(api.topicAllowList.clearAllEmails)

  const [newEmail, setNewEmail] = React.useState("")
  const [isImporting, setIsImporting] = React.useState(false)
  const [importResults, setImportResults] = React.useState<{ added: number; updated: number; skipped: number } | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setImportResults(null)

    try {
      const buffer = await file.arrayBuffer()
      const emails = parseEmails(buffer, file.name)

      if (emails.length === 0) {
        toast.error("No valid email addresses found in file")
        setIsImporting(false)
        return
      }

      const result = await bulkAddEmails({
        topicId,
        emails,
        note: `Imported from ${file.name}`,
      })

      setImportResults(result)
      toast.success(`Import complete: ${result.added} added, ${result.updated} updated`)
    } catch (error) {
      console.error("Import error:", error)
      toast.error("Failed to import emails")
    } finally {
      setIsImporting(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleAddEmail = async () => {
    if (!newEmail.trim()) return

    try {
      await addEmail({ topicId, email: newEmail.trim() })
      setNewEmail("")
      toast.success("Email added to allow-list")
    } catch (error) {
      toast.error("Failed to add email")
    }
  }

  const handleRemoveEmail = async (email: string) => {
    try {
      await removeEmail({ topicId, email })
      toast.success("Email removed from allow-list")
    } catch (error) {
      toast.error("Failed to remove email")
    }
  }

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to remove all emails from the allow-list?")) {
      return
    }

    try {
      const result = await clearAllEmails({ topicId })
      toast.success(`Removed ${result.deleted} emails from allow-list`)
    } catch (error) {
      toast.error("Failed to clear allow-list")
    }
  }

  const isLoading = allowList === undefined

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Topic Allow-List</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {allowList?.length ?? 0} emails
          </Badge>
        </div>
        <CardDescription>
          {topicTitle
            ? `Manage who can see and select "${topicTitle}"`
            : "Manage who can see and select this topic"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* File Import Section */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Import from File</Label>
          <div className="flex items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isImporting}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Supports CSV, TXT, and Excel files (.xlsx, .xls). Email addresses will be extracted automatically.
          </p>
        </div>

        {/* Import Results */}
        {importResults && (
          <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-md text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>
              Added {importResults.added}, updated {importResults.updated}
              {importResults.skipped > 0 && `, skipped ${importResults.skipped}`}
            </span>
          </div>
        )}

        <Separator />

        {/* Add Single Email */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Add Email Manually</Label>
          <div className="flex items-center gap-2">
            <Input
              type="email"
              placeholder="student@university.edu"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddEmail()
                }
              }}
            />
            <Button type="button" size="icon" onClick={handleAddEmail}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Current Allow-List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Current Allow-List</Label>
            {(allowList?.length ?? 0) > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleClearAll}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : allowList && allowList.length > 0 ? (
            <ScrollArea className="h-[200px] rounded-md border">
              <div className="p-2 space-y-1">
                {allowList.map((entry) => (
                  <div
                    key={entry._id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm truncate">{entry.email}</span>
                      {entry.note && (
                        <Badge variant="outline" className="text-xs truncate max-w-[100px]">
                          {entry.note}
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveEmail(entry.email)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <FileSpreadsheet className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No emails in allow-list</p>
              <p className="text-xs">Import a file or add emails manually</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

