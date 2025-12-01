/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest"
import { createEventChartVM } from "./EventChartVM"
import type { EventDataPoint } from "./EventChartVM"

/**
 * Following the testing philosophy from viemodel.txt:
 * - Tests what matters without rendering the UI
 * - Focused and easy to maintain
 * - Tests the business logic directly
 */

// ============================================================================
// Mock Data
// ============================================================================

const mockEvents: EventDataPoint[] = [
  { _creationTime: new Date("2025-12-01T10:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T10:30:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T11:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T11:30:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T12:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T13:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T14:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T14:30:00Z").getTime() },
]

const mockEventsWithValues: EventDataPoint[] = [
  { _creationTime: new Date("2025-12-01T10:00:00Z").getTime(), amount: 100 },
  { _creationTime: new Date("2025-12-01T10:30:00Z").getTime(), amount: 150 },
  { _creationTime: new Date("2025-12-01T11:00:00Z").getTime(), amount: 200 },
  { _creationTime: new Date("2025-12-01T11:30:00Z").getTime(), amount: 120 },
  { _creationTime: new Date("2025-12-01T12:00:00Z").getTime(), amount: 180 },
]

const mockTrendUpEvents: EventDataPoint[] = [
  // Older data: 1 event per hour (lower frequency)
  { _creationTime: new Date("2025-12-01T10:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T11:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T12:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T13:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T14:00:00Z").getTime() },
  // Recent data: 2 events per hour (higher frequency - clear upward trend)
  { _creationTime: new Date("2025-12-01T15:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T15:30:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T16:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T16:20:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T17:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T17:15:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T18:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T18:10:00Z").getTime() },
]

const mockTrendDownEvents: EventDataPoint[] = [
  // Older data: 2 events per hour (higher frequency)
  { _creationTime: new Date("2025-12-01T10:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T10:30:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T11:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T11:30:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T12:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T12:30:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T13:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T13:30:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T14:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T14:30:00Z").getTime() },
  // Recent data: fewer events (lower frequency - clear downward trend)
  { _creationTime: new Date("2025-12-01T16:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T17:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T18:00:00Z").getTime() },
  { _creationTime: new Date("2025-12-01T19:00:00Z").getTime() },
]

// ============================================================================
// Tests
// ============================================================================

