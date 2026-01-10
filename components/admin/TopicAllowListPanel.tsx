"use client"

import type { Id } from "@/convex/_generated/dataModel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StudentAllowListManager } from "./StudentAllowListManager"
import { TeacherAllowListManager } from "./TeacherAllowListManager"
import { Users, UserCog } from "lucide-react"

interface TopicAllowListPanelProps {
  topicId: Id<"topics">
  topicTitle?: string
  defaultTab?: "students" | "teachers"
}

/**
 * Combined panel for managing both student and teacher allow-lists for a topic.
 * Use this in topic edit dialogs or detail views.
 */
export function TopicAllowListPanel({ 
  topicId, 
  topicTitle,
  defaultTab = "students"
}: TopicAllowListPanelProps) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="students" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Students
        </TabsTrigger>
        <TabsTrigger value="teachers" className="flex items-center gap-2">
          <UserCog className="h-4 w-4" />
          Teachers
        </TabsTrigger>
      </TabsList>
      <TabsContent value="students" className="mt-4">
        <StudentAllowListManager topicId={topicId} topicTitle={topicTitle} />
      </TabsContent>
      <TabsContent value="teachers" className="mt-4">
        <TeacherAllowListManager topicId={topicId} topicTitle={topicTitle} />
      </TabsContent>
    </Tabs>
  )
}
