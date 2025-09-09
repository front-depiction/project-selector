"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/kibo-ui/combobox"
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
  Calendar as CalendarIcon,
  CheckCircle,
  Users,
  FileText,
  Clock,
  ArrowLeft,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import type { Id } from "@/convex/_generated/dataModel"

// Topic form state type
type TopicForm = {
  title: string
  description: string
  semesterId: string
}

// Period form state type
type PeriodForm = {
  semesterId: string
  title: string
  description: string
  openDate: Date | undefined
  closeDate: Date | undefined
  isActive: boolean
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("topics")
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false)
  const [isPeriodDialogOpen, setIsPeriodDialogOpen] = useState(false)
  const [editingTopic, setEditingTopic] = useState<any>(null)
  const [deletingTopic, setDeletingTopic] = useState<Id<"topics"> | null>(null)

  // Form states
  const [topicForm, setTopicForm] = useState<TopicForm>({
    title: "",
    description: "",
    semesterId: "2024-spring"
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
  const currentPeriod = useQuery(api.admin.getCurrentPeriod, {})
  const allPeriods = useQuery(api.admin.getAllPeriods, {})
  const stats = useQuery(api.stats.getLandingStats, {})
  const preferences = useQuery(api.preferences.getAllPreferences, {})

  // Mutations
  const createTopic = useMutation(api.admin.createTopic)
  const updateTopic = useMutation(api.admin.updateTopic)
  const deleteTopic = useMutation(api.admin.deleteTopic)
  const upsertPeriod = useMutation(api.admin.upsertSelectionPeriod)
  const seedData = useMutation(api.admin.seedTestData)
  const clearData = useMutation(api.admin.clearAllData)

  // Handlers
  const handleCreateTopic = async () => {
    try {
      await createTopic(topicForm)
      toast.success("Topic created successfully")
      setIsTopicDialogOpen(false)
      setTopicForm({ title: "", description: "", semesterId: "2024-spring" })
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
        isActive: editingTopic.isActive
      })
      toast.success("Topic updated successfully")
      setIsTopicDialogOpen(false)
      setEditingTopic(null)
      setTopicForm({ title: "", description: "", semesterId: "2024-spring" })
    } catch (error) {
      toast.error("Failed to update topic")
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

  const handleSavePeriod = async () => {
    if (!periodForm.openDate || !periodForm.closeDate) {
      toast.error("Please select both dates")
      return
    }

    try {
      await upsertPeriod({
        semesterId: periodForm.semesterId,
        title: periodForm.title,
        description: periodForm.description,
        openDate: periodForm.openDate.getTime(),
        closeDate: periodForm.closeDate.getTime(),
        isActive: periodForm.isActive
      })
      toast.success("Selection period updated")
      setIsPeriodDialogOpen(false)
    } catch (error) {
      toast.error("Failed to update selection period")
    }
  }

  const openEditDialog = (topic: any) => {
    setEditingTopic(topic)
    setTopicForm({
      title: topic.title,
      description: topic.description,
      semesterId: topic.semesterId
    })
    setIsTopicDialogOpen(true)
  }

  const openCreateDialog = () => {
    setEditingTopic(null)
    const activePeriod = allPeriods?.find(p => p.isActive)
    setTopicForm({ 
      title: "", 
      description: "", 
      semesterId: activePeriod?.semesterId || "2024-spring" 
    })
    setIsTopicDialogOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
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

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="topics">Topics</TabsTrigger>
            <TabsTrigger value="period">Selection Period</TabsTrigger>
            <TabsTrigger value="students">Student Selections</TabsTrigger>
            <TabsTrigger value="tools">Developer Tools</TabsTrigger>
          </TabsList>

          {/* Topics Tab */}
          <TabsContent value="topics" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Project Topics</CardTitle>
                  <CardDescription>Manage available project topics</CardDescription>
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

                      return (
                        <TableRow key={topic._id}>
                          <TableCell className="font-medium">{topic.title}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {topic.description}
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
          </TabsContent>

          {/* Selection Period Tab */}
          <TabsContent value="period" className="space-y-4">
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
          </TabsContent>

          {/* Student Selections Tab */}
          <TabsContent value="students" className="space-y-4">
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
          </TabsContent>

          {/* Developer Tools Tab */}
          <TabsContent value="tools" className="space-y-4">
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
          </TabsContent>
        </Tabs>

        {/* Topic Dialog */}
        <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTopic ? "Edit Topic" : "Create New Topic"}
              </DialogTitle>
              <DialogDescription>
                {editingTopic ? "Update the topic details" : "Add a new project topic"}
              </DialogDescription>
            </DialogHeader>
            {!editingTopic && (!allPeriods || allPeriods.length === 0) ? (
              <div className="py-8 text-center">
                <div className="text-muted-foreground mb-4">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-lg font-medium">No Selection Period Available</p>
                  <p className="text-sm mt-2">Please create a selection period first before adding topics.</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsTopicDialogOpen(false)
                    setActiveTab("periods")
                  }}
                >
                  Go to Periods Tab
                </Button>
              </div>
            ) : (
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
                    rows={4}
                  />
                </div>
              {!editingTopic && (
                <div>
                  <Label htmlFor="semester">Selection Period</Label>
                  {allPeriods && allPeriods.length > 0 ? (
                    <Combobox
                      data={allPeriods.map((period) => ({
                        value: period.semesterId,
                        label: `${period.title} (${period.semesterId})`
                      }))}
                      type="period"
                      value={topicForm.semesterId}
                      onValueChange={(value) => setTopicForm({ ...topicForm, semesterId: value })}
                    >
                      <ComboboxTrigger className="w-full" />
                      <ComboboxContent>
                        <ComboboxInput />
                        <ComboboxList>
                          <ComboboxEmpty>No periods found</ComboboxEmpty>
                          <ComboboxGroup>
                            {allPeriods.map((period) => (
                              <ComboboxItem key={period._id} value={period.semesterId}>
                                {period.title} ({period.semesterId})
                              </ComboboxItem>
                            ))}
                          </ComboboxGroup>
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  ) : (
                    <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                      No selection periods available. Please create a period first.
                    </div>
                  )}
                </div>
              )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTopicDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={editingTopic ? handleUpdateTopic : handleCreateTopic}
                disabled={!editingTopic && (!allPeriods || allPeriods.length === 0)}
              >
                {editingTopic ? "Update" : "Create"}
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
            <div className="space-y-4">
              <div>
                <Label htmlFor="period-semester">Semester ID</Label>
                <Input
                  id="period-semester"
                  value={periodForm.semesterId}
                  onChange={(e) => setPeriodForm({ ...periodForm, semesterId: e.target.value })}
                  placeholder="e.g., 2024-spring"
                />
              </div>
              <div>
                <Label htmlFor="period-title">Title</Label>
                <Input
                  id="period-title"
                  value={periodForm.title}
                  onChange={(e) => setPeriodForm({ ...periodForm, title: e.target.value })}
                  placeholder="e.g., Spring 2024 Project Selection"
                />
              </div>
              <div>
                <Label htmlFor="period-description">Description</Label>
                <Textarea
                  id="period-description"
                  value={periodForm.description}
                  onChange={(e) => setPeriodForm({ ...periodForm, description: e.target.value })}
                  placeholder="Describe the selection period and any important information for students"
                  rows={3}
                />
              </div>
              <div>
                <Label>Open Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {periodForm.openDate ? format(periodForm.openDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={periodForm.openDate}
                      onSelect={(date) => setPeriodForm({ ...periodForm, openDate: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Close Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {periodForm.closeDate ? format(periodForm.closeDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={periodForm.closeDate}
                      onSelect={(date) => setPeriodForm({ ...periodForm, closeDate: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={periodForm.isActive}
                  onCheckedChange={(checked) => setPeriodForm({ ...periodForm, isActive: checked })}
                />
                <Label htmlFor="active">Set as active period</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPeriodDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePeriod}>Save Period</Button>
            </DialogFooter>
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
      </div>
    </div>
  )
}