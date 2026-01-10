"use client"
import { useSignals } from "@preact/signals-react/runtime"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2 } from "lucide-react"
import type { QuestionnairesViewVM } from "./QuestionnairesViewVM"
import QuestionForm from "@/components/forms/question-form"
import TemplateForm from "@/components/forms/template-form"
import CategoryForm from "@/components/forms/category-form"

export const QuestionnairesView: React.FC<{ vm: QuestionnairesViewVM }> = ({ vm }) => {
  useSignals()

  return (
    <div className="space-y-8">
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

      {/* Templates Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Templates</CardTitle>
          <Button size="sm" onClick={vm.templateDialog.open}>
            <Plus className="h-4 w-4 mr-2" />Add Template
          </Button>
        </CardHeader>
        <CardContent>
          {vm.templates$.value.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No templates yet. Add one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vm.templates$.value.map((t) => (
                  <TableRow key={t.key}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell>{t.description}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={t.remove}>
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

      {/* Question Dialog */}
      <Dialog open={vm.questionDialog.isOpen$.value} onOpenChange={(open) => !open && vm.questionDialog.close()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Question</DialogTitle></DialogHeader>
          <QuestionForm 
            onSubmit={vm.onQuestionSubmit}
            existingCategories={[...vm.existingCategories$.value]}
          />
        </DialogContent>
      </Dialog>

      {/* Categories Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Categories</CardTitle>
          <Button size="sm" onClick={vm.categoryDialog.open}>
            <Plus className="h-4 w-4 mr-2" />Add Category
          </Button>
        </CardHeader>
        <CardContent>
          {vm.categories$.value.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No categories yet. Add one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vm.categories$.value.map((c) => (
                  <TableRow key={c.key}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.description}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={c.remove}>
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

      {/* Question Dialog */}
      <Dialog open={vm.questionDialog.isOpen$.value} onOpenChange={(open) => !open && vm.questionDialog.close()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Question</DialogTitle></DialogHeader>
          <QuestionForm 
            onSubmit={vm.onQuestionSubmit}
            existingCategories={[...vm.existingCategories$.value]}
          />
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={vm.templateDialog.isOpen$.value} onOpenChange={(open) => !open && vm.templateDialog.close()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
          <TemplateForm
            questions={vm.availableQuestions$.value}
            onSubmit={vm.onTemplateSubmit}
          />
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={vm.categoryDialog.isOpen$.value} onOpenChange={(open) => !open && vm.categoryDialog.close()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Category</DialogTitle></DialogHeader>
          <CategoryForm onSubmit={vm.onCategorySubmit} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