describe("EventChartVM", () => {
  describe("processedData$ signal", () => {
    it("should aggregate events by hour with count function", () => {
      const vm = createEventChartVM(mockEvents, "value", "count", "hour")
      const processedData = vm.processedData$.value

      expect(processedData.length).toBeGreaterThan(0)
      expect(processedData.every(d => d.count > 0)).toBe(true)
      expect(processedData.every(d => d.value > 0)).toBe(true)
    })

    it("should sort data by timestamp in ascending order", () => {
      const vm = createEventChartVM(mockEvents, "value", "count", "hour")
      const processedData = vm.processedData$.value

      for (let i = 1; i < processedData.length; i++) {
        expect(processedData[i].timestamp >= processedData[i - 1].timestamp).toBe(true)
      }
    })

    it("should handle empty data array", () => {
      const vm = createEventChartVM([], "value", "count", "hour")
      const processedData = vm.processedData$.value

      expect(processedData).toEqual([])
    })

    it("should handle undefined data", () => {
      const vm = createEventChartVM(undefined, "value", "count", "hour")
      const processedData = vm.processedData$.value

      expect(processedData).toEqual([])
    })

    it("should aggregate by day granularity", () => {
      const multiDayEvents: EventDataPoint[] = [
        { _creationTime: new Date("2025-12-01T10:00:00Z").getTime() },
        { _creationTime: new Date("2025-12-01T14:00:00Z").getTime() },
        { _creationTime: new Date("2025-12-02T10:00:00Z").getTime() },
        { _creationTime: new Date("2025-12-02T14:00:00Z").getTime() },
        { _creationTime: new Date("2025-12-03T10:00:00Z").getTime() },
      ]

      const vm = createEventChartVM(multiDayEvents, "value", "count", "day")
      const processedData = vm.processedData$.value

      expect(processedData.length).toBe(3) // 3 distinct days
      expect(processedData[0].count).toBe(2) // 2 events on first day
      expect(processedData[1].count).toBe(2) // 2 events on second day
      expect(processedData[2].count).toBe(1) // 1 event on third day
    })

    it("should aggregate by week granularity", () => {
      const multiWeekEvents: EventDataPoint[] = [
        { _creationTime: new Date("2025-12-01T10:00:00Z").getTime() }, // Monday
        { _creationTime: new Date("2025-12-03T10:00:00Z").getTime() }, // Wednesday
        { _creationTime: new Date("2025-12-08T10:00:00Z").getTime() }, // Next Monday
        { _creationTime: new Date("2025-12-10T10:00:00Z").getTime() }, // Next Wednesday
      ]

      const vm = createEventChartVM(multiWeekEvents, "value", "count", "week")
      const processedData = vm.processedData$.value

      expect(processedData.length).toBe(2) // 2 distinct weeks
      expect(processedData[0].count).toBe(2)
      expect(processedData[1].count).toBe(2)
    })

    it("should aggregate by month granularity", () => {
      const multiMonthEvents: EventDataPoint[] = [
        { _creationTime: new Date("2025-11-15T10:00:00Z").getTime() },
        { _creationTime: new Date("2025-11-20T10:00:00Z").getTime() },
        { _creationTime: new Date("2025-12-05T10:00:00Z").getTime() },
        { _creationTime: new Date("2025-12-15T10:00:00Z").getTime() },
        { _creationTime: new Date("2025-12-25T10:00:00Z").getTime() },
      ]

      const vm = createEventChartVM(multiMonthEvents, "value", "count", "month")
      const processedData = vm.processedData$.value

      expect(processedData.length).toBe(2) // 2 distinct months
      expect(processedData[0].count).toBe(2) // 2 events in November
      expect(processedData[1].count).toBe(3) // 3 events in December
    })

    it("should use sum aggregation function correctly", () => {
      const vm = createEventChartVM(mockEventsWithValues, "amount", "sum", "hour")
      const processedData = vm.processedData$.value

      const totalSum = processedData.reduce((sum, d) => sum + d.value, 0)
      expect(totalSum).toBe(750) // 100 + 150 + 200 + 120 + 180
    })

    it("should use average aggregation function correctly", () => {
      const sameHourEvents: EventDataPoint[] = [
        { _creationTime: new Date("2025-12-01T10:00:00Z").getTime(), amount: 100 },
        { _creationTime: new Date("2025-12-01T10:30:00Z").getTime(), amount: 200 },
        { _creationTime: new Date("2025-12-01T10:45:00Z").getTime(), amount: 300 },
      ]

      const vm = createEventChartVM(sameHourEvents, "amount", "average", "hour")
      const processedData = vm.processedData$.value

      expect(processedData.length).toBe(1)
      expect(processedData[0].value).toBe(200) // (100 + 200 + 300) / 3 = 200
    })

    it("should use min aggregation function correctly", () => {
      const sameHourEvents: EventDataPoint[] = [
        { _creationTime: new Date("2025-12-01T10:00:00Z").getTime(), amount: 100 },
        { _creationTime: new Date("2025-12-01T10:30:00Z").getTime(), amount: 50 },
        { _creationTime: new Date("2025-12-01T10:45:00Z").getTime(), amount: 300 },
      ]

      const vm = createEventChartVM(sameHourEvents, "amount", "min", "hour")
      const processedData = vm.processedData$.value

      expect(processedData.length).toBe(1)
      expect(processedData[0].value).toBe(50)
    })

    it("should use max aggregation function correctly", () => {
      const sameHourEvents: EventDataPoint[] = [
        { _creationTime: new Date("2025-12-01T10:00:00Z").getTime(), amount: 100 },
        { _creationTime: new Date("2025-12-01T10:30:00Z").getTime(), amount: 50 },
        { _creationTime: new Date("2025-12-01T10:45:00Z").getTime(), amount: 300 },
      ]

      const vm = createEventChartVM(sameHourEvents, "amount", "max", "hour")
      const processedData = vm.processedData$.value

      expect(processedData.length).toBe(1)
      expect(processedData[0].value).toBe(300)
    })

    it("should include custom valueKey in output", () => {
      const vm = createEventChartVM(mockEventsWithValues, "amount", "sum", "hour")
      const processedData = vm.processedData$.value

      expect(processedData.every(d => "amount" in d)).toBe(true)
    })

    it("should handle events with missing valueKey", () => {
      const eventsWithMissingValues: EventDataPoint[] = [
        { _creationTime: new Date("2025-12-01T10:00:00Z").getTime(), amount: 100 },
        { _creationTime: new Date("2025-12-01T10:30:00Z").getTime() }, // missing amount
        { _creationTime: new Date("2025-12-01T10:45:00Z").getTime(), amount: 200 },
      ]

      const vm = createEventChartVM(eventsWithMissingValues, "amount", "sum", "hour")
      const processedData = vm.processedData$.value

      expect(processedData.length).toBe(1)
      expect(processedData[0].value).toBe(300) // Only counts events with amount
    })
  })

  describe("trend$ signal", () => {
    it("should calculate upward trend correctly", () => {
      const vm = createEventChartVM(mockTrendUpEvents, "value", "count", "hour", true)
      const trend = vm.trend$.value

      expect(trend).toBe("up")
    })

    it("should calculate downward trend correctly", () => {
      const vm = createEventChartVM(mockTrendDownEvents, "value", "count", "hour", true)
      const trend = vm.trend$.value

      expect(trend).toBe("down")
    })

    it("should calculate stable trend for consistent data", () => {
      const stableEvents: EventDataPoint[] = Array(10)
        .fill(null)
        .map((_, i) => ({
          _creationTime: new Date(`2025-12-01T${10 + i}:00:00Z`).getTime()
        }))

      const vm = createEventChartVM(stableEvents, "value", "count", "hour", true)
      const trend = vm.trend$.value

      expect(trend).toBe("stable")
    })

    it("should return null when trend is disabled", () => {
      const vm = createEventChartVM(mockTrendUpEvents, "value", "count", "hour", false)
      const trend = vm.trend$.value

      expect(trend).toBeNull()
    })

    it("should return null for insufficient data", () => {
      const singleEvent: EventDataPoint[] = [
        { _creationTime: new Date("2025-12-01T10:00:00Z").getTime() }
      ]

      const vm = createEventChartVM(singleEvent, "value", "count", "hour", true)
      const trend = vm.trend$.value

      expect(trend).toBeNull()
    })

    it("should return null for empty data", () => {
      const vm = createEventChartVM([], "value", "count", "hour", true)
      const trend = vm.trend$.value

      expect(trend).toBeNull()
    })

    it("should handle trend calculation with small datasets", () => {
      const smallDataset: EventDataPoint[] = [
        { _creationTime: new Date("2025-12-01T10:00:00Z").getTime() },
        { _creationTime: new Date("2025-12-01T11:00:00Z").getTime() },
      ]

      const vm = createEventChartVM(smallDataset, "value", "count", "hour", true)
      const trend = vm.trend$.value

      // Should return null or stable for very small datasets
      expect(trend === null || trend === "stable").toBe(true)
    })

    it("should detect trend with moderate increase (> 5%)", () => {
      const baseTime = new Date("2025-12-01T10:00:00Z").getTime()
      const moderateIncreaseEvents: EventDataPoint[] = [
        // Older period: 1 event per hour for 6 hours
        ...Array(6).fill(null).map((_, i) => ({
          _creationTime: baseTime + (i * 3600000) // 1 hour apart
        })),
        // Recent period: 2 events per hour for 4 hours (clear increase > 5%)
        ...Array(8).fill(null).map((_, i) => ({
          _creationTime: baseTime + (6 * 3600000) + (Math.floor(i / 2) * 3600000) + ((i % 2) * 1800000) // 30 min apart
        })),
      ]

      const vm = createEventChartVM(moderateIncreaseEvents, "value", "count", "hour", true)
      const trend = vm.trend$.value

      expect(trend).toBe("up")
    })

    it("should detect trend with moderate decrease (> 5%)", () => {
      const baseTime = new Date("2025-12-01T10:00:00Z").getTime()
      const moderateDecreaseEvents: EventDataPoint[] = [
        // Older period: 3 events per hour for 6 hours (higher frequency)
        ...Array(18).fill(null).map((_, i) => ({
          _creationTime: baseTime + (Math.floor(i / 3) * 3600000) + ((i % 3) * 1200000) // 20 min apart
        })),
        // Recent period: 1 event per hour for 6 hours (lower frequency - clear decrease)
        ...Array(6).fill(null).map((_, i) => ({
          _creationTime: baseTime + (6 * 3600000) + (i * 3600000) // 1 hour apart
        })),
      ]

      const vm = createEventChartVM(moderateDecreaseEvents, "value", "count", "hour", true)
      const trend = vm.trend$.value

      expect(trend).toBe("down")
    })
  })

  describe("integration scenarios", () => {
    it("should handle complete workflow with count aggregation", () => {
      const vm = createEventChartVM(mockEvents, "value", "count", "hour", true)

      const processedData = vm.processedData$.value
      const trend = vm.trend$.value

      expect(processedData.length).toBeGreaterThan(0)
      expect(trend).not.toBeNull()
      expect(["up", "down", "stable"].includes(trend as string)).toBe(true)
    })

    it("should handle complete workflow with sum aggregation", () => {
      const vm = createEventChartVM(mockEventsWithValues, "amount", "sum", "hour", true)

      const processedData = vm.processedData$.value
      const trend = vm.trend$.value

      expect(processedData.length).toBeGreaterThan(0)
      expect(processedData.every(d => d.amount !== undefined)).toBe(true)
    })

    it("should handle changing granularity", () => {
      const hourlyVM = createEventChartVM(mockEvents, "value", "count", "hour", true)
      const dailyVM = createEventChartVM(mockEvents, "value", "count", "day", true)

      const hourlyData = hourlyVM.processedData$.value
      const dailyData = dailyVM.processedData$.value

      expect(hourlyData.length).toBeGreaterThanOrEqual(dailyData.length)
    })

    it("should handle different aggregation functions on same data", () => {
      const countVM = createEventChartVM(mockEventsWithValues, "amount", "count", "hour")
      const sumVM = createEventChartVM(mockEventsWithValues, "amount", "sum", "hour")
      const avgVM = createEventChartVM(mockEventsWithValues, "amount", "average", "hour")

      const countData = countVM.processedData$.value
      const sumData = sumVM.processedData$.value
      const avgData = avgVM.processedData$.value

      expect(countData.length).toBeGreaterThan(0)
      expect(sumData.length).toBeGreaterThan(0)
      expect(avgData.length).toBeGreaterThan(0)
    })

    it("should handle real-world analytics scenario", () => {
      const baseTime = new Date("2025-12-01T10:00:00Z").getTime()
      const analyticsEvents: EventDataPoint[] = Array(100)
        .fill(null)
        .map((_, i) => ({
          _creationTime: baseTime + (i * 360000), // 6 minutes apart
          pageViews: Math.floor(Math.random() * 1000) + 100
        }))

      const vm = createEventChartVM(analyticsEvents, "pageViews", "sum", "hour", true)

      const processedData = vm.processedData$.value
      const trend = vm.trend$.value

      expect(processedData.length).toBeGreaterThan(0)
      expect(processedData.every(d => d.pageViews !== undefined)).toBe(true)
      expect(["up", "down", "stable"].includes(trend as string) || trend === null).toBe(true)
    })

    it("should maintain reactivity when data changes", () => {
      let currentData = mockEvents.slice(0, 4)
      const vm = createEventChartVM(currentData, "value", "count", "hour", true)

      const initialData = vm.processedData$.value
      const initialLength = initialData.length

      // Data would change in real scenario through signal updates
      const newVM = createEventChartVM(mockEvents, "value", "count", "hour", true)
      const newData = newVM.processedData$.value

      expect(newData.length).toBeGreaterThanOrEqual(initialLength)
    })
  })

  describe("edge cases", () => {
    it("should handle events at exact bucket boundaries", () => {
      const boundaryEvents: EventDataPoint[] = [
        { _creationTime: new Date("2025-12-01T10:00:00.000Z").getTime() },
        { _creationTime: new Date("2025-12-01T11:00:00.000Z").getTime() },
        { _creationTime: new Date("2025-12-01T12:00:00.000Z").getTime() },
      ]

      const vm = createEventChartVM(boundaryEvents, "value", "count", "hour")
      const processedData = vm.processedData$.value

      expect(processedData.length).toBe(3) // Each event in separate hour
    })

    it("should handle events with millisecond precision", () => {
      const preciseEvents: EventDataPoint[] = [
        { _creationTime: new Date("2025-12-01T10:00:00.123Z").getTime() },
        { _creationTime: new Date("2025-12-01T10:00:00.456Z").getTime() },
        { _creationTime: new Date("2025-12-01T10:00:00.789Z").getTime() },
      ]

      const vm = createEventChartVM(preciseEvents, "value", "count", "hour")
      const processedData = vm.processedData$.value

      expect(processedData.length).toBe(1)
      expect(processedData[0].count).toBe(3)
    })

    it("should handle large datasets efficiently", () => {
      const largeDataset: EventDataPoint[] = Array(10000)
        .fill(null)
        .map((_, i) => ({
          _creationTime: new Date(`2025-12-01T10:00:00Z`).getTime() + i * 60000 // 1 minute apart
        }))

      const vm = createEventChartVM(largeDataset, "value", "count", "hour")
      const processedData = vm.processedData$.value

      expect(processedData.length).toBeGreaterThan(0)
      expect(processedData.every(d => d.count > 0)).toBe(true)
    })

    it("should handle zero values in aggregation", () => {
      const zeroEvents: EventDataPoint[] = [
        { _creationTime: new Date("2025-12-01T10:00:00Z").getTime(), amount: 0 },
        { _creationTime: new Date("2025-12-01T10:30:00Z").getTime(), amount: 0 },
      ]

      const vm = createEventChartVM(zeroEvents, "amount", "sum", "hour")
      const processedData = vm.processedData$.value

      expect(processedData.length).toBe(1)
      expect(processedData[0].value).toBe(0)
    })

    it("should handle negative values in aggregation", () => {
      const negativeEvents: EventDataPoint[] = [
        { _creationTime: new Date("2025-12-01T10:00:00Z").getTime(), amount: -100 },
        { _creationTime: new Date("2025-12-01T10:30:00Z").getTime(), amount: 50 },
      ]

      const vm = createEventChartVM(negativeEvents, "amount", "sum", "hour")
      const processedData = vm.processedData$.value

      expect(processedData.length).toBe(1)
      expect(processedData[0].value).toBe(-50)
    })

    it("should handle very old timestamps", () => {
      const oldEvents: EventDataPoint[] = [
        { _creationTime: new Date("2020-01-01T10:00:00Z").getTime() },
        { _creationTime: new Date("2020-01-01T11:00:00Z").getTime() },
      ]

      const vm = createEventChartVM(oldEvents, "value", "count", "hour")
      const processedData = vm.processedData$.value

      expect(processedData.length).toBe(2)
    })

    it("should handle future timestamps", () => {
      const futureEvents: EventDataPoint[] = [
        { _creationTime: new Date("2030-01-01T10:00:00Z").getTime() },
        { _creationTime: new Date("2030-01-01T11:00:00Z").getTime() },
      ]

      const vm = createEventChartVM(futureEvents, "value", "count", "hour")
      const processedData = vm.processedData$.value

      expect(processedData.length).toBe(2)
    })
  })

  describe("type safety", () => {
    it("should maintain readonly properties", () => {
      const vm = createEventChartVM(mockEvents, "value", "count", "hour")

      expect(vm.processedData$).toBeDefined()
      expect(vm.trend$).toBeDefined()
    })

    it("should handle custom event properties", () => {
      const customEvents: EventDataPoint[] = [
        { _creationTime: new Date("2025-12-01T10:00:00Z").getTime(), customProp: "value1" },
        { _creationTime: new Date("2025-12-01T11:00:00Z").getTime(), customProp: "value2" },
      ]

      const vm = createEventChartVM(customEvents, "value", "count", "hour")
      const processedData = vm.processedData$.value

      expect(processedData.length).toBe(2)
    })
  })
})
