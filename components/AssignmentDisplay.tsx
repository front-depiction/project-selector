"use client"

import { Id } from "@/convex/_generated/dataModel"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Trophy, Award, User, Hash, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAssignmentDisplayVM } from "./AssignmentDisplayVM"
import { useSignals } from "@preact/signals-react/runtime"

interface AssignmentDisplayProps {
  periodId: Id<"selectionPeriods"> | undefined
  studentId?: string
  isExperiment?: boolean
  showFullQualityNames?: boolean
}

export function AssignmentDisplay({ periodId, studentId, isExperiment = false, showFullQualityNames = false }: AssignmentDisplayProps) {
  useSignals()
  const vm = useAssignmentDisplayVM(periodId, studentId)

  const isLoading = vm.isLoading$.value
  const isEmpty = vm.isEmpty$.value
  const myAssignment = vm.myAssignment$.value
  const stats = vm.stats$.value
  const assignments = vm.assignments$.value
  const showExportButton = vm.showExportButton$.value

  if (isLoading) return null
  if (isEmpty) return null
  
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
                  {myAssignment.iconType === "trophy" ? (
                    <div className={myAssignment.iconColorClass}>
                      <Trophy className="h-6 w-6 text-yellow-600" />
                    </div>
                  ) : myAssignment.iconType === "award" ? (
                    <div className={myAssignment.iconColorClass}>
                      <Award className="h-6 w-6 text-blue-600" />
                    </div>
                  ) : (
                    <div className={myAssignment.iconColorClass}>
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
                  {myAssignment.topicTitle}
                </h3>
                {myAssignment.topicDescription && (
                  <p className="text-muted-foreground leading-relaxed">
                    {myAssignment.topicDescription}
                  </p>
                )}
                {!isExperiment && (
                  <div className="flex gap-2 mt-4">
                    {myAssignment.badgeIcon === "trophy" && myAssignment.badgeText && (
                      <Badge variant={myAssignment.badgeVariant} className="bg-yellow-500 hover:bg-yellow-600">
                        <Trophy className="w-3 h-3 mr-1" />
                        {myAssignment.badgeText}
                      </Badge>
                    )}
                    {myAssignment.badgeIcon === "hash" && myAssignment.badgeText && (
                      <Badge variant={myAssignment.badgeVariant}>
                        <Hash className="w-3 h-3 mr-1" />
                        {myAssignment.badgeText}
                      </Badge>
                    )}
                    {myAssignment.badgeIcon === "none" && myAssignment.badgeText && (
                      <Badge variant={myAssignment.badgeVariant}>
                        {myAssignment.badgeText}
                      </Badge>
                    )}
                  </div>
                )}
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Assignment Statistics</CardTitle>
                {showExportButton && (
                  <Button onClick={vm.exportToCSV} variant="outline" size="sm" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isExperiment ? (
                <div className="text-center space-y-1">
                  <div className="text-3xl font-bold text-primary">{stats.totalAssigned}</div>
                  <div className="text-xs text-muted-foreground">Total Students Assigned</div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center space-y-1">
                    <div className="text-3xl font-bold text-primary">{stats.totalAssigned}</div>
                    <div className="text-xs text-muted-foreground">Total Assignments</div>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="text-3xl font-bold text-blue-600">
                      {stats.matchRate}
                    </div>
                    <div className="text-xs text-muted-foreground">Matched Preferences</div>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="text-3xl font-bold text-yellow-600">
                      {stats.topChoiceRate}
                    </div>
                    <div className="text-xs text-muted-foreground">Got Top Choice</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-muted-foreground">Group Assignments</h3>
        <div className="space-y-4">
          {assignments.map((topic, index) => (
            <motion.div
              key={topic.key}
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
                "transition-all hover:shadow-md",
                topic.isUserAssigned && "ring-2 ring-primary shadow-lg bg-primary/5"
              )}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl leading-tight">
                          {topic.title}
                        </CardTitle>
                        <Badge
                          variant={topic.isUserAssigned ? "default" : "secondary"}
                          className="text-xs"
                        >
                          <Users className="w-3 h-3 mr-1" />
                          {topic.studentCountDisplay}
                        </Badge>
                        {topic.isUserAssigned && (
                          <Badge variant="outline" className="text-xs border-primary text-primary">
                            Your Group
                          </Badge>
                        )}
                      </div>
                      
                      {topic.qualityBadges.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground font-medium">Avg Qualities:</span>
                          {topic.qualityBadges.map((badge) => (
                            <Badge
                              key={badge.letter}
                              variant="outline"
                              className={cn("text-xs bg-muted/50", !showFullQualityNames && "font-mono")}
                              title={showFullQualityNames ? undefined : badge.fullName}
                            >
                              {showFullQualityNames ? `${badge.fullName}: ${badge.value}` : `${badge.letter}: ${badge.value}`}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {topic.students.map((student) => (
                      <div
                        key={student.key}
                        className={cn(
                          "flex items-center gap-2 text-sm py-2 px-3 rounded border",
                          student.isCurrentUser
                            ? "bg-primary/10 border-primary font-medium"
                            : "bg-muted/30 border-border hover:bg-muted/50"
                        )}
                      >
                        <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="flex-1 min-w-0">
                          <span className="block truncate">
                            {student.studentIdDisplay}
                          </span>
                        </span>
                        {!isExperiment && student.rankDisplay && (
                          <Badge
                            variant={student.rankBadgeVariant}
                            className="text-xs h-5 flex-shrink-0"
                          >
                            {student.rankDisplay}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}