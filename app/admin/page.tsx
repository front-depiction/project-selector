"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Users,
  FileText,
  Clock,
  ArrowLeft,
  AlertCircle,
  BarChart3,
  Settings,
  Code,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers
} from "lucide-react"
import Link from "next/link"
import type { Id } from "@/convex/_generated/dataModel"
import SelectionPeriodForm from "@/components/forms/selection-period-form"
import DockLayout from "@/components/layouts/DockLayout"
import TopicAnalyticsCard from "@/components/analytics/TopicAnalyticsCard"
import { MultiSelector } from "@/components/ui/multi-select"

type SubtopicForm = {
  title: string
  description: string
}

type TopicForm = {
  title: string
  description: string
  semesterId: string
  subtopicIds: string[]
}

type PeriodForm = {
  semesterId: string
  title: string
  description: string
  openDate: Date | undefined
  closeDate: Date | undefined
  isActive: boolean
}

type ActiveView = "topics" | "analytics" | "period" | "students" | "tools" | "subtopics"

export default function AdminDashboard() {
  const [activeView, setActiveView] = useState<ActiveView>("topics")
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false)
  const [isSubtopicDialogOpen, setIsSubtopicDialogOpen] = useState(false)
  const [isPeriodDialogOpen, setIsPeriodDialogOpen] = useState(false)
  const [editingTopic, setEditingTopic] = useState<any>(null)
  const [deletingTopic, setDeletingTopic] = useState<Id<"topics"> | null>(null)
  const [selectedTopicForAnalytics, setSelectedTopicForAnalytics] = useState<Id<"topics"> | null>(null)

  // Form states
  const [topicForm, setTopicForm] = useState<TopicForm>({
    title: "",
    description: "",
    semesterId: "2024-spring",
    subtopicIds: []
  })

  const [subtopicForm, setSubtopicForm] = useState<SubtopicForm>({
    title: "",
    description: ""
  })

  const [periodForm, setPeriodForm] = useState<PeriodForm>({
    semesterId: "2024-spring",
    title: "",
    description: "",
    openDate: undefined,
    closeDate: undefined,
    isActive: false
  })

  // Queries
  const topics = useQuery(api.topics.getAllTopics, {})
  const subtopics = useQuery(api.subtopics.getAllSubtopics, {})
  const currentPeriod = useQuery(api.admin.getCurrentPeriod, {})
  const allPeriods = useQuery(api.admin.getAllPeriods, {})
  const stats = useQuery(api.stats.getLandingStats, {})
  const preferences = useQuery(api.preferences.getAllPreferences, {})
  const topicAnalytics = useQuery(api.topicAnalytics.getTopicPerformanceAnalytics, {})
  const detailedAnalytics = useQuery(
    api.topicAnalytics.getTopicDetailedAnalytics,
    selectedTopicForAnalytics ? { topicId: selectedTopicForAnalytics } : "skip"
  )

  // Mutations
  const createTopic = useMutation(api.admin.createTopic)
  const updateTopic = useMutation(api.admin.updateTopic)
  const deleteTopic = useMutation(api.admin.deleteTopic)
  const createSubtopic = useMutation(api.subtopics.createSubtopic)
  const deleteSubtopic = useMutation(api.subtopics.deleteSubtopic)
  const upsertPeriod = useMutation(api.admin.upsertSelectionPeriod)
  const seedData = useMutation(api.admin.seedTestData)
  const clearData = useMutation(api.admin.clearAllData)

  // Handlers
  const handleCreateTopic = async () => {
    try {
      await createTopic({
        ...topicForm,
        subtopicIds: topicForm.subtopicIds.length > 0 ? topicForm.subtopicIds as Id<"subtopics">[] : undefined
      })
      toast.success("Topic created successfully")
      setIsTopicDialogOpen(false)
      setTopicForm({ title: "", description: "", semesterId: "2024-spring", subtopicIds: [] })
    } catch (error) {
      toast.error("Failed to create topic")
    }
  }

  const handleUpdateTopic = async () => {
    if (!editingTopic) return
    try {
      await updateTopic({
        id: editingTopic._id,
        title: topicForm.title,
        description: topicForm.description,
        isActive: editingTopic.isActive,
        subtopicIds: topicForm.subtopicIds.length > 0 ? topicForm.subtopicIds as Id<"subtopics">[] : undefined
      })
      toast.success("Topic updated successfully")
      setIsTopicDialogOpen(false)
      setEditingTopic(null)
      setTopicForm({ title: "", description: "", semesterId: "2024-spring", subtopicIds: [] })
    } catch (error) {
      toast.error("Failed to update topic")
    }
  }

  const handleCreateSubtopic = async () => {
    try {
      await createSubtopic({
        ...subtopicForm
      })
      
      toast.success("Subtopic created successfully")
      setIsSubtopicDialogOpen(false)
      setSubtopicForm({ title: "", description: "" })
    } catch (error) {
      toast.error("Failed to create subtopic")
    }
  }

  const handleDeleteTopic = async () => {
    if (!deletingTopic) return
    try {
      await deleteTopic({ id: deletingTopic })
      toast.success("Topic deleted successfully")
      setDeletingTopic(null)
    } catch (error: any) {
      toast.error(error.message || "Failed to delete topic")
    }
  }

  const handleToggleTopicActive = async (id: Id<"topics">, isActive: boolean) => {
    try {
      await updateTopic({ id, isActive })
      toast.success(`Topic ${isActive ? "activated" : "deactivated"}`)
    } catch (error) {
      toast.error("Failed to update topic status")
    }
  }

  const openEditDialog = (topic: any) => {
    setEditingTopic(topic)
    setTopicForm({
      title: topic.title,
      description: topic.description,
      semesterId: topic.semesterId,
      subtopicIds: topic.subtopicIds || []
    })
    setIsTopicDialogOpen(true)
  }

  const openCreateDialog = () => {
    setEditingTopic(null)
    const activePeriod = allPeriods?.find(p => p.isActive)
    setTopicForm({
      title: "",
      description: "",
      semesterId: activePeriod?.semesterId || "2024-spring",
      subtopicIds: []
    })
    setIsTopicDialogOpen(true)
  }

  // Prepare subtopic options for multi-selector
  const subtopicOptions = subtopics?.map(s => ({
    value: s._id,
    label: s.title
  })) || []

  const renderContent = () => {
    switch (activeView) {
      case "analytics":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Topic Performance Analytics</h2>
                <p className="text-muted-foreground">Detailed insights into topic popularity and performance</p>
              </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {topicAnalytics?.map((topic) => (
                <TopicAnalyticsCard
                  key={topic.id}
                  topic={topic}
                  onViewDetails={(id) => setSelectedTopicForAnalytics(id as Id<"topics">)}
                />
              ))}
            </div>
          </div>
        )

      case "topics":
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Project Topics</CardTitle>
                <CardDescription>Manage available project topics and subtopics</CardDescription>
              </div>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Topic
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Subtopics</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Selections</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topics?.map((topic) => {
                    const selectionCount = preferences?.filter(p =>
                      p.topicOrder.includes(topic._id)
                    ).length || 0
                    
                    const topicSubtopics = topic.subtopicIds?.map(id => 
                      subtopics?.find(s => s._id === id)
                    ).filter(Boolean) || []

                    return (
                      <TableRow key={topic._id}>
                        <TableCell className="font-medium">{topic.title}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {topic.description}
                        </TableCell>
                        <TableCell>
                          {topicSubtopics.length} subtopics
                        </TableCell>
                        <TableCell>{topic.semesterId}</TableCell>
                        <TableCell>{selectionCount}</TableCell>
                        <TableCell>
                          <Switch
                            checked={topic.isActive}
                            onCheckedChange={(checked) =>
                              handleToggleTopicActive(topic._id, checked)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditDialog(topic)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeletingTopic(topic._id)}
                              disabled={selectionCount > 0}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )

      case "subtopics":
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Subtopics Management</CardTitle>
                <CardDescription>Create and manage subtopics for your main topics</CardDescription>
              </div>
              <Button onClick={() => setIsSubtopicDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Subtopic
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Associated Topics</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subtopics?.map((subtopic) => {
                    // Find which topics use this subtopic
                    const associatedTopics = topics?.filter(t => 
                      t.subtopicIds?.includes(subtopic._id)
                    ) || []
                    return (
                      <TableRow key={subtopic._id}>
                        <TableCell className="font-medium">{subtopic.title}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {subtopic.description}
                        </TableCell>
                        <TableCell>
                          {associatedTopics.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {associatedTopics.map(topic => (
                                <Badge key={topic._id} variant="outline" className="text-xs">
                                  {topic.title}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={async () => {
                              await deleteSubtopic({ id: subtopic._id })
                              toast.success("Subtopic deleted")
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )

      case "period":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Selection Period Settings</CardTitle>
              <CardDescription>Configure when students can select topics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentPeriod && (
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Current Period</span>
                    <Badge className={currentPeriod.isActive ? "bg-green-500" : "bg-gray-500"}>
                      {currentPeriod.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Semester: {currentPeriod.semesterId}</p>
                    <p>Opens: {format(new Date(currentPeriod.openDate), "PPP")}</p>
                    <p>Closes: {format(new Date(currentPeriod.closeDate), "PPP")}</p>
                  </div>
                </div>
              )}

              <Button onClick={() => setIsPeriodDialogOpen(true)} className="w-full">
                {currentPeriod ? "Update" : "Create"} Selection Period
              </Button>
            </CardContent>
          </Card>
        )

      case "students":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Student Selections</CardTitle>
              <CardDescription>View all student preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Preferences</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preferences?.map((pref) => (
                    <TableRow key={pref._id}>
                      <TableCell className="font-medium">{pref.studentId}</TableCell>
                      <TableCell>
                        {pref.topicOrder.length} topics selected
                      </TableCell>
                      <TableCell>
                        {format(new Date(pref.lastUpdated), "PPp")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )

      case "tools":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Developer Tools</CardTitle>
              <CardDescription>Utilities for testing and development</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button
                  onClick={async () => {
                    try {
                      await seedData()
                      toast.success("Test data created")
                    } catch (error) {
                      toast.error("Failed to create test data")
                    }
                  }}
                  variant="outline"
                >
                  Seed Test Data
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Clear All Data</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all topics, preferences, and selection periods.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          try {
                            await clearData()
                            toast.success("All data cleared")
                          } catch (error) {
                            toast.error("Failed to clear data")
                          }
                        }}
                      >
                        Delete Everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  const dockItems = [
    {
      id: "topics",
      icon: <FileText className={`h-6 w-6 ${activeView === "topics" ? "text-primary" : ""}`} />,
      label: "Topics",
      onClick: () => setActiveView("topics")
    },
    {
      id: "subtopics",
      icon: <Layers className={`h-6 w-6 ${activeView === "subtopics" ? "text-primary" : ""}`} />,
      label: "Subtopics",
      onClick: () => setActiveView("subtopics")
    },
    {
      id: "analytics",
      icon: <BarChart3 className={`h-6 w-6 ${activeView === "analytics" ? "text-primary" : ""}`} />,
      label: "Analytics",
      onClick: () => setActiveView("analytics")
    },
    {
      id: "period",
      icon: <Clock className={`h-6 w-6 ${activeView === "period" ? "text-primary" : ""}`} />,
      label: "Period",
      onClick: () => setActiveView("period")
    },
    {
      id: "students",
      icon: <Users className={`h-6 w-6 ${activeView === "students" ? "text-primary" : ""}`} />,
      label: "Students",
      onClick: () => setActiveView("students")
    },
    {
      id: "tools",
      icon: <Code className={`h-6 w-6 ${activeView === "tools" ? "text-primary" : ""}`} />,
      label: "Dev Tools",
      onClick: () => setActiveView("tools")
    }
  ]

  return (
    <DockLayout dockItems={dockItems}>
      <div className="bg-background">
        <div className="container mx-auto py-8 px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage topics and selection periods</p>
            </div>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Topics</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{topics?.length || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Topics</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {topics?.filter(t => t.isActive).length || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Period Status</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Badge className={
                  currentPeriod?.isActive ? "bg-green-500" : "bg-gray-500"
                }>
                  {currentPeriod?.isActive ? "Active" : "Inactive"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="space-y-4">
            {renderContent()}
          </div>

          {/* Topic Dialog with Multi-Selector for Subtopics */}
          <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingTopic ? "Edit Topic" : "Create New Topic"}
                </DialogTitle>
                <DialogDescription>
                  {editingTopic ? "Update the topic details and associated subtopics" : "Add a new project topic with optional subtopics"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={topicForm.title}
                    onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                    placeholder="Enter topic title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={topicForm.description}
                    onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                    placeholder="Enter topic description"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Associated Subtopics</Label>
                  <MultiSelector
                    options={subtopicOptions}
                    selected={topicForm.subtopicIds}
                    onChange={(values) => setTopicForm({ ...topicForm, subtopicIds: values })}
                    placeholder="Select subtopics..."
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Select subtopics that are related to this main topic
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTopicDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={editingTopic ? handleUpdateTopic : handleCreateTopic}>
                  {editingTopic ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Subtopic Creation Dialog */}
          <Dialog open={isSubtopicDialogOpen} onOpenChange={setIsSubtopicDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Subtopic</DialogTitle>
                <DialogDescription>
                  Add a new subtopic that can be associated with main topics
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="subtopic-title">Title</Label>
                  <Input
                    id="subtopic-title"
                    value={subtopicForm.title}
                    onChange={(e) => setSubtopicForm({ ...subtopicForm, title: e.target.value })}
                    placeholder="Enter subtopic title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="subtopic-description">Description</Label>
                  <Textarea
                    id="subtopic-description"
                    value={subtopicForm.description}
                    onChange={(e) => setSubtopicForm({ ...subtopicForm, description: e.target.value })}
                    placeholder="Enter subtopic description"
                    rows={3}
                  />
                </div>

              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsSubtopicDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSubtopic}>
                  Create Subtopic
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Period Dialog */}
          <Dialog open={isPeriodDialogOpen} onOpenChange={setIsPeriodDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configure Selection Period</DialogTitle>
                <DialogDescription>
                  Set the time window for student selections
                </DialogDescription>
              </DialogHeader>
              <SelectionPeriodForm
                initialValues={currentPeriod ? {
                  title: currentPeriod.title,
                  selection_period_id: currentPeriod.semesterId,
                  start_deadline: new Date(currentPeriod.openDate),
                  end_deadline: new Date(currentPeriod.closeDate),
                  isActive: currentPeriod.isActive,
                } : undefined}
                onSubmit={async (values) => {
                  try {
                    await upsertPeriod({
                      semesterId: values.selection_period_id,
                      title: values.title,
                      description: "",
                      openDate: values.start_deadline.getTime(),
                      closeDate: values.end_deadline.getTime(),
                      isActive: values.isActive,
                    })
                    toast.success("Selection period updated")
                    setIsPeriodDialogOpen(false)
                  } catch (error) {
                    toast.error("Failed to update selection period")
                  }
                }}
              />
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation */}
          <AlertDialog open={!!deletingTopic} onOpenChange={() => setDeletingTopic(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Topic</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this topic? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteTopic}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Detailed Analytics Modal */}
          <Dialog open={!!selectedTopicForAnalytics} onOpenChange={() => setSelectedTopicForAnalytics(null)}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Detailed Topic Analytics</DialogTitle>
                <DialogDescription>
                  {detailedAnalytics?.topic.title}
                </DialogDescription>
              </DialogHeader>
              
              {detailedAnalytics && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Students</p>
                          <p className="text-2xl font-bold">{detailedAnalytics.summary.totalStudents}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Average Position</p>
                          <p className="text-2xl font-bold">
                            {detailedAnalytics.summary.averagePosition.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">24h Activity</p>
                          <p className="text-2xl font-bold">{detailedAnalytics.summary.recentActivity}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Student Selections</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student ID</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Last Updated</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailedAnalytics.students.slice(0, 10).map((student, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{student.studentId}</TableCell>
                              <TableCell>
                                <Badge variant={student.position === 1 ? "default" : "outline"}>
                                  #{student.position}
                                </Badge>
                              </TableCell>
                              <TableCell>{format(new Date(student.lastUpdated), "PPp")}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </DockLayout>
  )
}