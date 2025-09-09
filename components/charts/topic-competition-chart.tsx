"use client"

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
import { Users } from "lucide-react"

const chartConfig = {
  students: {
    label: "Students",
  },
} satisfies ChartConfig

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

  // Take top 10 most popular topics
  const chartData = data.slice(0, 10).map(d => ({
    ...d,
    topic: d.topic.length > 20 ? d.topic.substring(0, 20) + "..." : d.topic
  }))

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Topic Competition Levels</CardTitle>
        <CardDescription>
          Most popular topics by student rankings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="horizontal"
            margin={{
              left: 80,
              right: 20,
              top: 10,
              bottom: 10,
            }}
          >
            <YAxis
              dataKey="topic"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              width={75}
              style={{ fontSize: 12 }}
            />
            <XAxis 
              dataKey="students" 
              type="number"
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent 
                  formatter={(value, name) => {
                    const item = chartData.find(d => d.students === value)
                    return (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          <span className="font-semibold">{value} students</span>
                        </div>
                        {item && (
                          <>
                            <div className="text-xs text-muted-foreground">
                              Avg Rank: {item.averageRank?.toFixed(1) || "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Top 3: {item.top3Percentage.toFixed(0)}%
                            </div>
                            <div className="text-xs font-medium">
                              Competition: {item.competitionLevel}
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
            <Bar 
              dataKey="students" 
              layout="horizontal" 
              radius={[0, 5, 5, 0]}
              fill={(data: any) => data.fill}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: "var(--chart-1)" }} />
            <span>Very High Competition</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: "var(--chart-2)" }} />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: "var(--chart-3)" }} />
            <span>Moderate</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: "var(--chart-4)" }} />
            <span>Low</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}