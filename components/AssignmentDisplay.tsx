"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Trophy, Award, User, Hash } from "lucide-react"
import { cn } from "@/lib/utils"

interface AssignmentDisplayProps {
  periodId: Id<"selectionPeriods"> | undefined
  studentId?: string
}

export function AssignmentDisplay({ periodId, studentId }: AssignmentDisplayProps) {
  const assignments = useQuery(
    api.assignments.getAssignments,
    periodId ? { periodId } : "skip"
  )
  
  const myAssignment = useQuery(
    api.assignments.getMyAssignment,
    periodId && studentId ? { periodId, studentId } : "skip"
  )
  
  const stats = useQuery(
    api.assignments.getAssignmentStats,
    periodId ? { periodId } : "skip"
  )
  
  if (!assignments) return null
  
  const topicEntries = Object.entries(assignments).sort(
    ([, a], [, b]) => (b as any).students.length - (a as any).students.length
  )
  
  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {myAssignment && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="mb-6"
          >
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  {myAssignment.wasTopChoice ? (
                    <div className="p-2 bg-yellow-100 rounded-full">
                      <Trophy className="h-6 w-6 text-yellow-600" />
                    </div>
                  ) : myAssignment.wasPreference ? (
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Award className="h-6 w-6 text-blue-600" />
                    </div>
                  ) : (
                    <div className="p-2 bg-gray-100 rounded-full">
                      <Users className="h-6 w-6 text-gray-600" />
                    </div>
                  )}
                  <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    Your Assignment
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <h3 className="text-xl font-bold mb-3">
                  {myAssignment.topic?.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {myAssignment.topic?.description}
                </p>
                <div className="flex gap-2 mt-4">
                  {myAssignment.wasTopChoice && (
                    <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                      <Trophy className="w-3 h-3 mr-1" />
                      Your top choice!
                    </Badge>
                  )}
                  {myAssignment.wasPreference && !myAssignment.wasTopChoice && (
                    <Badge variant="secondary">
                      <Hash className="w-3 h-3 mr-1" />
                      Rank {myAssignment.assignment.originalRank}
                    </Badge>
                  )}
                  {!myAssignment.wasPreference && (
                    <Badge variant="outline">
                      Randomly Assigned
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      {stats && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-r from-background to-muted/20 border-muted/30">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Assignment Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center space-y-1">
                  <div className="text-3xl font-bold text-primary">{stats.totalAssignments}</div>
                  <div className="text-xs text-muted-foreground">Total Assignments</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-3xl font-bold text-blue-600">
                    {stats.totalAssignments > 0 
                      ? Math.round((stats.matchedPreferences / stats.totalAssignments) * 100)
                      : 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">Matched Preferences</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-3xl font-bold text-yellow-600">
                    {stats.totalAssignments > 0
                      ? Math.round((stats.topChoices / stats.totalAssignments) * 100)
                      : 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">Got Top Choice</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-muted-foreground">Topic Assignments</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {topicEntries.map(([topicId, data], index) => {
            const topicData = data as any
            const isMyTopic = myAssignment?.topic?._id === topicId
            
            return (
              <motion.div
                key={topicId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 300,
                  damping: 25
                }}
              >
                <Card className={cn(
                  "h-full transition-all hover:shadow-md",
                  isMyTopic && "ring-2 ring-primary shadow-lg bg-primary/5"
                )}>
                  <CardHeader className="pb-3">
                    <div className="space-y-2">
                      <CardTitle className="text-base leading-tight line-clamp-2">
                        {topicData.topic?.title}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={isMyTopic ? "default" : "secondary"}
                          className="text-xs"
                        >
                          <Users className="w-3 h-3 mr-1" />
                          {topicData.students.length} student{topicData.students.length !== 1 ? 's' : ''}
                        </Badge>
                        {isMyTopic && (
                          <Badge variant="outline" className="text-xs border-primary text-primary">
                            Your Topic
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1.5">
                      {topicData.students.slice(0, 4).map((student: any, idx: number) => (
                        <div
                          key={student.studentId}
                          className={cn(
                            "flex items-center justify-between text-sm py-1 px-2 rounded",
                            student.studentId === studentId 
                              ? "bg-primary/10 font-medium" 
                              : "hover:bg-muted/50"
                          )}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="truncate">
                              {student.studentId}
                              {student.studentId === studentId && " (You)"}
                            </span>
                          </span>
                          {student.originalRank && (
                            <Badge 
                              variant={student.originalRank === 1 ? "default" : "outline"} 
                              className="text-xs h-5"
                            >
                              #{student.originalRank}
                            </Badge>
                          )}
                        </div>
                      ))}
                      {topicData.students.length > 4 && (
                        <div className="text-xs text-muted-foreground text-center pt-1">
                          +{topicData.students.length - 4} more student{topicData.students.length - 4 !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}