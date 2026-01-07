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
import { Plus, Trash2 } from "lucide-react"
import TopicForm from "@/components/forms/topic-form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
import { Edit, Trash2 as Trash, Power, MoreVertical } from "lucide-react"

// ============================================================================
// TOPICS VIEW - Clean table-based layout with View Model pattern
// ============================================================================

interface TopicsViewProps {
  vm: TopicsViewVM
}

export const TopicsView: React.FC<TopicsViewProps> = ({ vm }) => {
  useSignals()

  return (
    <div className="space-y-6">
      {/* Header with Create Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Topics Management</h2>
          <p className="text-muted-foreground mt-1">Manage available topics for student selection</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={vm.createSubtopicDialog.open} variant="outline" size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Create Subtopic
          </Button>
          <Button onClick={vm.createTopicDialog.open} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Create Topic
          </Button>
        </div>
      </div>

      {/* Subtopics Section - Grid Layout */}
      {vm.subtopics$.value.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Subtopics</CardTitle>
            <CardDescription>Additional topics that can be assigned to main topics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {vm.subtopics$.value.map((subtopic) => (
                <div key={subtopic.key} className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{subtopic.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{subtopic.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={subtopic.remove}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Topics Table - Clean data table format */}
      {vm.topics$.value.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>No Topics</CardTitle>
            <CardDescription>Create your first topic to get started.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subtopics</TableHead>
                <TableHead>Selections</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vm.topics$.value.map((topic) => (
                <TableRow key={topic.key}>
                  <TableCell className="font-medium">{topic.title}</TableCell>
                  <TableCell className="max-w-xs truncate">{topic.description}</TableCell>
                  <TableCell>
                    <Badge variant={topic.statusVariant}>
                      {topic.statusDisplay}
                    </Badge>
                  </TableCell>
                  <TableCell>{topic.subtopicsCount}</TableCell>
                  <TableCell>{topic.selectionsCount}</TableCell>
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
                        <DropdownMenuItem onClick={topic.toggleActive}>
                          <Power className="mr-2 h-4 w-4" />
                          {topic.statusDisplay === "Active" ? "Deactivate" : "Activate"}
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
        </div>
      )}

      {/* Create Topic Dialog */}
      <Dialog open={vm.createTopicDialog.isOpen$.value} onOpenChange={(open) => !open && vm.createTopicDialog.close()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Topic</DialogTitle>
            <DialogDescription>
              Add a new topic that students can select.
            </DialogDescription>
          </DialogHeader>
          <TopicForm periods={[...vm.periodOptions$.value]} onSubmit={vm.onTopicSubmit} />
        </DialogContent>
      </Dialog>

      {/* Edit Topic Dialog */}
      <Dialog open={vm.editTopicDialog.isOpen$.value} onOpenChange={(open) => !open && vm.editTopicDialog.close()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Topic</DialogTitle>
            <DialogDescription>
              Update the details of this topic.
            </DialogDescription>
          </DialogHeader>
          {Option.isSome(vm.editTopicDialog.editingTopic$.value) && (
            <TopicForm
              periods={[...vm.periodOptions$.value]}
              initialValues={{
                title: vm.editTopicDialog.editingTopic$.value.value.title,
                description: vm.editTopicDialog.editingTopic$.value.value.description,
                selection_period_id: vm.editTopicDialog.editingTopic$.value.value.semesterId
              }}
              onSubmit={vm.onEditTopicSubmit}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Subtopic Dialog */}
      <Dialog open={vm.createSubtopicDialog.isOpen$.value} onOpenChange={(open) => !open && vm.createSubtopicDialog.close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Subtopic</DialogTitle>
            <DialogDescription>
              Add a new subtopic that can be assigned to main topics.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={vm.subtopicForm$.value.title}
                onChange={(e) => vm.setSubtopicTitle(e.target.value)}
                placeholder="Enter subtopic title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={vm.subtopicForm$.value.description}
                onChange={(e) => vm.setSubtopicDescription(e.target.value)}
                placeholder="Enter subtopic description"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                vm.createSubtopicDialog.close()
                vm.resetSubtopicForm()
              }}>
                Cancel
              </Button>
              <Button onClick={vm.createSubtopic}>
                Create Subtopic
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}