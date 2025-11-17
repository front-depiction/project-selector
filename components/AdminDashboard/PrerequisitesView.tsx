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

// Header Component
const PrerequisitesHeader: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-2xl font-bold">Prerequisites Management</h2>
      <p className="text-muted-foreground mt-1">Manage prerequisite requirements for topic selection</p>
    </div>
    <Button onClick={onCreate} size="lg">
      <Plus className="mr-2 h-5 w-5" />
      Create Prerequisite
    </Button>
  </div>
)

// ============================================================================
// PREREQUISITE CARD COMPOSITION
// ============================================================================

// Context for PrerequisiteCard
const PrerequisiteContext = React.createContext<{
  prerequisite: Doc<"prerequisites">
  index: number
  topicsWithPrerequisites: any[]
  isExpanded: boolean
  actions: {
    onEdit: () => void
    onDelete: () => void
    onToggle: () => void
    onAssignToTopic: (topicId: Id<"topics">) => void
    onRemoveFromTopic: (topicId: Id<"topics">) => void
  }
} | null>(null)

const usePrerequisiteContext = () => {
  const context = React.useContext(PrerequisiteContext)
  if (!context) {
    throw new Error("usePrerequisiteContext must be used within PrerequisiteCard")
  }
  return context
}

// Root Component - Provides context and structure
const PrerequisiteCard: React.FC<{
  prerequisite: Doc<"prerequisites">
  index: number
  topicsWithPrerequisites: any[]
  isExpanded: boolean
  onToggle: () => void
  onEdit: (prerequisite: Doc<"prerequisites">) => void
  onDelete: (id: Id<"prerequisites">) => void
  onAssignToTopic: (topicId: Id<"topics">, prerequisiteId: Id<"prerequisites">) => void
  onRemoveFromTopic: (topicId: Id<"topics">, prerequisiteId: Id<"prerequisites">) => void
  children: React.ReactNode
}> = ({ 
  prerequisite, 
  index, 
  topicsWithPrerequisites, 
  isExpanded, 
  onToggle, 
  onEdit, 
  onDelete,
  onAssignToTopic,
  onRemoveFromTopic,
  children
}) => {
  const actions = React.useMemo(() => ({
    onEdit: () => onEdit(prerequisite),
    onDelete: () => onDelete(prerequisite._id),
    onToggle,
    onAssignToTopic: (topicId: Id<"topics">) => onAssignToTopic(topicId, prerequisite._id),
    onRemoveFromTopic: (topicId: Id<"topics">) => onRemoveFromTopic(topicId, prerequisite._id)
  }), [prerequisite, onEdit, onDelete, onToggle, onAssignToTopic, onRemoveFromTopic])

  const value = React.useMemo(() => ({
    prerequisite,
    index,
    topicsWithPrerequisites,
    isExpanded,
    actions
  }), [prerequisite, index, topicsWithPrerequisites, isExpanded, actions])

  return (
    <PrerequisiteContext.Provider value={value}>
      <Card className="my-3">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <PrerequisiteCardHeader>
              <PrerequisiteCardIndex />
              <PrerequisiteCardContent />
            </PrerequisiteCardHeader>
            
            <PrerequisiteCardActions>
              <PrerequisiteCardEditButton />
              <PrerequisiteCardDeleteButton />
              <PrerequisiteCardMeta />
              <PrerequisiteCardExpandToggle />
            </PrerequisiteCardActions>
          </div>
        </CardContent>
        <PrerequisiteCardExpandedContent />
      </Card>
    </PrerequisiteContext.Provider>
  )
}

// Header Components
const PrerequisiteCardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-4 flex-1">
    {children}
  </div>
)

const PrerequisiteCardIndex: React.FC = () => {
  const { index } = usePrerequisiteContext()
  return (
    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-semibold flex-shrink-0">
      {index + 1}
    </div>
  )
}

