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
import { useMemo } from "react"

export type ChartType = "line" | "bar" | "area"
export type TimeGranularity = "hour" | "day" | "week" | "month"

interface EventDataPoint {
  _creationTime: number
  [key: string]: any
}

interface ProcessedDataPoint {
  timestamp: string
  count: number
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

const getBucketKey = (timestamp: number, granularity: TimeGranularity): string => {
  const date = new Date(timestamp)
  switch (granularity) {
    case "hour":
      return new Date(Math.floor(timestamp / 3600000) * 3600000).toISOString()
    case "day":
      date.setHours(0, 0, 0, 0)
      return date.toISOString()
    case "week":
      const dayOfWeek = date.getDay()
      const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      date.setDate(diff)
      date.setHours(0, 0, 0, 0)
      return date.toISOString()
    case "month":
      date.setDate(1)
      date.setHours(0, 0, 0, 0)
      return date.toISOString()
    default:
      return new Date(Math.floor(timestamp / 60000) * 60000).toISOString()
  }
}

const aggregateData = (
  events: EventDataPoint[],
  valueKey: string,
  aggregateFunction: string,
  granularity: TimeGranularity
): ProcessedDataPoint[] => {
  const buckets = new Map<string, number[]>()

  events.forEach(event => {
    const bucketKey = getBucketKey(event._creationTime, granularity)
    const values = buckets.get(bucketKey) || []
    
    if (aggregateFunction === "count") {
      values.push(1)
    } else if (valueKey && event[valueKey] !== undefined) {
      values.push(Number(event[valueKey]))
    }
    
    buckets.set(bucketKey, values)
  })

  return Array.from(buckets.entries()).map(([timestamp, values]) => {
    let value = 0
    
    switch (aggregateFunction) {
      case "count":
        value = values.length
        break
      case "sum":
        value = values.reduce((a, b) => a + b, 0)
        break
      case "average":
        value = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
        break
      case "min":
        value = values.length > 0 ? Math.min(...values) : 0
        break
      case "max":
        value = values.length > 0 ? Math.max(...values) : 0
        break
      default:
        value = values.length
    }

    return {
      timestamp,
      count: values.length,
      value,
      [valueKey || "value"]: value
    }
  }).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

const calculateTrend = (data: ProcessedDataPoint[]): "up" | "down" | "stable" => {
  if (data.length < 2) return "stable"
  
  const recentCount = Math.min(7, Math.floor(data.length / 3))
  const recentData = data.slice(-recentCount)
  const olderData = data.slice(-recentCount * 2, -recentCount)
  
  if (olderData.length === 0) return "stable"
  
  const recentAvg = recentData.reduce((sum, d) => sum + (d.value || 0), 0) / recentData.length
  const olderAvg = olderData.reduce((sum, d) => sum + (d.value || 0), 0) / olderData.length
  
  const percentChange = ((recentAvg - olderAvg) / (olderAvg || 1)) * 100
  
  if (Math.abs(percentChange) < 5) return "stable"
  return percentChange > 0 ? "up" : "down"
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
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return []
    return aggregateData(data, valueKey, aggregateFunction, groupBy)
  }, [data, valueKey, aggregateFunction, groupBy])

  const trend = useMemo(() => {
    if (!showTrend || processedData.length === 0) return null
    return calculateTrend(processedData)
  }, [processedData, showTrend])

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

  if (processedData.length === 0) {
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

  const hoursDiff = processedData.length > 0 
    ? (new Date(processedData[processedData.length - 1].timestamp).getTime() - 
       new Date(processedData[0].timestamp).getTime()) / (1000 * 60 * 60)
    : 0

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {showTrend && trend && (
            <div className="flex items-center gap-1 text-sm">
              {trend === "up" && (
                <>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Trending up</span>
                </>
              )}
              {trend === "down" && (
                <>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-red-600">Trending down</span>
                </>
              )}
              {trend === "stable" && (
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
              data={processedData}
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
              data={processedData}
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
              data={processedData}
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