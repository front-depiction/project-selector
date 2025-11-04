"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { useQuery } from "convex-helpers/react/cache/hooks"
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
import { TrendingUp, Users } from "lucide-react"

export function TopicCompetitionChart({ className }: { className?: string }) {
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

  // Take top 10 most popular topics and prepare chart data
  const chartData = data.slice(0, 10).map((d, index) => ({
    topic: d.topic.length > 15 ? d.topic.substring(0, 15) + "..." : d.topic,
    students: d.students,
    fill: `var(--color-topic-${index})`,
    averageRank: d.averageRank,
    top3Percentage: d.top3Percentage,
    competitionLevel: d.competitionLevel
  }))

  // Build chart config dynamically
  const chartConfig: ChartConfig = {
    students: {
      label: "Students",
    },
    ...chartData.reduce((acc, item, index) => ({
      ...acc,
      [`topic-${index}`]: {
        label: item.topic,
        color: `var(--chart-${(index % 5) + 1})`,
      },
    }), {})
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Topic Competition Levels</CardTitle>
        <CardDescription>
          Most popular topics by student rankings
        </CardDescription>
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
              width={100}
            />
            <XAxis dataKey="students" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                    const data = item.payload
                    return (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          <span className="font-semibold">{value} students</span>
                        </div>
                        {data && (
                          <>
                            <div className="text-xs text-muted-foreground">
                              Avg Rank: {data.averageRank?.toFixed(1) || "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Top 3: {data.top3Percentage?.toFixed(0) || 0}%
                            </div>
                            <div className="text-xs font-medium">
                              Competition: {data.competitionLevel}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  }}
                  hideLabel
                />
              }
            />
            <Bar dataKey="students" layout="vertical" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          <TrendingUp className="h-4 w-4" />
          Competition levels based on average ranking positions
        </div>
        <div className="text-muted-foreground leading-none">
          Lower average rank indicates higher competition
        </div>
      </CardFooter>
    </Card>
  )
}
