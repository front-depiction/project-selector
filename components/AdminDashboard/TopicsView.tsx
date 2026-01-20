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
import { Plus } from "lucide-react"
import TopicForm from "@/components/forms/topic-form"
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
import { Edit, Trash2 as Trash, MoreVertical } from "lucide-react"

// ============================================================================
// TOPICS VIEW - Clean table-based layout with View Model pattern
// ============================================================================

interface TopicsViewProps {
  vm: TopicsViewVM
}

export const TopicsView: React.FC<TopicsViewProps> = ({ vm }) => {
  useSignals()

  // Track which project assignments are expanded
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set())

  const toggleGroup = (semesterId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(semesterId)) {
        next.delete(semesterId)
      } else {
        next.add(semesterId)
      }
      return next
    })
  }

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
        <DialogContent className="max-w-2xl">
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
        <DialogContent className="max-w-2xl">
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
                constraintId: "" // TODO: Get constraintId from topic if stored
              }}
              onSubmit={vm.onEditTopicSubmit}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
