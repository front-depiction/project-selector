"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { useQuery } from "convex-helpers/react/cache/hooks"
import { api } from "@/convex/_generated/api"

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

const chartConfig = {
  events: {
    label: "Events",
  },
  added: {
    label: "Added",
    color: "var(--chart-1)",
  },
  moved: {
    label: "Position Changed",
    color: "var(--chart-2)",
  },
  removed: {
    label: "Removed",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

export type TimeGranularity = "by-minute" | "hourly" | "daily"

interface RankingEventsChartProps {
  className?: string
  granularity?: TimeGranularity
  hours?: number
}

export function RankingEventsChart({ 
  className, 
  granularity = "hourly",
  hours = 48 
}: RankingEventsChartProps) {
  const [activeChart, setActiveChart] = React.useState<"added" | "moved" | "removed">("added")
  
  const recentEvents = useQuery(api.analytics.getRecentRankingEvents, { hours })

  // Process events into time buckets
  const chartData = React.useMemo(() => {
    if (!recentEvents) return []
    
    // Calculate bucket size based on granularity
    const getBucketKey = (timestamp: number): string => {
      switch (granularity) {
        case "by-minute":
          return new Date(Math.floor(timestamp / 60000) * 60000).toISOString()
        case "hourly":
          return new Date(Math.floor(timestamp / 3600000) * 3600000).toISOString()
        case "daily":
          const date = new Date(timestamp)
          date.setHours(0, 0, 0, 0)
          return date.toISOString()
        default:
          return new Date(Math.floor(timestamp / 3600000) * 3600000).toISOString()
      }
    }
    
    // Group events by time bucket
    const buckets = new Map<string, { added: number; moved: number; removed: number }>()
    
    recentEvents.forEach(event => {
      const key = getBucketKey(event._creationTime)
      
      const bucket = buckets.get(key) || { added: 0, moved: 0, removed: 0 }
      bucket[event.action as keyof typeof bucket]++
      buckets.set(key, bucket)
    })
    
    // Convert to array and sort
    const sorted = Array.from(buckets.entries())
      .map(([date, counts]) => ({
        date,
        ...counts
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
    
    // Limit the number of bars shown based on granularity
    const maxBars = granularity === "by-minute" ? 60 : granularity === "hourly" ? 24 : 7
    return sorted.slice(-maxBars)
  }, [recentEvents, granularity])

  const total = React.useMemo(() => {
    if (!recentEvents) return { added: 0, moved: 0, removed: 0 }
    
    return recentEvents.reduce((acc, event) => {
      acc[event.action as keyof typeof acc]++
      return acc
    }, { added: 0, moved: 0, removed: 0 })
  }, [recentEvents])

  if (!recentEvents) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={`py-0 ${className || ""}`}>
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
          <CardTitle>Selection Activity</CardTitle>
          <CardDescription>
            Topic ranking changes over the last {hours} hours
            {granularity === "by-minute" && " (by minute)"}
            {granularity === "hourly" && " (hourly)"}
            {granularity === "daily" && " (daily)"}
          </CardDescription>
        </div>
        <div className="flex">
          {(["added", "moved", "removed"] as const).map((key) => {
            return (
              <button
                key={key}
                data-active={activeChart === key}
                className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                onClick={() => setActiveChart(key)}
              >
                <span className="text-muted-foreground text-xs">
                  {chartConfig[key].label}
                </span>
                <span className="text-lg leading-none font-bold sm:text-3xl">
                  {total[key].toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
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
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                
                switch (granularity) {
                  case "by-minute":
                    return date.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  case "hourly":
                    const hoursDiff = (Date.now() - date.getTime()) / (1000 * 60 * 60)
                    if (hoursDiff < 24) {
                      return date.toLocaleTimeString("en-US", {
                        hour: "numeric",
                      })
                    }
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                    })
                  case "daily":
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  default:
                    return date.toLocaleTimeString("en-US", {
                      hour: "numeric",
                    })
                }
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="events"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  }}
                />
              }
            />
            <Bar dataKey={activeChart} fill={`var(--color-${activeChart})`} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