const PrerequisiteCardContent: React.FC = () => {
  const { prerequisite } = usePrerequisiteContext()
  return (
    <div className="flex-1 min-w-0">
      <h3 className="font-semibold text-base truncate">
        {prerequisite.title}
      </h3>
      <p className="text-sm text-muted-foreground truncate mt-0.5">
        {prerequisite.description || "No description"}
      </p>
    </div>
  )
}

// Action Components
const PrerequisiteCardActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-3 flex-shrink-0">
    {children}
  </div>
)

const PrerequisiteCardEditButton: React.FC = () => {
  const { actions } = usePrerequisiteContext()
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={(e) => {
        e.stopPropagation()
        actions.onEdit()
      }}
    >
      <Edit className="h-4 w-4 mr-1" />
      Edit
    </Button>
  )
}

const PrerequisiteCardDeleteButton: React.FC = () => {
  const { prerequisite, actions } = usePrerequisiteContext()
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={(e) => {
        e.stopPropagation()
        actions.onDelete()
      }}
    >
      <Trash2 className="h-4 w-4 mr-1" />
      Delete
    </Button>
  )
}

const PrerequisiteCardMeta: React.FC = () => {
  const { prerequisite, topicsWithPrerequisites } = usePrerequisiteContext()
  
  const assignedCount = React.useMemo(() => {
    if (!topicsWithPrerequisites) return 0
    return topicsWithPrerequisites.filter(topic =>
      topic.prerequisites.some((p: any) => p._id === prerequisite._id)
    ).length
  }, [topicsWithPrerequisites, prerequisite._id])

  return (
    <div className="flex items-center gap-2">
      <div className="text-sm text-muted-foreground">
        {assignedCount} assigned
      </div>
      <Badge
        variant={prerequisite.requiredValue === 1 ? "default" : "secondary"}
        className="text-xs border min-w-[90px] justify-center"
      >
        {prerequisite.requiredValue === 1 ? "True" : "False"}
      </Badge>
    </div>
  )
}

const PrerequisiteCardExpandToggle: React.FC = () => {
  const { isExpanded, actions } = usePrerequisiteContext()
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={actions.onToggle}
      className="h-8 w-8 p-0"
    >
      {isExpanded ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )}
    </Button>
  )
}

