"use client"

import * as React from "react"
import * as AD from "./index"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Trash2 } from "lucide-react"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import TopicForm from "@/components/forms/topic-form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

// ============================================================================
// TOPICS VIEW - Clean table-based layout
// ============================================================================

export const TopicsView: React.FC = () => {
  const { topics, subtopics, periods, createTopic, updateTopic, deleteTopic } = AD.useDashboard()
  const [isCreateTopicOpen, setIsCreateTopicOpen] = React.useState(false)
  const [isCreateSubtopicOpen, setIsCreateSubtopicOpen] = React.useState(false)
  const [editingTopic, setEditingTopic] = React.useState<Doc<"topics"> | null>(null)
  const [subtopicForm, setSubtopicForm] = React.useState({ title: "", description: "" })

  // Format periods for the form
  // Deduplicate by semesterId to avoid duplicate keys, keeping the most recent period for each semesterId
  const periodOptions = React.useMemo(() => {
    if (!periods) return []
    
    // Group by semesterId and keep the most recent one (by openDate)
    const uniqueBySemester = new Map<string, typeof periods[0]>()
    for (const period of periods) {
      const existing = uniqueBySemester.get(period.semesterId)
      if (!existing || period.openDate > existing.openDate) {
        uniqueBySemester.set(period.semesterId, period)
      }
    }
    
    return Array.from(uniqueBySemester.values()).map(p => ({
      value: p.semesterId,
      label: p.title,
      id: p._id // Include _id for unique key if needed
    }))
  }, [periods])

  // For subtopics, we'll need to add these to the dashboard context later
  const createSubtopic = React.useCallback(async (data: { title: string; description: string }) => {
    // TODO: Implement createSubtopic mutation
    console.log("Creating subtopic:", data)
  }, [])

  const deleteSubtopic = React.useCallback(async (id: Id<"subtopics">) => {
    // TODO: Implement deleteSubtopic mutation
    console.log("Deleting subtopic:", id)
  }, [])

  const handleCreateTopic = async (values: { title: string; description: string; selection_period_id: string; requiresAllowList?: boolean }) => {
    await createTopic({
      title: values.title,
      description: values.description,
      semesterId: values.selection_period_id || "2024-spring",
      requiresAllowList: values.requiresAllowList ?? false
    })
    setIsCreateTopicOpen(false)
  }

  const handleUpdateTopic = async (values: { title: string; description: string; selection_period_id: string; requiresAllowList?: boolean }) => {
    if (!editingTopic) return
    await updateTopic(editingTopic._id, {
      title: values.title,
      description: values.description,
      semesterId: values.selection_period_id,
      requiresAllowList: values.requiresAllowList
    })
    setEditingTopic(null)
  }

  const handleCreateSubtopic = async () => {
    if (!subtopicForm.title || !subtopicForm.description) return
    await createSubtopic({
      title: subtopicForm.title,
      description: subtopicForm.description
    })
    setSubtopicForm({ title: "", description: "" })
    setIsCreateSubtopicOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Topics Management</h2>
          <p className="text-muted-foreground mt-1">Manage available topics for student selection</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setIsCreateSubtopicOpen(true)} variant="outline" size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Create Subtopic
          </Button>
          <Button onClick={() => setIsCreateTopicOpen(true)} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Create Topic
          </Button>
        </div>
      </div>

      {/* Subtopics Section - Grid Layout */}
      {subtopics && subtopics.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Subtopics</CardTitle>
            <CardDescription>Additional topics that can be assigned to main topics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {subtopics.map((subtopic) => (
                <div key={subtopic._id} className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{subtopic.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{subtopic.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteSubtopic(subtopic._id)}
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
      <AD.TopicsTable onEdit={setEditingTopic} />

      {/* Create Topic Dialog */}
      <Dialog open={isCreateTopicOpen} onOpenChange={setIsCreateTopicOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Topic</DialogTitle>
            <DialogDescription>
              Add a new topic that students can select.
            </DialogDescription>
          </DialogHeader>
          <TopicForm periods={periodOptions} onSubmit={handleCreateTopic} />
        </DialogContent>
      </Dialog>

      {/* Edit Topic Dialog */}
      <Dialog open={!!editingTopic} onOpenChange={(open) => !open && setEditingTopic(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Topic</DialogTitle>
            <DialogDescription>
              Update the details of this topic.
            </DialogDescription>
          </DialogHeader>
          {editingTopic && (
            <TopicForm
              periods={periodOptions}
              initialValues={{
                title: editingTopic.title,
                description: editingTopic.description,
                selection_period_id: editingTopic.semesterId,
                requiresAllowList: editingTopic.requiresAllowList ?? false
              }}
              onSubmit={handleUpdateTopic}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Subtopic Dialog */}
      <Dialog open={isCreateSubtopicOpen} onOpenChange={setIsCreateSubtopicOpen}>
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
                value={subtopicForm.title}
                onChange={(e) => setSubtopicForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter subtopic title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={subtopicForm.description}
                onChange={(e) => setSubtopicForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter subtopic description"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsCreateSubtopicOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSubtopic}>
                Create Subtopic
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}