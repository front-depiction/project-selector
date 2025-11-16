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
import { Plus, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { PrerequisiteForm } from "@/components/forms/prerequisite-form"

// ============================================================================
// PREREQUISITES VIEW - Clean table-based layout
// ============================================================================

export const PrerequisitesView: React.FC = () => {
  const { 
    prerequisites, 
    topicsWithPrerequisites, 
    createPrerequisite, 
    updatePrerequisite,
    deletePrerequisite,
    assignPrerequisiteToTopic,
    removePrerequisiteFromTopic
  } = AD.useDashboard()
  
  const [isCreatePrerequisiteOpen, setIsCreatePrerequisiteOpen] = React.useState(false)
  const [editingPrerequisite, setEditingPrerequisite] = React.useState<Doc<"prerequisites"> | null>(null)
  const [expandedItems, setExpandedItems] = React.useState<Set<string | number>>(new Set())

  // Initialize expanded items
  React.useEffect(() => {
    if (prerequisites) {
      setExpandedItems(new Set(prerequisites.map(p => p._id)))
    }
  }, [prerequisites])

  const handleCreatePrerequisite = async (values: { title: string; description?: string; requiredValue: number }) => {
    await createPrerequisite({
      title: values.title,
      description: values.description || "",
      requiredValue: values.requiredValue
    })
    setIsCreatePrerequisiteOpen(false)
  }

  const handleUpdatePrerequisite = async (values: { title: string; description?: string; requiredValue: number }) => {
    if (!editingPrerequisite) return
    await updatePrerequisite(editingPrerequisite._id, {
      title: values.title,
      description: values.description || "",
      requiredValue: values.requiredValue
    })
    setEditingPrerequisite(null)
  }

  const handleDeletePrerequisite = async (id: Id<"prerequisites">) => {
    if (window.confirm("Are you sure you want to delete this prerequisite? This will remove it from all topics and delete all related preference data.")) {
      await deletePrerequisite(id)
    }
  }

  const handleAssignToTopic = async (topicId: Id<"topics">, prerequisiteId: Id<"prerequisites">) => {
    await assignPrerequisiteToTopic(topicId, prerequisiteId)
  }

  const handleRemoveFromTopic = async (topicId: Id<"topics">, prerequisiteId: Id<"prerequisites">) => {
    await removePrerequisiteFromTopic(topicId, prerequisiteId)
  }

  const getAssignedTopics = (prerequisiteId: Id<"prerequisites">) => {
    if (!topicsWithPrerequisites) return []
    return topicsWithPrerequisites.filter(topic =>
      topic.prerequisites.some(p => p._id === prerequisiteId)
    )
  }

  const toggleExpanded = (itemId: string | number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  if (!prerequisites) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Prerequisites Management</h2>
            <p className="text-muted-foreground mt-1">Manage prerequisite requirements for topic selection</p>
          </div>
          <Button onClick={() => setIsCreatePrerequisiteOpen(true)} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Create Prerequisite
          </Button>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Prerequisites Management</h2>
          <p className="text-muted-foreground mt-1">Manage prerequisite requirements for topic selection</p>
        </div>
        <Button onClick={() => setIsCreatePrerequisiteOpen(true)} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Create Prerequisite
        </Button>
      </div>

      {prerequisites.length === 0 ? (
        <Card className="p-8 text-center">
          <CardHeader>
            <CardTitle className="mb-2">No prerequisites yet</CardTitle>
            <CardDescription>
              Get started by creating your first prerequisite to manage topic requirements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsCreatePrerequisiteOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Prerequisite
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {prerequisites.map((prerequisite, index) => (
            <Card key={prerequisite._id} className="my-3">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-semibold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">
                        {prerequisite.title}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {prerequisite.description || "No description"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingPrerequisite(prerequisite)
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePrerequisite(prerequisite._id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-muted-foreground">
                        {getAssignedTopics(prerequisite._id).length} assigned
                      </div>
                      <Badge
                        variant={prerequisite.requiredValue === 1 ? "default" : "secondary"}
                        className="text-xs border min-w-[90px] justify-center"
                      >
                        {prerequisite.requiredValue === 1 ? "True" : "False"}
                      </Badge>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(prerequisite._id)}
                      className="h-8 w-8 p-0"
                    >
                      {expandedItems.has(prerequisite._id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
              
              <AnimatePresence>
                {expandedItems.has(prerequisite._id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t" />
                    <div className="px-4 pb-4">
                      <div className="pt-4">
                        <div className="space-y-4">
                          {/* Assigned Topics Section */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Assigned Topics ({getAssignedTopics(prerequisite._id).length})</h4>
                            {getAssignedTopics(prerequisite._id).length > 0 ? (
                              <div className="space-y-2">
                                {getAssignedTopics(prerequisite._id).map((topic) => (
                                  <div key={topic._id} className="flex items-center justify-between p-2 bg-background rounded border">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{topic.title}</p>
                                      <p className="text-xs text-muted-foreground truncate">{topic.description}</p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveFromTopic(topic._id, prerequisite._id)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">No topics assigned</p>
                            )}
                          </div>

                          {/* Available Topics Section */}
                          {topicsWithPrerequisites && topicsWithPrerequisites.filter(topic => !topic.prerequisites.some(p => p._id === prerequisite._id)).length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">
                                Available Topics ({topicsWithPrerequisites.filter(topic => !topic.prerequisites.some(p => p._id === prerequisite._id)).length})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {topicsWithPrerequisites.filter(topic => !topic.prerequisites.some(p => p._id === prerequisite._id)).map((topic) => (
                                  <div key={topic._id} className="flex items-center justify-between p-2 bg-background rounded border">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{topic.title}</p>
                                      <p className="text-xs text-muted-foreground truncate">{topic.description}</p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAssignToTopic(topic._id, prerequisite._id)}
                                      className="text-green-600 hover:text-green-700"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))}
        </div>
      )}

      {/* Create Prerequisite Dialog */}
      <Dialog open={isCreatePrerequisiteOpen} onOpenChange={setIsCreatePrerequisiteOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Prerequisite</DialogTitle>
            <DialogDescription>
              Add a new prerequisite requirement for topic selection.
            </DialogDescription>
          </DialogHeader>
          <PrerequisiteForm onSubmit={handleCreatePrerequisite} />
        </DialogContent>
      </Dialog>

      {/* Edit Prerequisite Dialog */}
      <Dialog open={!!editingPrerequisite} onOpenChange={(open) => !open && setEditingPrerequisite(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Prerequisite</DialogTitle>
            <DialogDescription>
              Update the details of this prerequisite.
            </DialogDescription>
          </DialogHeader>
          {editingPrerequisite && (
            <PrerequisiteForm
              initialValues={{
                title: editingPrerequisite.title,
                description: editingPrerequisite.description || "",
                requiredValue: editingPrerequisite.requiredValue
              }}
              onSubmit={handleUpdatePrerequisite}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}