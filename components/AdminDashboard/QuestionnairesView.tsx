"use client"
import { useSignals } from "@preact/signals-react/runtime"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Edit, MoreVertical, Trash2 as Trash, Plus } from "lucide-react"
import type { QuestionnairesViewVM } from "./QuestionnairesViewVM"
import QuestionForm from "@/components/forms/question-form"
import CategoryForm from "@/components/forms/category-form"
import * as Option from "effect/Option"

export const QuestionnairesView: React.FC<{ vm: QuestionnairesViewVM }> = ({ vm }) => {
  useSignals()

  return (
    <div className="space-y-8">
      {/* Balanced Distribution Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Balanced Distribution</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              These criteria are applied to the entire project assignment and all topics to ensure even distribution across groups.
            </p>
          </div>
          <Button size="sm" onClick={vm.openMinimizeCategoryDialog}>
            <Plus className="h-4 w-4 mr-2" />Add Category
          </Button>
        </CardHeader>
        <CardContent>
          {vm.minimizeCategories$.value.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No balanced distribution criteria yet. Add one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Criterion</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vm.minimizeCategories$.value.map((c) => (
                  <TableRow key={c.key}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.description}</TableCell>
                    <TableCell>
                      <Badge variant={c.criterionBadgeVariant}>
                        {c.criterionDisplay}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={c.edit}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={c.remove}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Questions Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Questions</CardTitle>
          <Button size="sm" onClick={vm.questionDialog.open}>
            <Plus className="h-4 w-4 mr-2" />Add Question
          </Button>
        </CardHeader>
        <CardContent>
          {vm.questions$.value.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No questions yet. Add one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vm.questions$.value.map((q) => (
                  <TableRow key={q.key}>
                    <TableCell>{q.questionText}</TableCell>
                    <TableCell>
                      {q.category ? (
                        <Badge variant="outline">{q.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={q.kindVariant}>{q.kindDisplay}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={q.edit}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={q.remove}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={vm.categoryDialog.isOpen$.value} onOpenChange={(open) => !open && vm.categoryDialog.close()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {Option.isSome(vm.editingCategory$.value) ? "Edit Category" : "Create Category"}
            </DialogTitle>
          </DialogHeader>
          <CategoryForm
            onSubmit={vm.onCategorySubmit}
            mode={vm.categoryDialogMode$.value}
            initialValues={Option.getOrUndefined(Option.map(vm.editingCategory$.value, c => ({
              name: c.name,
              description: c.description || "",
              criterionType: c.criterionType ?? undefined,
              minValue: c.criterionType === "prerequisite" && c.minRatio !== undefined
                ? Number((c.minRatio * 6).toFixed(1))
                : undefined,
              maxValue: c.criterionType === "maximize" && c.minRatio !== undefined
                ? Number((c.minRatio * 6).toFixed(1))
                : undefined,
              minStudents: c.minStudents,
              maxStudents: c.maxStudents,
            })))}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={vm.questionDialog.isOpen$.value} onOpenChange={(open) => !open && vm.questionDialog.close()}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {Option.isSome(vm.editingQuestion$.value) ? "Edit Question" : "Create Question"}
            </DialogTitle>
          </DialogHeader>
          <QuestionForm
            onSubmit={vm.onQuestionSubmit}
            existingCategories={[...vm.existingCategories$.value]}
            initialValues={Option.getOrUndefined(Option.map(vm.editingQuestion$.value, q => ({
              question: q.question,
              kind: q.kind,
              category: q.category,
              semester_id: "default"
            })))}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
