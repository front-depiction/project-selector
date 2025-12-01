"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { useQuery } from "convex-helpers/react/cache/hooks"
import { api } from "@/convex/_generated/api"
import { useComputed } from "@preact/signals-react/runtime"
import { useRankingEventsChartVM } from "./RankingEventsChartVM"

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
  const recentEvents = useQuery(api.analytics.getRecentRankingEvents, { hours })
  const vm = useRankingEventsChartVM(recentEvents, granularity)

  const activeChart = useComputed(() => vm.activeChart$.value)
  const chartData = useComputed(() => vm.chartData$.value)
  const total = useComputed(() => vm.total$.value)

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
                data-active={activeChart.value === key}
                className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                onClick={() => vm.setActiveChart(key)}
              >
                <span className="text-muted-foreground text-xs">
                  {chartConfig[key].label}
                </span>
                <span className="text-lg leading-none font-bold sm:text-3xl">
                  {total.value[key].toLocaleString()}
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
            data={[...chartData.value]}
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
            <Bar dataKey={activeChart.value} fill={`var(--color-${activeChart.value})`} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
