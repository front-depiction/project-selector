"use client"

import * as React from "react"
import type { Doc } from "@/convex/_generated/dataModel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Bar, BarChart, Line, LineChart, RadialBar, RadialBarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Trophy,
  Target,
  Percent,
  AlertCircle,
  Calendar,
  BarChart3
} from "lucide-react"

// ============================================================================
// TYPES (using Convex generated types)
// ============================================================================

type TopicAnalytics = {
  readonly metrics: {
    readonly totalSelections: number
    readonly averagePosition: number
    readonly firstChoiceCount: number
    readonly top3Count: number
    readonly top3Percentage: number
    readonly engagementScore: number
    readonly retentionRate: number
    readonly performanceScore: number
  }
  readonly trends: {
    readonly momentum: "rising" | "falling" | "stable"
    readonly last7Days: number
    readonly totalEvents: number
  }
  readonly studentRankings?: readonly {
    readonly studentId: string
    readonly studentName: string
    readonly rank: number
    readonly timestamp: number
  }[]
}

// ============================================================================
// CONTEXT
// ============================================================================

interface TopicDetailsContext {
  readonly topic: Doc<"topics">
  readonly analytics: TopicAnalytics | null
}

const Context = React.createContext<TopicDetailsContext | null>(null)

const useTopicDetails = () => {
  const context = React.useContext(Context)
  if (!context) {
    throw new Error("TopicDetails components must be used within TopicDetails.Provider")
  }
  return context
}

// ============================================================================
// PROVIDER
// ============================================================================

interface ProviderProps {
  readonly children: React.ReactNode
  readonly topic: Doc<"topics">
  readonly analytics: TopicAnalytics | null
}

