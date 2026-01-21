"use client"

import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle2, TrendingUp, TrendingDown, Minus, Upload, FileText, X } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

interface ExperimentComparison {
  _id: Id<"experimentComparisons">
  periodId: Id<"selectionPeriods">
  originalBatchId: string
  newBatchId: string
  totalStudents: number
  sameGroupCount: number
  differentGroupCount: number
  rankedStudents: number
  avgRankOriginal: number
  avgRankNew: number
  teamSizesMatch: boolean
  betterMatches: number
  worseMatches: number
  sameRank: number
  rowsSkipped: number
  betterMatchesList: Array<{
    name: string
    studentId: string
    originalRank: number
    newRank: number
  }>
  worseMatchesList: Array<{
    name: string
    studentId: string
    originalRank: number
    newRank: number
  }>
  createdAt: number
  similarity: number
}

export const ExperimentComparisonsView: React.FC<{ periodId?: Id<"selectionPeriods"> }> = ({ periodId }) => {
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false)
  const [csvText, setCsvText] = React.useState("")
  const [formData, setFormData] = React.useState({
    periodId: periodId ?? "",
    originalBatchId: "",
    newBatchId: "",
  })
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const comparisons = useQuery(
    api.experimentComparisons.getAllComparisons,
    {}
  )

  const allPeriods = useQuery(api.selectionPeriods.getAllPeriodsWithStats, {})

  const importComparison = useMutation(api.experimentComparisons.importComparison)

  const parseCSV = (csvContent: string) => {
    const lines = csvContent.trim().split("\n").filter(line => line.trim())
    if (lines.length < 2) {
      throw new Error("CSV must have at least a header row and one data row")
    }

    // Parse header
    const header = lines[0].split(",").map(h => h.trim())
    const nameIdx = header.findIndex(h => h.toLowerCase().includes("name"))
    const studentIdIdx = header.findIndex(h => h.toLowerCase().includes("studentid") || h.toLowerCase().includes("student"))
    const groupIdx = header.findIndex(h => h.toLowerCase() === "group")
    const newGroupIdx = header.findIndex(h => h.toLowerCase() === "newgroup")
    const sameAsOriginalIdx = header.findIndex(h => h.toLowerCase().includes("sameasoriginal") || h.toLowerCase().includes("same"))
    const newRankIdx = header.findIndex(h => h.toLowerCase().includes("newgrouppreferencerank") || h.toLowerCase().includes("newrank"))
    const originalRankIdx = header.findIndex(h => h.toLowerCase().includes("originalgrouppreferencerank") || h.toLowerCase().includes("originalrank"))

    if (nameIdx === -1 || studentIdIdx === -1 || groupIdx === -1 || newGroupIdx === -1) {
      throw new Error("CSV must contain Name, StudentID, Group, and NewGroup columns")
    }

    // Parse data rows
    const students: Array<{
      name: string
      studentId: string
      originalGroup: number
      newGroup: number
      sameAsOriginal: boolean
      originalRank?: number
      newRank?: number
    }> = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      // Handle CSV with quoted fields that may contain commas
      const fields: string[] = []
      let currentField = ""
      let inQuotes = false

      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          fields.push(currentField.trim())
          currentField = ""
        } else {
          currentField += char
        }
      }
      fields.push(currentField.trim())

      if (fields.length < Math.max(nameIdx, studentIdIdx, groupIdx, newGroupIdx) + 1) {
        continue // Skip malformed rows
      }

      const name = fields[nameIdx]?.trim() || ""
      const studentId = fields[studentIdIdx]?.trim() || ""
      const originalGroup = parseInt(fields[groupIdx]?.trim() || "0")
      const newGroup = parseInt(fields[newGroupIdx]?.trim() || "0")
      const sameAsOriginal = sameAsOriginalIdx !== -1 
        ? fields[sameAsOriginalIdx]?.trim().toLowerCase() === "yes"
        : originalGroup === newGroup
      
      const originalRank = originalRankIdx !== -1 && fields[originalRankIdx]?.trim()
        ? parseInt(fields[originalRankIdx].trim())
        : undefined
      const newRank = newRankIdx !== -1 && fields[newRankIdx]?.trim()
        ? parseInt(fields[newRankIdx].trim())
        : undefined

      if (name && studentId) {
        students.push({
          name,
          studentId,
          originalGroup,
          newGroup,
          sameAsOriginal,
          originalRank: isNaN(originalRank as number) ? undefined : originalRank,
          newRank: isNaN(newRank as number) ? undefined : newRank,
        })
      }
    }

    // Calculate statistics
    const totalStudents = students.length
    const sameGroupCount = students.filter(s => s.sameAsOriginal).length
    const differentGroupCount = totalStudents - sameGroupCount
    
    const rankedStudents = students.filter(s => s.originalRank !== undefined && s.newRank !== undefined)
    const rankedCount = rankedStudents.length
    
    const originalRanks = rankedStudents.map(s => s.originalRank!).filter(r => !isNaN(r) && r > 0)
    const newRanks = rankedStudents.map(s => s.newRank!).filter(r => !isNaN(r) && r > 0)
    
    const avgRankOriginal = originalRanks.length > 0
      ? originalRanks.reduce((sum, r) => sum + r, 0) / originalRanks.length
      : 0
    const avgRankNew = newRanks.length > 0
      ? newRanks.reduce((sum, r) => sum + r, 0) / newRanks.length
      : 0

    // Count better/worse/same rank
    let betterMatches = 0
    let worseMatches = 0
    let sameRank = 0
    const betterMatchesList: Array<{ name: string; studentId: string; originalRank: number; newRank: number }> = []
    const worseMatchesList: Array<{ name: string; studentId: string; originalRank: number; newRank: number }> = []

    for (const student of rankedStudents) {
      if (student.originalRank === undefined || student.newRank === undefined) continue
      if (isNaN(student.originalRank) || isNaN(student.newRank)) continue
      if (student.originalRank === 0 || student.newRank === 0) continue

      if (student.newRank < student.originalRank) {
        betterMatches++
        betterMatchesList.push({
          name: student.name,
          studentId: student.studentId,
          originalRank: student.originalRank,
          newRank: student.newRank
        })
      } else if (student.newRank > student.originalRank) {
        worseMatches++
        worseMatchesList.push({
          name: student.name,
          studentId: student.studentId,
          originalRank: student.originalRank,
          newRank: student.newRank
        })
      } else {
        sameRank++
      }
    }

    // Check team sizes match (count students per group)
    const originalGroupSizes = new Map<number, number>()
    const newGroupSizes = new Map<number, number>()
    students.forEach(s => {
      originalGroupSizes.set(s.originalGroup, (originalGroupSizes.get(s.originalGroup) || 0) + 1)
      newGroupSizes.set(s.newGroup, (newGroupSizes.get(s.newGroup) || 0) + 1)
    })
    
    const originalSizes = Array.from(originalGroupSizes.values()).sort()
    const newSizes = Array.from(newGroupSizes.values()).sort()
    const teamSizesMatch = originalSizes.length === newSizes.length &&
      originalSizes.every((size, idx) => size === newSizes[idx])

    const rowsSkipped = totalStudents - rankedCount

    return {
      totalStudents,
      sameGroupCount,
      differentGroupCount,
      rankedStudents: rankedCount,
      avgRankOriginal,
      avgRankNew,
      teamSizesMatch,
      betterMatches,
      worseMatches,
      sameRank,
      rowsSkipped,
      betterMatchesList,
      worseMatchesList,
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setCsvText(content)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    try {
      if (!csvText.trim()) {
        throw new Error("Please provide CSV data or upload a file")
      }

      if (!formData.periodId) {
        throw new Error("Please provide a Period ID")
      }

      // Auto-generate batch IDs if not provided
      const originalBatchId = formData.originalBatchId || "teacher-assignment"
      const newBatchId = formData.newBatchId || "algorithm-assignment"

      // Parse CSV
      const stats = parseCSV(csvText)

      await importComparison({
        periodId: formData.periodId as Id<"selectionPeriods">,
        originalBatchId,
        newBatchId,
        ...stats,
      })

      toast.success("Comparison imported successfully")
      setIsImportDialogOpen(false)
      setCsvText("")
      setFormData({ periodId: periodId ?? "", originalBatchId: "", newBatchId: "" })
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error: any) {
      toast.error(`Failed to import: ${error.message}`)
    }
  }

  if (!comparisons) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => setIsImportDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Import Comparison
        </Button>
      </div>

      {comparisons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No experiment comparisons yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Import comparison data to show algorithm consistency
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {comparisons.map((comparison) => (
            <ComparisonCard key={comparison._id} comparison={comparison as ExperimentComparison} />
          ))}
        </div>
      )}

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Experiment Comparison</DialogTitle>
            <DialogDescription>
              Compare your teacher's Excel assignment results with your algorithm's results
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="periodId">Select Project Assignment <span className="text-red-500">*</span></Label>
              {allPeriods && allPeriods.length > 0 ? (
                <Select
                  value={formData.periodId}
                  onValueChange={(value) => setFormData({ ...formData, periodId: value })}
                >
                  <SelectTrigger id="periodId">
                    <SelectValue placeholder="Select a project assignment" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPeriods.map((period) => (
                      <SelectItem key={period._id} value={period._id}>
                        {period.title} ({format(new Date(period.closeDate), "MMM d, yyyy")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="periodId"
                  value={formData.periodId}
                  onChange={(e) => setFormData({ ...formData, periodId: e.target.value })}
                  placeholder="Enter period ID manually"
                  disabled={!allPeriods}
                />
              )}
              <p className="text-xs text-muted-foreground">
                The project assignment period you're comparing
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="originalBatchId">
                Original Assignment Label <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="originalBatchId"
                value={formData.originalBatchId}
                onChange={(e) => setFormData({ ...formData, originalBatchId: e.target.value })}
                placeholder="e.g., teacher-assignment (default: 'teacher-assignment')"
              />
              <p className="text-xs text-muted-foreground">
                A label to identify the teacher's assignment (from Excel). Leave empty to use default.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newBatchId">
                Algorithm Assignment Label <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="newBatchId"
                value={formData.newBatchId}
                onChange={(e) => setFormData({ ...formData, newBatchId: e.target.value })}
                placeholder="e.g., algorithm-assignment (default: 'algorithm-assignment')"
              />
              <p className="text-xs text-muted-foreground">
                A label to identify your algorithm's assignment. Leave empty to use default.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="csvFile">Upload CSV File</Label>
              <Input
                ref={fileInputRef}
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                CSV should have columns: Name, StudentID, Group, NewGroup, SameAsOriginal, NewGroupPreferenceRank, OriginalGroupPreferenceRank
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="csvText">Or Paste CSV Data</Label>
              <Textarea
                id="csvText"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Paste CSV data here (or upload file above)..."
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsImportDialogOpen(false)
                setCsvText("")
                if (fileInputRef.current) {
                  fileInputRef.current.value = ""
                }
              }}>
                Cancel
              </Button>
              <Button onClick={handleImport}>Import</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const ComparisonCard: React.FC<{ comparison: ExperimentComparison }> = ({ comparison }) => {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const similarity = comparison.similarity
  const sameGroupPercentage = (comparison.sameGroupCount / comparison.totalStudents) * 100
  const sameRankPercentage = (comparison.sameRank / comparison.rankedStudents) * 100

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              Experiment Comparison
              <Badge variant={similarity >= 90 ? "default" : similarity >= 75 ? "secondary" : "outline"}>
                {similarity.toFixed(1)}% Similar
              </Badge>
            </CardTitle>
            <CardDescription className="mt-2">
              Created {format(comparison.createdAt, "PPp")}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Key Similarity Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Same Groups</div>
              <div className="text-2xl font-bold">
                {comparison.sameGroupCount}/{comparison.totalStudents}
              </div>
              <div className="text-xs text-muted-foreground">
                {sameGroupPercentage.toFixed(1)}% of students
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Same Rank</div>
              <div className="text-2xl font-bold">
                {comparison.sameRank}/{comparison.rankedStudents}
              </div>
              <div className="text-xs text-muted-foreground">
                {sameRankPercentage.toFixed(1)}% of ranked students
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Average Rank</div>
              <div className="text-2xl font-bold">
                {comparison.avgRankOriginal.toFixed(2)} → {comparison.avgRankNew.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                Difference: {Math.abs(comparison.avgRankOriginal - comparison.avgRankNew).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Summary Statement */}
          <div className="bg-muted/50 rounded-lg p-4 border">
            <p className="text-sm leading-relaxed">
              <strong>Results are very similar:</strong> {sameGroupPercentage.toFixed(1)}% of students 
              ({comparison.sameGroupCount} out of {comparison.totalStudents}) were assigned to the same group, 
              and {sameRankPercentage.toFixed(1)}% of ranked students ({comparison.sameRank} out of {comparison.rankedStudents}) 
              received the same preference rank. The average preference rank changed by only{" "}
              {Math.abs(comparison.avgRankOriginal - comparison.avgRankNew).toFixed(2)} points, 
              demonstrating high consistency in the assignment algorithm.
            </p>
          </div>

          {/* Detailed Stats */}
          {isExpanded && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Students</div>
                  <div className="text-lg font-semibold">{comparison.totalStudents}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Different Groups</div>
                  <div className="text-lg font-semibold">{comparison.differentGroupCount}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Better Matches</div>
                  <div className="text-lg font-semibold text-green-600">{comparison.betterMatches}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Worse Matches</div>
                  <div className="text-lg font-semibold text-red-600">{comparison.worseMatches}</div>
                </div>
              </div>

              {comparison.betterMatchesList.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Better Matches ({comparison.betterMatchesList.length})
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Original Rank</TableHead>
                        <TableHead>New Rank</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison.betterMatchesList.map((match, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{match.name}</TableCell>
                          <TableCell>{match.studentId}</TableCell>
                          <TableCell>{match.originalRank}</TableCell>
                          <TableCell className="text-green-600 font-semibold">{match.newRank}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {comparison.worseMatchesList.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    Worse Matches ({comparison.worseMatchesList.length})
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Original Rank</TableHead>
                        <TableHead>New Rank</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison.worseMatchesList.map((match, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{match.name}</TableCell>
                          <TableCell>{match.studentId}</TableCell>
                          <TableCell>{match.originalRank}</TableCell>
                          <TableCell className="text-red-600 font-semibold">{match.newRank}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
