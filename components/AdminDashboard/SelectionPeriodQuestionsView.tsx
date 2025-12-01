"use client"
import { useSignals } from "@preact/signals-react/runtime"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import type { SelectionPeriodQuestionsViewVM } from "./SelectionPeriodQuestionsViewVM"

export const SelectionPeriodQuestionsView: React.FC<{
  vm: SelectionPeriodQuestionsViewVM
}> = ({ vm }) => {
  useSignals()

  return (
    <div className="space-y-8">
      {/* Current Questions Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Questions for this Selection Period</CardTitle>
          <Button size="sm" onClick={vm.addQuestionsDialog.open}>
            <Plus className="h-4 w-4 mr-2" />
            Add Questions
          </Button>
        </CardHeader>
        <CardContent>
          {vm.currentQuestions$.value.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No questions linked yet. Add questions to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vm.currentQuestions$.value.map((q) => (
                  <TableRow key={q.key}>
                    <TableCell>{q.questionText}</TableCell>
                    <TableCell>
                      <Badge variant={q.kindVariant}>{q.kindDisplay}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={q.remove}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Questions Dialog */}
      <Dialog
        open={vm.addQuestionsDialog.isOpen$.value}
        onOpenChange={(open) => !open && vm.addQuestionsDialog.close()}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Questions to Selection Period</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Template Import Section */}
            <div className="space-y-2">
              <Label>Import from Template</Label>
              <p className="text-sm text-muted-foreground">
                Quickly add all questions from a template.
              </p>
              <div className="flex gap-2">
                <Select value={vm.selectedTemplateId$.value} onValueChange={vm.setTemplateId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vm.templates$.value.map((t) => (
                      <SelectItem key={t.key} value={t.key}>
                        <div>
                          <div className="font-medium">{t.title}</div>
                          {t.description && (
                            <div className="text-xs text-muted-foreground">{t.description}</div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={vm.applySelectedTemplate}
                  disabled={!vm.selectedTemplateId$.value}
                  variant="outline"
                >
                  Apply Template
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or select individual questions</span>
              </div>
            </div>

            {/* Question Selection Grid */}
            <div className="space-y-2">
              <Label>Select Questions</Label>
              <p className="text-sm text-muted-foreground">
                Choose individual questions to add.
                {vm.selectedQuestionIds$.value.size > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {vm.selectedQuestionIds$.value.size} selected
                  </Badge>
                )}
              </p>
              <div className="h-[300px] overflow-y-auto scrollbar-hide">
                {vm.availableQuestions$.value.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No questions available. Create some first.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {vm.availableQuestions$.value.map((q) => {
                      const isChecked = vm.selectedQuestionIds$.value.has(q.id)
                      return (
                        <label
                          key={q.id}
                          htmlFor={`q-${q.id}`}
                          className="flex items-start space-x-3 rounded-md border p-3 hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            id={`q-${q.id}`}
                            checked={isChecked}
                            onCheckedChange={() => vm.toggleQuestion(q.id)}
                          />
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium leading-none line-clamp-2">
                              {q.questionText}
                            </p>
                            <Badge variant={q.kindVariant} className="text-xs">
                              {q.kindDisplay}
                            </Badge>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={vm.addQuestionsDialog.close}>
              Cancel
            </Button>
            <Button
              onClick={vm.addSelectedQuestions}
              disabled={vm.selectedQuestionIds$.value.size === 0}
            >
              Add Selected ({vm.selectedQuestionIds$.value.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