const Provider: React.FC<ProviderProps> = ({ children, topic, analytics }) => {
  const value = React.useMemo(
    () => ({ topic, analytics }),
    [topic, analytics]
  )

  return <Context.Provider value={value}>{children}</Context.Provider>
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getMomentumColor = (momentum: string) => {
  switch (momentum) {
    case "rising":
      return "text-green-500"
    case "falling":
      return "text-red-500"
    default:
      return "text-gray-500"
  }
}

const getMomentumIcon = (momentum: string) => {
  switch (momentum) {
    case "rising":
      return <TrendingUp className="h-4 w-4" />
    case "falling":
      return <TrendingDown className="h-4 w-4" />
    default:
      return <Activity className="h-4 w-4" />
  }
}

const getPerformanceLevel = (score: number) => {
  if (score >= 80) return { label: "Excellent", color: "bg-green-500" }
  if (score >= 60) return { label: "Good", color: "bg-blue-500" }
  if (score >= 40) return { label: "Average", color: "bg-yellow-500" }
  return { label: "Low", color: "bg-gray-500" }
}

// ============================================================================
// COMPONENTS
// ============================================================================

const Header: React.FC = () => {
  const { topic, analytics } = useTopicDetails()

  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{topic.title}</CardTitle>
          <CardDescription>{topic.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No analytics data available yet.</p>
        </CardContent>
      </Card>
    )
  }

  const performance = getPerformanceLevel(analytics.metrics.performanceScore)

  return (
    <Card className="overflow-hidden">
      <div className={`h-2 ${performance.color}`} />
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-3xl">{topic.title}</CardTitle>
            <CardDescription className="text-base">{topic.description}</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`${getMomentumColor(analytics.trends.momentum)} border-current`}>
              {getMomentumIcon(analytics.trends.momentum)}
              <span className="ml-1 capitalize">{analytics.trends.momentum}</span>
            </Badge>
            <Badge variant={topic.isActive ? "default" : "secondary"}>
              {topic.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}

const MetricsGrid: React.FC = () => {
  const { analytics } = useTopicDetails()

  if (!analytics) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Selections</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{analytics.metrics.totalSelections}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {analytics.trends.last7Days} in last 7 days
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Rank</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">#{analytics.metrics.averagePosition}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Overall preference ranking
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">First Choice</CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{analytics.metrics.firstChoiceCount}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Students who ranked #1
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top 3 Rate</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{analytics.metrics.top3Percentage}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            In top 3 choices
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

const StudentRankings: React.FC = () => {
  const { analytics } = useTopicDetails()

  if (!analytics?.studentRankings || analytics.studentRankings.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Rankings</CardTitle>
        <CardDescription>Students who selected this topic and their ranking</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {analytics.studentRankings.map((ranking, idx) => (
            <div
              key={ranking.studentId || idx}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold">
                  {ranking.rank}
                </div>
                <div>
                  <p className="font-medium">{ranking.studentName || ranking.studentId}</p>
                  <p className="text-sm text-muted-foreground">
                    Selected on {new Date(ranking.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge variant={ranking.rank === 1 ? "default" : "secondary"}>
                {ranking.rank === 1 ? "First Choice" : `Choice ${ranking.rank}`}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

const TrendsChart: React.FC = () => {
  const { analytics } = useTopicDetails()

  if (!analytics) return null

  const performance = getPerformanceLevel(analytics.metrics.performanceScore)

  const chartData = [
    {
      metric: "Metrics",
      performance: analytics.metrics.performanceScore,
      engagement: analytics.metrics.engagementScore,
      retention: analytics.metrics.retentionRate,
    },
  ]

  const chartConfig = {
    performance: {
      label: "Performance",
      color: "var(--chart-1)",
    },
    engagement: {
      label: "Engagement",
      color: "var(--chart-2)",
    },
    retention: {
      label: "Retention",
      color: "var(--chart-3)",
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
        <CardDescription>Overall topic performance and trends</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="metric"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="performance" fill="var(--color-performance)" radius={8} />
            <Bar dataKey="engagement" fill="var(--color-engagement)" radius={8} />
            <Bar dataKey="retention" fill="var(--color-retention)" radius={8} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

const RankingDistribution: React.FC = () => {
  const { analytics } = useTopicDetails()

  if (!analytics?.studentRankings || analytics.studentRankings.length === 0) {
    return null
  }

  // Group rankings by position (0-10)
  const rankCounts = analytics.studentRankings.reduce((acc, ranking) => {
    const rank = Math.min(ranking.rank, 10) // Cap at 10
    const key = `${rank}`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Create data for all ranks 1-10, filling in 0 for ranks with no students
  const chartData = Array.from({ length: 10 }, (_, i) => {
    const rank = i + 1
    return {
      rank: `#${rank}`,
      students: rankCounts[`${rank}`] || 0,
      fill: `var(--color-rank-${i})`,
    }
  })

  const chartConfig = {
    students: {
      label: "Students",
    },
    ...chartData.reduce((acc, item, index) => ({
      ...acc,
      [`rank-${index}`]: {
        label: item.rank,
        color: `var(--chart-${(index % 5) + 1})`,
      },
    }), {}),
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking Distribution</CardTitle>
        <CardDescription>How students ranked this topic in their preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="rank"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="students" radius={8} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

const SubtopicsBreakdown: React.FC = () => {
  const { topic } = useTopicDetails()

  if (!topic.subtopicIds || topic.subtopicIds.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subtopics ({topic.subtopicIds.length})</CardTitle>
        <CardDescription>This topic has {topic.subtopicIds.length} subtopics</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Subtopic details available in topic management
        </p>
      </CardContent>
    </Card>
  )
}

const Loading: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
    </Card>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
)

const NotFound: React.FC = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-3">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <div>
          <CardTitle>Topic Not Found</CardTitle>
          <CardDescription>The requested topic does not exist</CardDescription>
        </div>
      </div>
    </CardHeader>
  </Card>
)

// ============================================================================
// EXPORTS
// ============================================================================

export const TopicDetails = {
  Provider,
  Header,
  MetricsGrid,
  StudentRankings,
  TrendsChart,
  RankingDistribution,
  SubtopicsBreakdown,
  Loading,
  NotFound,
} as const