// Expanded Content Components
const PrerequisiteCardExpandedContent: React.FC = () => {
  const { isExpanded } = usePrerequisiteContext()
  
  return (
    <AnimatePresence>
      {isExpanded && (
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
                <PrerequisiteCardAssignedTopicsSection />
                <PrerequisiteCardAvailableTopicsSection />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const PrerequisiteCardAssignedTopicsSection: React.FC = () => {
  const { prerequisite, topicsWithPrerequisites, actions } = usePrerequisiteContext()
  
  const assignedTopics = React.useMemo(() => {
    if (!topicsWithPrerequisites) return []
    return topicsWithPrerequisites.filter(topic =>
      topic.prerequisites.some((p: any) => p._id === prerequisite._id)
    )
  }, [topicsWithPrerequisites, prerequisite._id])

  return (
    <div>
      <h4 className="text-sm font-medium mb-2">Assigned Topics ({assignedTopics.length})</h4>
      {assignedTopics.length > 0 ? (
        <div className="space-y-2">
          {assignedTopics.map((topic) => (
            <div key={topic._id} className="flex items-center justify-between p-2 bg-background rounded border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{topic.title}</p>
                <p className="text-xs text-muted-foreground truncate">{topic.description}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => actions.onRemoveFromTopic(topic._id)}
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
  )
}

const PrerequisiteCardAvailableTopicsSection: React.FC = () => {
  const { prerequisite, topicsWithPrerequisites, actions } = usePrerequisiteContext()
  
  const availableTopics = React.useMemo(() => {
    if (!topicsWithPrerequisites) return []
    return topicsWithPrerequisites.filter(topic => 
      !topic.prerequisites.some((p: any) => p._id === prerequisite._id)
    )
  }, [topicsWithPrerequisites, prerequisite._id])

  if (availableTopics.length === 0) return null

  return (
    <div>
      <h4 className="text-sm font-medium mb-2">
        Available Topics ({availableTopics.length})
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {availableTopics.map((topic) => (
          <div key={topic._id} className="flex items-center justify-between p-2 bg-background rounded border">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{topic.title}</p>
              <p className="text-xs text-muted-foreground truncate">{topic.description}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => actions.onAssignToTopic(topic._id)}
              className="text-green-600 hover:text-green-700"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

// Empty State Component
const PrerequisitesEmptyState: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <Card className="p-8 text-center">
    <CardHeader>
      <CardTitle className="mb-2">No prerequisites yet</CardTitle>
      <CardDescription>
        Get started by creating your first prerequisite to manage topic requirements.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Button onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Create Prerequisite
      </Button>
    </CardContent>
  </Card>
)

// Dialogs Component
const PrerequisitesDialogs: React.FC<{
  isCreateOpen: boolean
  editingPrerequisite: Doc<"prerequisites"> | null
  onCloseCreate: () => void
  onCloseEdit: () => void
  onCreate: (values: { title: string; description?: string; requiredValue: number }) => Promise<void>
  onUpdate: (values: { title: string; description?: string; requiredValue: number }) => Promise<void>
}> = ({ isCreateOpen, editingPrerequisite, onCloseCreate, onCloseEdit, onCreate, onUpdate }) => (
  <>
    <Dialog open={isCreateOpen} onOpenChange={onCloseCreate}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Prerequisite</DialogTitle>
          <DialogDescription>
            Add a new prerequisite requirement for topic selection.
          </DialogDescription>
        </DialogHeader>
        <PrerequisiteForm onSubmit={onCreate} />
      </DialogContent>
    </Dialog>

    <Dialog open={!!editingPrerequisite} onOpenChange={(open) => !open && onCloseEdit()}>
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
            onSubmit={onUpdate}
          />
        )}
      </DialogContent>
    </Dialog>
  </>
)

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
  const [expandedItems, setExpandedItems] = React.useState<Set<string | number>>(() => 
    new Set(prerequisites?.map(p => p._id) ?? [])
  )

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

  if (!prerequisites) {
    return (
      <div className="space-y-6">
        <PrerequisitesHeader onCreate={() => setIsCreatePrerequisiteOpen(true)} />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PrerequisitesHeader onCreate={() => setIsCreatePrerequisiteOpen(true)} />
      
      {prerequisites.length === 0 ? (
        <PrerequisitesEmptyState onCreate={() => setIsCreatePrerequisiteOpen(true)} />
      ) : (
        <div className="space-y-2">
          {prerequisites.map((prerequisite, index) => (
            <PrerequisiteCard
              key={prerequisite._id}
              prerequisite={prerequisite}
              index={index}
              topicsWithPrerequisites={topicsWithPrerequisites as any[] ?? []}
              isExpanded={expandedItems.has(prerequisite._id)}
              onToggle={() => toggleExpanded(prerequisite._id)}
              onEdit={setEditingPrerequisite}
              onDelete={handleDeletePrerequisite}
              onAssignToTopic={handleAssignToTopic}
              onRemoveFromTopic={handleRemoveFromTopic}
            >
              <PrerequisiteCardHeader>
                <PrerequisiteCardIndex />
                <PrerequisiteCardContent />
              </PrerequisiteCardHeader>
              
              <PrerequisiteCardActions>
                <PrerequisiteCardEditButton />
                <PrerequisiteCardDeleteButton />
                <PrerequisiteCardMeta />
                <PrerequisiteCardExpandToggle />
              </PrerequisiteCardActions>
            </PrerequisiteCard>
          ))}
        </div>
      )}

      <PrerequisitesDialogs
        isCreateOpen={isCreatePrerequisiteOpen}
        editingPrerequisite={editingPrerequisite}
        onCloseCreate={() => setIsCreatePrerequisiteOpen(false)}
        onCloseEdit={() => setEditingPrerequisite(null)}
        onCreate={handleCreatePrerequisite}
        onUpdate={handleUpdatePrerequisite}
      />
    </div>
  )
}