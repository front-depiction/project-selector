"use client"
import { signal, computed, ReadonlySignal } from "@preact/signals-react"

// ============================================================================
// View Model Types
// ============================================================================

export type ActiveChart = "added" | "moved" | "removed"
export type TimeGranularity = "by-minute" | "hourly" | "daily"

export interface ChartDataPoint {
  readonly date: string
  readonly added: number
  readonly moved: number
  readonly removed: number
}

export interface ChartTotal {
  readonly added: number
  readonly moved: number
  readonly removed: number
}

export interface RankingEvent {
  readonly _creationTime: number
  readonly action: string
}

export interface RankingEventsChartVM {
  // Reactive state
  readonly activeChart$: ReadonlySignal<ActiveChart>
  readonly chartData$: ReadonlySignal<readonly ChartDataPoint[]>
  readonly total$: ReadonlySignal<ChartTotal>

  // Actions
  readonly setActiveChart: (chart: ActiveChart) => void
}

// ============================================================================
// Helper Functions
// ============================================================================

function getBucketKey(timestamp: number, granularity: TimeGranularity): string {
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

function processEventsIntoChartData(
  events: readonly RankingEvent[] | undefined,
  granularity: TimeGranularity
): readonly ChartDataPoint[] {
  if (!events) return []

  // Group events by time bucket
  const buckets = new Map<string, { added: number; moved: number; removed: number }>()

  events.forEach(event => {
    const key = getBucketKey(event._creationTime, granularity)

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
}

function calculateTotal(events: readonly RankingEvent[] | undefined): ChartTotal {
  if (!events) return { added: 0, moved: 0, removed: 0 }

  return events.reduce((acc, event) => {
    acc[event.action as keyof typeof acc]++
    return acc
  }, { added: 0, moved: 0, removed: 0 })
}

// ============================================================================
// Hook
// ============================================================================

export function useRankingEventsChartVM(
  recentEvents: readonly RankingEvent[] | undefined,
  granularity: TimeGranularity = "hourly"
): RankingEventsChartVM {
  // Active chart state - initialize with "added"
  const activeChart$ = signal<ActiveChart>("added")

  // Computed signals for chart data processing
  const chartData$ = computed(() =>
    processEventsIntoChartData(recentEvents, granularity)
  )

  const total$ = computed(() =>
    calculateTotal(recentEvents)
  )

  // ============================================================================
  // Actions
  // ============================================================================

  const setActiveChart = (chart: ActiveChart): void => {
    activeChart$.value = chart
  }

  return {
    activeChart$,
    chartData$,
    total$,
    setActiveChart
  }
}
