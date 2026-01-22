"use client"

import * as React from "react"
import * as Option from "effect/Option"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Edit, Trash2 as Trash, MoreVertical, ChevronDown, ChevronRight } from "lucide-react"
import TopicForm from "@/components/forms/topic-form"
import CategoryForm from "@/components/forms/category-form"
import type { TopicsViewVM } from "./TopicsViewVM"
import { useSignals } from "@preact/signals-react/runtime"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ============================================================================
// TOPICS VIEW - Clean table-based layout with View Model pattern
// ============================================================================

interface TopicsViewProps {
  vm: TopicsViewVM
}

export const TopicsView: React.FC<TopicsViewProps> = ({ vm }) => {
  useSignals()

  // Track collapsible section state
  const [criteriaExpanded, setCriteriaExpanded] = React.useState(false)

  const criteriaCount = vm.constraintCategories$.value.length

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Topics Management</h2>
          <p className="text-muted-foreground mt-1">Manage available topics for student selection</p>
        </div>
        <Button onClick={vm.createTopicDialog.open} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Create Topic
        </Button>
      </div>

      {/* Topic-Specific Criteria Collapsible Section */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setCriteriaExpanded(!criteriaExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {criteriaExpanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
              <CardTitle className="text-lg">Topic-Specific Criteria</CardTitle>
              <Badge variant="secondary">{criteriaCount}</Badge>
            </div>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                vm.categoryDialog.open()
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
          <CardDescription className="ml-7">
            Prerequisites and maximization criteria that can be assigned to specific topics.
          </CardDescription>
        </CardHeader>
        {criteriaExpanded && (
          <CardContent>
            {vm.constraintCategories$.value.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No constraints yet. Add one to get started.</p>
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
                  {vm.constraintCategories$.value.map((c) => (
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
        )}
      </Card>

      {/* Topics Table */}
      {vm.topics$.value.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>No Topics</CardTitle>
            <CardDescription>Create your first topic to get started.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vm.topics$.value.map((topic) => (
                  <TableRow key={topic.key}>
                    <TableCell className="font-medium">{topic.title}</TableCell>
                    <TableCell className="max-w-xs truncate">{topic.description}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={topic.edit}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={topic.remove}
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
          </CardContent>
        </Card>
      )}

      {/* Create Topic Dialog */}
      <Dialog open={vm.createTopicDialog.isOpen$.value} onOpenChange={(open) => !open && vm.createTopicDialog.close()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Topic</DialogTitle>
            <DialogDescription>
              Add a new topic that students can select. Student access is managed at the Project Assignment level.
            </DialogDescription>
          </DialogHeader>
          <TopicForm constraints={[...vm.constraintOptions$.value]} onSubmit={vm.onTopicSubmit} />
        </DialogContent>
      </Dialog>

      {/* Edit Topic Dialog */}
      <Dialog open={vm.editTopicDialog.isOpen$.value} onOpenChange={(open) => !open && vm.editTopicDialog.close()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Topic</DialogTitle>
            <DialogDescription>
              Update the details of this topic.
            </DialogDescription>
          </DialogHeader>
          {Option.isSome(vm.editTopicDialog.editingTopic$.value) && (
            <TopicForm
              constraints={[...vm.constraintOptions$.value]}
              initialValues={{
                title: vm.editTopicDialog.editingTopic$.value.value.title,
                description: vm.editTopicDialog.editingTopic$.value.value.description,
                constraintIds: vm.editTopicDialog.editingTopic$.value.value.constraintIds ?? []
              }}
              onSubmit={vm.onEditTopicSubmit}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={vm.categoryDialog.isOpen$.value} onOpenChange={(open) => !open && vm.categoryDialog.close()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {Option.isSome(vm.editingCategory$.value) ? "Edit Category" : "Create Category"}
            </DialogTitle>
          </DialogHeader>
          <CategoryForm
            onSubmit={vm.onCategorySubmit}
            mode="constraint"
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
    </div>
  )
}
