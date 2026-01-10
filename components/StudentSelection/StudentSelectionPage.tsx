"use client"

import { useSignals } from "@preact/signals-react/runtime"
import SortableList, { SortableListItem } from "@/components/ui/sortable-list"
import { StudentQuestionPresentationView } from "@/components/StudentQuestionnaire/StudentQuestionPresentationView"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Users,
  Sparkles,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { AnimatePresence, motion } from "motion/react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import type { Item } from "@/components/ui/sortable-list"
import type { TopicItemVM, StudentSelectionPageVM } from "./StudentSelectionPageVM"
import { TopicPopularityChart } from "@/components/charts/topic-popularity-chart"
import * as Option from "effect/Option"

// ============================================================================
// Pure UI Helper Functions
// ============================================================================

const getCongestionStyles = (category: string) => {
  switch (category) {
    case "low":
      return {
        badge: "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-green-500/20",
        icon: TrendingDown,
        gradient: "from-green-500/20 to-green-500/5",
        ring: "ring-green-500/20"
      }
    case "moderate":
      return {
        badge: "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400 border-yellow-500/20",
        icon: TrendingUp,
        gradient: "from-yellow-500/20 to-yellow-500/5",
        ring: "ring-yellow-500/20"
      }
    case "high":
      return {
        badge: "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border-orange-500/20",
        icon: AlertTriangle,
        gradient: "from-orange-500/20 to-orange-500/5",
        ring: "ring-orange-500/20"
      }
    case "very-high":
      return {
        badge: "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 border-red-500/20",
        icon: AlertCircle,
        gradient: "from-red-500/20 to-red-500/5",
        ring: "ring-red-500/20"
      }
    default:
      return {
        badge: "bg-gray-500/10 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400 border-gray-500/20",
        icon: Info,
        gradient: "from-gray-500/20 to-gray-500/5",
        ring: "ring-gray-500/20"
      }
  }
}

const getCongestionLabel = (category: string): string => {
  switch (category) {
    case "low": return "Low Risk"
    case "moderate": return "Moderate"
    case "high": return "High Risk"
    case "very-high": return "Very High"
    default: return "Unknown"
  }
}

// ============================================================================
// UI Components
// ============================================================================

const OrderBadge = ({ order }: { order: number }) => (
  <div className="flex items-center gap-3 w-16 flex-shrink-0">
    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-semibold">
      {order}
    </div>
    <GripVertical className="h-4 w-4 text-muted-foreground opacity-50 hover:opacity-100 transition-opacity cursor-move" />
  </div>
)

const TopicTitle = ({ title, description }: { title: string; description: string }) => (
  <div className="flex-1 min-w-0 px-4">
    <h3 className="font-semibold text-base line-clamp-1">
      {title}
    </h3>
    <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
      {description}
    </p>
  </div>
)

const CongestionStats = ({
  item,
  isExpanded,
  onToggleExpand
}: {
  item: TopicItemVM
  isExpanded: boolean
  onToggleExpand: () => void
}) => {
  const styles = getCongestionStyles(item.likelihoodCategory)
  const Icon = styles.icon
  const label = getCongestionLabel(item.likelihoodCategory)

  return (
    <div className="flex items-center gap-3 w-56 flex-shrink-0 justify-end">
      <div className="flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-xs text-muted-foreground">Avg:</span>
          <span className="font-semibold">
            {item.averagePosition !== null ? item.averagePosition.toFixed(1) : "—"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>{item.studentCount} ranked</span>
        </div>
      </div>
      <Badge
        variant="outline"
        className={cn(
          "text-xs border min-w-[90px] justify-center",
          styles.badge
        )}
      >
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          onToggleExpand()
        }}
        className="h-8 w-8 p-0 flex-shrink-0"
      >
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}

