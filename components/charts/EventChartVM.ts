"use client"
import { computed, ReadonlySignal } from "@preact/signals-react"

// ============================================================================
// View Model Types
// ============================================================================

export type TimeGranularity = "hour" | "day" | "week" | "month"
export type Trend = "up" | "down" | "stable"

export interface EventDataPoint {
  readonly _creationTime: number
  readonly [key: string]: any
}

export interface ProcessedDataPoint {
  readonly timestamp: string
  readonly count: number
  readonly value: number
  readonly [key: string]: any
}

export interface EventChartVM {
  // Reactive state - computed signals
  readonly processedData$: ReadonlySignal<readonly ProcessedDataPoint[]>
  readonly trend$: ReadonlySignal<Trend | null>
}

// ============================================================================
// Helper Functions
// ============================================================================

function getBucketKey(timestamp: number, granularity: TimeGranularity): string {
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

function aggregateData(
  events: readonly EventDataPoint[] | undefined,
  valueKey: string,
  aggregateFunction: string,
  granularity: TimeGranularity
): readonly ProcessedDataPoint[] {
  if (!events || events.length === 0) return []

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

function calculateTrend(data: readonly ProcessedDataPoint[]): Trend | null {
  if (data.length < 2) return null

  const recentCount = Math.min(7, Math.floor(data.length / 3))
  const recentData = data.slice(-recentCount)
  const olderData = data.slice(-recentCount * 2, -recentCount)

  if (olderData.length === 0) return null

  const recentAvg = recentData.reduce((sum, d) => sum + (d.value || 0), 0) / recentData.length
  const olderAvg = olderData.reduce((sum, d) => sum + (d.value || 0), 0) / olderData.length

  const percentChange = ((recentAvg - olderAvg) / (olderAvg || 1)) * 100

  if (Math.abs(percentChange) < 5) return "stable"
  return percentChange > 0 ? "up" : "down"
}

// ============================================================================
// Factory Function
// ============================================================================

export function createEventChartVM(
  data: readonly EventDataPoint[] | undefined,
  valueKey: string = "value",
  aggregateFunction: string = "count",
  groupBy: TimeGranularity = "hour",
  showTrend: boolean = true
): EventChartVM {
  // Computed signals for data processing
  const processedData$ = computed(() =>
    aggregateData(data, valueKey, aggregateFunction, groupBy)
  )

  const trend$ = computed(() => {
    if (!showTrend) return null
    const processedData = processedData$.value
    if (processedData.length === 0) return null
    return calculateTrend(processedData)
  })

  return {
    processedData$,
    trend$
  }
}
