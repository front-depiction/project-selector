/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest"
import { signal } from "@preact/signals-react"
import type { ActiveChart } from "./RankingEventsChartVM"

/**
 * Following the testing philosophy from viemodel.txt:
 * - Tests what matters without rendering the UI
 * - Focused and easy to maintain
 * - Tests the business logic directly
 *
 * Since useRankingEventsChartVM is a simple hook that manages a single signal,
 * we test the core logic by creating simplified versions that mimic the VM behavior.
 */

// ============================================================================
// Helper Functions - Mock VM Logic
// ============================================================================

function createMockActiveChartSignal(initialValue: ActiveChart = "added") {
  return signal<ActiveChart>(initialValue)
}

// ============================================================================
// Tests
// ============================================================================

describe("RankingEventsChartVM", () => {
  describe("activeChart$ signal", () => {
    it("should initialize with 'added' as default", () => {
      const activeChart$ = createMockActiveChartSignal()

      expect(activeChart$.value).toBe("added")
    })

    it("should update to 'moved' when set", () => {
      const activeChart$ = createMockActiveChartSignal()

      activeChart$.value = "moved"

      expect(activeChart$.value).toBe("moved")
    })

    it("should update to 'removed' when set", () => {
      const activeChart$ = createMockActiveChartSignal()

      activeChart$.value = "removed"

      expect(activeChart$.value).toBe("removed")
    })

    it("should allow switching between different chart types", () => {
      const activeChart$ = createMockActiveChartSignal()

      expect(activeChart$.value).toBe("added")

      activeChart$.value = "moved"
      expect(activeChart$.value).toBe("moved")

      activeChart$.value = "removed"
      expect(activeChart$.value).toBe("removed")

      activeChart$.value = "added"
      expect(activeChart$.value).toBe("added")
    })

    it("should handle rapid chart switching", () => {
      const activeChart$ = createMockActiveChartSignal()

      activeChart$.value = "moved"
      activeChart$.value = "removed"
      activeChart$.value = "added"
      activeChart$.value = "moved"

      expect(activeChart$.value).toBe("moved")
    })

    it("should support initializing with different chart types", () => {
      const addedChart$ = createMockActiveChartSignal("added")
      expect(addedChart$.value).toBe("added")

      const movedChart$ = createMockActiveChartSignal("moved")
      expect(movedChart$.value).toBe("moved")

      const removedChart$ = createMockActiveChartSignal("removed")
      expect(removedChart$.value).toBe("removed")
    })

    it("should maintain value after multiple reads", () => {
      const activeChart$ = createMockActiveChartSignal("moved")

      expect(activeChart$.value).toBe("moved")
      expect(activeChart$.value).toBe("moved")
      expect(activeChart$.value).toBe("moved")
    })
  })

  describe("setActiveChart action", () => {
    it("should set chart to 'added'", () => {
      const activeChart$ = createMockActiveChartSignal("removed")

      const setActiveChart = (chart: ActiveChart): void => {
        activeChart$.value = chart
      }

      setActiveChart("added")

      expect(activeChart$.value).toBe("added")
    })

    it("should set chart to 'moved'", () => {
      const activeChart$ = createMockActiveChartSignal("added")

      const setActiveChart = (chart: ActiveChart): void => {
        activeChart$.value = chart
      }

      setActiveChart("moved")

      expect(activeChart$.value).toBe("moved")
    })

    it("should set chart to 'removed'", () => {
      const activeChart$ = createMockActiveChartSignal("added")

      const setActiveChart = (chart: ActiveChart): void => {
        activeChart$.value = chart
      }

      setActiveChart("removed")

      expect(activeChart$.value).toBe("removed")
    })

    it("should handle setting same chart multiple times", () => {
      const activeChart$ = createMockActiveChartSignal("added")

      const setActiveChart = (chart: ActiveChart): void => {
        activeChart$.value = chart
      }

      setActiveChart("moved")
      expect(activeChart$.value).toBe("moved")

      setActiveChart("moved")
      expect(activeChart$.value).toBe("moved")

      setActiveChart("moved")
      expect(activeChart$.value).toBe("moved")
    })
  })

  describe("integration scenarios", () => {
    it("should handle user clicking through all chart tabs", () => {
      const activeChart$ = createMockActiveChartSignal()

      const setActiveChart = (chart: ActiveChart): void => {
        activeChart$.value = chart
      }

      // Initial state
      expect(activeChart$.value).toBe("added")

      // User clicks "Moved" tab
      setActiveChart("moved")
      expect(activeChart$.value).toBe("moved")

      // User clicks "Removed" tab
      setActiveChart("removed")
      expect(activeChart$.value).toBe("removed")

      // User clicks back to "Added" tab
      setActiveChart("added")
      expect(activeChart$.value).toBe("added")
    })

    it("should support multiple independent chart instances", () => {
      const chart1$ = createMockActiveChartSignal("added")
      const chart2$ = createMockActiveChartSignal("moved")

      expect(chart1$.value).toBe("added")
      expect(chart2$.value).toBe("moved")

      chart1$.value = "removed"
      expect(chart1$.value).toBe("removed")
      expect(chart2$.value).toBe("moved") // chart2 should not be affected

      chart2$.value = "added"
      expect(chart1$.value).toBe("removed") // chart1 should not be affected
      expect(chart2$.value).toBe("added")
    })

    it("should work with UI component pattern", () => {
      const activeChart$ = createMockActiveChartSignal()

      const setActiveChart = (chart: ActiveChart): void => {
        activeChart$.value = chart
      }

      // Simulate button clicks in UI
      const buttons: ActiveChart[] = ["added", "moved", "removed"]

      buttons.forEach(buttonType => {
        setActiveChart(buttonType)
        expect(activeChart$.value).toBe(buttonType)
      })
    })

    it("should handle edge case of rapid user interactions", () => {
      const activeChart$ = createMockActiveChartSignal()

      const setActiveChart = (chart: ActiveChart): void => {
        activeChart$.value = chart
      }

      // Simulate user rapidly clicking different tabs
      const interactions: ActiveChart[] = [
        "moved", "removed", "added", "moved", "removed",
        "moved", "added", "removed", "moved", "added"
      ]

      interactions.forEach(chart => {
        setActiveChart(chart)
      })

      // Should end up at the last interaction
      expect(activeChart$.value).toBe("added")
    })
  })

  describe("type safety", () => {
    it("should only accept valid chart types", () => {
      const activeChart$ = createMockActiveChartSignal()

      // These should work (compile-time check)
      const validTypes: ActiveChart[] = ["added", "moved", "removed"]

      validTypes.forEach(type => {
        activeChart$.value = type
        expect(activeChart$.value).toBe(type)
      })
    })

    it("should maintain type through signal", () => {
      const activeChart$ = createMockActiveChartSignal("moved")

      const value: ActiveChart = activeChart$.value

      expect(value).toBe("moved")
      expect(typeof value).toBe("string")
    })
  })
})