const ExpandedDetails = ({ item }: { item: TopicItemVM }) => {
  const styles = getCongestionStyles(item.likelihoodCategory)
  const Icon = styles.icon
  const label = getCongestionLabel(item.likelihoodCategory)

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="px-4 pb-4 border-t bg-muted/30">
        <div className="ml-16 pt-3">
          <p className="text-sm text-muted-foreground mb-3">
            {item.description}
          </p>
          <div className="flex items-center gap-6 text-sm mb-4">
            <div className="flex items-center gap-1.5">
              <Icon className="h-4 w-4" />
              <span className="font-medium">Competition:</span>
              <span className="text-muted-foreground">{label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium">Average Position:</span>
              <span className="text-muted-foreground">
                {item.averagePosition !== null ? item.averagePosition.toFixed(1) : "—"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span className="text-muted-foreground">
                {item.studentCount} {item.studentCount === 1 ? 'student has' : 'students have'} ranked this topic
              </span>
            </div>
          </div>

          {item._id && (
            <TopicPopularityChart
              topicId={item._id}
              topicTitle={item.text}
              className="mb-3"
            />
          )}

          {item.averagePosition !== null && (
            <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
              <Info className="h-3 w-3 inline mr-1" />
              An average position of {item.averagePosition.toFixed(1)} means most students are ranking this topic
              around position {Math.round(item.averagePosition)} in their preferences.
              {item.averagePosition <= 3 && " This is a highly competitive topic!"}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

const TopicCard = ({
  item,
  order,
  isExpanded,
  onToggleExpand,
  onCompleteItem,
  onRemoveItem,
  handleDrag
}: {
  item: TopicItemVM
  order: number
  isExpanded: boolean
  onToggleExpand: () => void
  onCompleteItem: (id: number | string) => void
  onRemoveItem: (id: number | string) => void
  handleDrag: () => void
}) => {
  return (
    <SortableListItem
      item={item}
      order={order}
      onCompleteItem={onCompleteItem}
      onRemoveItem={onRemoveItem}
      handleDrag={handleDrag}
      className="my-3"
      renderExtra={() => (
        <div className="group flex flex-col w-full bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md hover:border-primary/20 transition-all">
          <div className="flex items-center w-full p-4">
            <OrderBadge order={order} />
            <TopicTitle title={item.text} description={item.description} />
            <CongestionStats
              item={item}
              isExpanded={isExpanded}
              onToggleExpand={onToggleExpand}
            />
          </div>

          <AnimatePresence>
            {isExpanded && <ExpandedDetails item={item} />}
          </AnimatePresence>
        </div>
      )}
    />
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function StudentSelectionPage({ vm }: { vm: StudentSelectionPageVM }) {
  // Enable automatic reactivity for signals
  useSignals()

  // Loading state
  if (vm.isLoading$.value) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Questionnaire view
  if (vm.questionnaireState$.value.needsCompletion && vm.questionnaireVM$.value) {
    return (
      <StudentQuestionPresentationView
        vm={vm.questionnaireVM$.value}
      />
    )
  }

  // No topics available
  if (vm.topics$.value.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No topics are available for selection at this time.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Main selection view
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        {/* Header Navigation */}
        <div className="mb-6">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 hover:bg-primary/5 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Portal
            </Button>
          </Link>

          {Option.match(vm.currentPeriod$.value, {
            onNone: () => null,
            onSome: (period) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="mb-6 border-primary/10 shadow-lg bg-gradient-to-r from-primary/5 to-transparent overflow-hidden">
                  <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.6))] pointer-events-none" />
                  <CardHeader className="relative">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Sparkles className="h-5 w-5 text-primary" />
                          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                            {period.title}
                          </CardTitle>
                        </div>
                        <CardDescription className="text-base max-w-2xl">
                          {period.description}
                        </CardDescription>
                      </div>
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20 shadow-sm">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Open
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-4 pt-4 border-t border-border/50">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Closes {period.daysRemaining}</span>
                      </div>
                      <span className="text-border">•</span>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>ID: {vm.studentId$.value}</span>
                      </div>
                      <span className="text-border">•</span>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        <span>{vm.selectionProgress$.value.selectedCount} topics ranked</span>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="border-primary/10 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Topics Available</p>
                    <p className="text-2xl font-bold">{vm.topics$.value.length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="border-green-500/10 bg-gradient-to-br from-green-500/5 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Your Rankings</p>
                    <p className="text-2xl font-bold">
                      {vm.selectionProgress$.value.selectedCount}/{vm.selectionProgress$.value.maxSelections}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="border-blue-500/10 bg-gradient-to-br from-blue-500/5 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Time Remaining</p>
                    <p className="text-lg font-bold">
                      {Option.match(vm.currentPeriod$.value, {
                        onNone: () => "--",
                        onSome: (period) => period.daysRemaining
                      })}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Selection Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-6"
        >
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">Rank Your Preferences</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Drag to reorder • Click arrows to expand details • Your top choice should be #1
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Progress</p>
                  <p className="text-sm font-medium">
                    {vm.selectionProgress$.value.selectedCount}/{vm.selectionProgress$.value.maxSelections}
                  </p>
                </div>
                <Progress value={vm.selectionProgress$.value.progressPercentage} className="w-20 h-2" />
              </div>
            </div>
            {Option.match(vm.validationState$.value.error$.value, {
              onNone: () => null,
              onSome: (error) => (
                <Alert variant="destructive" className="mt-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )
            })}
          </div>

          <SortableList
            items={vm.topics$.value as any}
            setItems={vm.updateSelection}
            onCompleteItem={() => {}}
            renderItem={(item: any, order) => (
              <TopicCard
                key={item.id}
                item={item as TopicItemVM}
                order={order}
                isExpanded={vm.expandedTopicIds$.value.has(item.id)}
                onToggleExpand={() => vm.toggleTopicExpanded(item.id)}
                onCompleteItem={() => {}}
                onRemoveItem={() => {}}
                handleDrag={() => {}}
              />
            )}
          />
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Quick Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold">1</span>
                  </div>
                  <p className="text-muted-foreground">Review topics and their congestion levels</p>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold">2</span>
                  </div>
                  <p className="text-muted-foreground">Drag topics to reorder by preference</p>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold">3</span>
                  </div>
                  <p className="text-muted-foreground">Changes save automatically</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Congestion Levels
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Indicates your likelihood of being assigned to a topic based on current selections.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Low
                    </Badge>
                    <span className="text-xs text-muted-foreground">Best chance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Moderate
                    </Badge>
                    <span className="text-xs text-muted-foreground">Fair chance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      High
                    </Badge>
                    <span className="text-xs text-muted-foreground">Competitive</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Very High
                    </Badge>
                    <span className="text-xs text-muted-foreground">Difficult</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
