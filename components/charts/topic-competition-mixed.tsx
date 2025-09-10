"use client"

import { TrendingUp } from "lucide-react"
import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export function TopicCompetitionMixedChart({ className }: { className?: string }) {
  const data = useQuery(api.analytics.getTopicCompetitionLevels)

  if (!data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  // Take top 10 most competitive topics (lowest average rank = most competitive)
  const chartData = data
    .filter(d => d.students > 0 && d.averageRank !== null)
    .sort((a, b) => (a.averageRank || 999) - (b.averageRank || 999))
    .slice(0, 10)
    .map((d) => {
      // Determine color based on competition level
      const colorIndex =
        d.competitionLevel === "Very High"
          ? "topic-1"
          : d.competitionLevel === "High"
            ? "topic-2"
            : d.competitionLevel === "Moderate"
              ? "topic-3"
              : "topic-4"

      // Invert the average rank for display (lower rank = taller bar)
      // Use a scale that ensures all bars are visible
      const maxRank = 10 // Assuming max rank is 10
      const competitiveness = d.averageRank ? ((maxRank - d.averageRank + 1) / maxRank) * 5 : 0.5

      return {
        topic: d.topic.length > 20 ? d.topic.substring(0, 20) + "..." : d.topic,
        competitiveness: Math.max(0.5, competitiveness), // Score from 0.5-5 (ensures minimum visibility)
        fill: `var(--color-${colorIndex})`,
        fullName: d.topic,
        averageRank: d.averageRank,
        studentCount: d.students,
        top3Percentage: d.top3Percentage,
        competitionLevel: d.competitionLevel
      }
    })

  // Build static chart config
  const chartConfig: ChartConfig = {
    competitiveness: {
      label: "Competitiveness",
    },
    "topic-1": {
      label: "Very High Competition",
      color: "var(--chart-1)",
    },
    "topic-2": {
      label: "High Competition",
      color: "var(--chart-2)",
    },
    "topic-3": {
      label: "Moderate Competition",
      color: "var(--chart-3)",
    },
    "topic-4": {
      label: "Low Competition",
      color: "var(--chart-4)",
    },
  }

  // Calculate average metrics
  const avgRank = chartData.reduce((acc, curr) => acc + (curr.averageRank || 0), 0) / chartData.length
  const avgTop3 = chartData.reduce((acc, curr) => acc + curr.top3Percentage, 0) / chartData.length

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Topic Competition Levels</CardTitle>
        <CardDescription>Topics ranked by average student preference (lower rank = higher competition)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              left: 0,
            }}
          >
            <YAxis
              dataKey="topic"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value}
              width={120}
            />
            <XAxis dataKey="competitiveness" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(_, __, item) => {
                    const data = item.payload
                    return (
                      <div className="flex flex-col gap-1 min-w-[150px]">
                        <div className="font-semibold text-sm mb-1">
                          {data.fullName}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            Avg Rank: #{data.averageRank?.toFixed(1) || "—"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Ranked by {data.studentCount} students
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {data.top3Percentage?.toFixed(0) || 0}% ranked it in their top 3
                        </div>
                        <div className="text-xs font-medium mt-1 pt-1 border-t">
                          Competition Level: {data.competitionLevel}
                        </div>
                      </div>
                    )
                  }}
                />
              }
            />
            <Bar dataKey="competitiveness" layout="vertical" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          <TrendingUp className="h-4 w-4" />
          Top {chartData.length} most competitive topics
        </div>
        <div className="text-muted-foreground leading-none">
          Average ranking position: {avgRank.toFixed(1)} | Top 3 rate: {avgTop3.toFixed(0)}%
        </div>
        <div className="flex gap-4 text-xs mt-2">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded" style={{ backgroundColor: "var(--color-topic-1)" }} />
            <span>Very High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded" style={{ backgroundColor: "var(--color-topic-2)" }} />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded" style={{ backgroundColor: "var(--color-topic-3)" }} />
            <span>Moderate</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded" style={{ backgroundColor: "var(--color-topic-4)" }} />
            <span>Low</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}