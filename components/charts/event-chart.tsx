"use client"

import { Line, LineChart, Bar, BarChart, Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
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
import { useSignals } from "@preact/signals-react/runtime"
import { createEventChartVM } from "./EventChartVM"

export type ChartType = "line" | "bar" | "area"
export type TimeGranularity = "hour" | "day" | "week" | "month"

interface EventDataPoint {
  _creationTime: number
  [key: string]: any
}

interface EventChartProps {
  data: EventDataPoint[] | undefined
  title: string
  description?: string
  chartType?: ChartType
  valueKey?: string
  aggregateFunction?: "count" | "sum" | "average" | "min" | "max"
  groupBy?: TimeGranularity
  showTrend?: boolean
  height?: number
  color?: string
  loading?: boolean
  className?: string
  formatValue?: (value: number) => string
  additionalMetrics?: Record<string, number | string>
}

const getTimeFormat = (granularity: TimeGranularity, hoursDiff: number) => {
  if (granularity === "hour" || hoursDiff < 24) {
    return { hour: "numeric" as const, minute: "2-digit" as const }
  }
  if (granularity === "day" || hoursDiff < 168) {
    return { weekday: "short" as const, day: "numeric" as const }
  }
  if (granularity === "week" || hoursDiff < 720) {
    return { month: "short" as const, day: "numeric" as const }
  }
  return { month: "short" as const, year: "numeric" as const }
}

export function EventChart({
  data,
  title,
  description,
  chartType = "line",
  valueKey = "value",
  aggregateFunction = "count",
  groupBy = "hour",
  showTrend = true,
  height = 200,
  color = "var(--chart-1)",
  loading = false,
  className,
  formatValue,
  additionalMetrics
}: EventChartProps) {
  useSignals()
  const vm = createEventChartVM(data, valueKey, aggregateFunction, groupBy, showTrend)

  const chartConfig = {
    [valueKey]: {
      label: title,
      color: color,
    },
  } satisfies ChartConfig

  if (loading || !data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (vm.processedData$.value.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const hoursDiff = vm.processedData$.value.length > 0
    ? (new Date(vm.processedData$.value[vm.processedData$.value.length - 1].timestamp).getTime() -
       new Date(vm.processedData$.value[0].timestamp).getTime()) / (1000 * 60 * 60)
    : 0

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {showTrend && vm.trend$.value && (
            <div className="flex items-center gap-1 text-sm">
              {vm.trend$.value === "up" && (
                <>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Trending up</span>
                </>
              )}
              {vm.trend$.value === "down" && (
                <>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-red-600">Trending down</span>
                </>
              )}
              {vm.trend$.value === "stable" && (
                <>
                  <Minus className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Stable</span>
                </>
              )}
            </div>
          )}
        </div>
        {additionalMetrics && (
          <div className="flex gap-4 text-sm text-muted-foreground">
            {Object.entries(additionalMetrics).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium">{key}:</span> {value}
              </div>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className={`h-[${height}px] w-full`}>
          {chartType === "bar" ? (
            <BarChart
              data={[...vm.processedData$.value]}
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
                  return date.toLocaleTimeString("en-US", getTimeFormat(groupBy, hoursDiff))
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatValue}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit"
                      })
                    }}
                    formatter={(value) => formatValue ? formatValue(Number(value)) : value}
                  />
                }
              />
              <Bar
                dataKey={valueKey}
                fill={color}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : chartType === "area" ? (
            <AreaChart
              data={[...vm.processedData$.value]}
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
                  return date.toLocaleTimeString("en-US", getTimeFormat(groupBy, hoursDiff))
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatValue}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit"
                      })
                    }}
                    formatter={(value) => formatValue ? formatValue(Number(value)) : value}
                  />
                }
              />
              <Area
                dataKey={valueKey}
                fill={color}
                stroke={color}
                fillOpacity={0.3}
              />
            </AreaChart>
          ) : (
            <LineChart
              data={[...vm.processedData$.value]}
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
                  return date.toLocaleTimeString("en-US", getTimeFormat(groupBy, hoursDiff))
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatValue}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit"
                      })
                    }}
                    formatter={(value) => formatValue ? formatValue(Number(value)) : value}
                  />
                }
              />
              <Line
                dataKey={valueKey}
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}