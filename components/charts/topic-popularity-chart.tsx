"use client"

import { Bar, BarChart, CartesianGrid, XAxis, Line, LineChart, YAxis, ComposedChart } from "recharts"
import { useQuery } from "convex-helpers/react/cache/hooks"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { FunctionReturnType } from "convex/server"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

type TopicRankingHistoryData = NonNullable<
  FunctionReturnType<typeof api.analytics.getTopicRankingHistory>
>
type TopicRankingPoint = TopicRankingHistoryData["chartData"][number]

const chartConfig = {
  added: {
    label: "New Rankings",
    color: "var(--chart-1)",
  },
  moved: {
    label: "Position Changes",
    color: "var(--chart-2)",
  },
  removed: {
    label: "Removed",
    color: "var(--chart-3)",
  },
  averagePosition: {
    label: "Avg Position",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

interface TopicPopularityChartProps {
  topicId: Id<"topics">
  topicTitle: string
  className?: string
}

export function TopicPopularityChart({ 
  topicId, 
  topicTitle,
  className 
}: TopicPopularityChartProps) {
  const data = useQuery(api.analytics.getTopicRankingHistory, { 
    topicId,
    days: 30 
  })

  if (!data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const { chartData, currentMetrics } = data
  
  // Calculate trend
  const recentData = chartData.slice(-7)
  const oldAvg = recentData.slice(0, 3).reduce((acc: number, d: TopicRankingPoint) => acc + (d.averagePosition || 0), 0) / 3
  const newAvg = recentData.slice(-3).reduce((acc: number, d: TopicRankingPoint) => acc + (d.averagePosition || 0), 0) / 3
  const trend = oldAvg === 0 ? "stable" : newAvg < oldAvg ? "improving" : newAvg > oldAvg ? "declining" : "stable"

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Popularity Trend</CardTitle>
            <CardDescription>
              {currentMetrics.totalStudents} students ranked • 
              Avg position: {currentMetrics.averagePosition?.toFixed(1) || "—"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 text-sm">
            {trend === "improving" && (
              <>
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-green-600">Improving</span>
              </>
            )}
            {trend === "declining" && (
              <>
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-red-600">Declining</span>
              </>
            )}
            {trend === "stable" && (
              <>
                <Minus className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Stable</span>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <ComposedChart
            data={chartData}
            margin={{
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                const date = new Date(value)
                // Show time for recent data, date for older data
                const hoursDiff = (Date.now() - date.getTime()) / (1000 * 60 * 60)
                if (hoursDiff < 24) {
                  return date.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })
                }
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <YAxis 
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[5, 1]}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[200px]"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }}
                />
              }
            />
            <Bar yAxisId="left" dataKey="added" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="moved" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="averagePosition" 
              stroke="var(--chart-4)" 
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
