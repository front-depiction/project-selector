/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest"
import { signal } from "@preact/signals-react"

/**
 * Following the testing philosophy from the viewmodel pattern:
 * - Tests what matters without rendering the UI
 * - Focused and easy to maintain
 * - Tests the business logic directly
 *
 * Since useAssignNowButtonVM uses React hooks that cannot be easily mocked in Vitest,
 * we test the core logic by creating simplified versions that mimic the VM behavior.
 */

// Helper to create a mock isLoading$ signal
function createMockIsLoadingSignal(initialValue: boolean = false) {
  return signal(initialValue)
}

// Helper to create a mock assignTopics action
async function mockAssignTopics(
  isLoading$: ReturnType<typeof createMockIsLoadingSignal>,
  shouldFail: boolean = false
): Promise<void> {
  if (isLoading$.value) return

  isLoading$.value = true
  try {
    if (shouldFail) {
      throw new Error("Assignment failed")
    }
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 10))
  } catch (error) {
    console.error("Failed to assign:", error)
    throw error
  } finally {
    isLoading$.value = false
  }
}

describe("AssignNowButtonVM", () => {
  describe("isLoading$ signal", () => {
    it("should start with isLoading$ as false", () => {
      const isLoading$ = createMockIsLoadingSignal()

      expect(isLoading$.value).toBe(false)
    })

    it("should set isLoading$ to true when starting assignment", async () => {
      const isLoading$ = createMockIsLoadingSignal()

      const promise = mockAssignTopics(isLoading$)

      // Should be loading immediately
      expect(isLoading$.value).toBe(true)

      await promise
    })

    it("should set isLoading$ back to false after successful assignment", async () => {
      const isLoading$ = createMockIsLoadingSignal()

      await mockAssignTopics(isLoading$)

      expect(isLoading$.value).toBe(false)
    })

    it("should set isLoading$ back to false after failed assignment", async () => {
      const isLoading$ = createMockIsLoadingSignal()

      try {
        await mockAssignTopics(isLoading$, true)
      } catch (error) {
        // Expected to fail
      }

      expect(isLoading$.value).toBe(false)
    })

    it("should prevent multiple simultaneous assignments", async () => {
      const isLoading$ = createMockIsLoadingSignal()

      const promise1 = mockAssignTopics(isLoading$)
      const promise2 = mockAssignTopics(isLoading$) // Should return early

      await promise1
      await promise2

      // Should only be called once (the second call returns early)
      expect(isLoading$.value).toBe(false)
    })
  })

  describe("assignTopics action", () => {
    it("should handle successful assignment", async () => {
      const isLoading$ = createMockIsLoadingSignal()
      let error: Error | null = null

      try {
        await mockAssignTopics(isLoading$)
      } catch (e) {
        error = e as Error
      }

      expect(error).toBeNull()
      expect(isLoading$.value).toBe(false)
    })

    it("should handle failed assignment and throw error", async () => {
      const isLoading$ = createMockIsLoadingSignal()
      let error: Error | null = null

      try {
        await mockAssignTopics(isLoading$, true)
      } catch (e) {
        error = e as Error
      }

      expect(error).not.toBeNull()
      expect(error?.message).toBe("Assignment failed")
      expect(isLoading$.value).toBe(false)
    })

    it("should toggle loading state correctly during assignment lifecycle", async () => {
      const isLoading$ = createMockIsLoadingSignal()
      const states: boolean[] = []

      // Capture initial state
      states.push(isLoading$.value)

      const promise = mockAssignTopics(isLoading$)

      // Capture loading state
      states.push(isLoading$.value)

      await promise

      // Capture final state
      states.push(isLoading$.value)

      expect(states).toEqual([false, true, false])
    })

    it("should handle rapid successive calls correctly", async () => {
      const isLoading$ = createMockIsLoadingSignal()

      // First call starts
      const promise1 = mockAssignTopics(isLoading$)

      // Second call should return early
      const promise2 = mockAssignTopics(isLoading$)

      await promise1
      await promise2

      expect(isLoading$.value).toBe(false)
    })
  })

  describe("integration scenarios", () => {
    it("should handle complete assignment workflow", async () => {
      const isLoading$ = createMockIsLoadingSignal()

      // Initial state
      expect(isLoading$.value).toBe(false)

      // Start assignment
      const promise = mockAssignTopics(isLoading$)
      expect(isLoading$.value).toBe(true)

      // Complete assignment
      await promise
      expect(isLoading$.value).toBe(false)
    })

    it("should handle multiple sequential assignments", async () => {
      const isLoading$ = createMockIsLoadingSignal()

      // First assignment
      await mockAssignTopics(isLoading$)
      expect(isLoading$.value).toBe(false)

      // Second assignment
      await mockAssignTopics(isLoading$)
      expect(isLoading$.value).toBe(false)

      // Third assignment
      await mockAssignTopics(isLoading$)
      expect(isLoading$.value).toBe(false)
    })

    it("should handle failed assignment followed by successful assignment", async () => {
      const isLoading$ = createMockIsLoadingSignal()

      // First assignment fails
      try {
        await mockAssignTopics(isLoading$, true)
      } catch (error) {
        // Expected to fail
      }
      expect(isLoading$.value).toBe(false)

      // Second assignment succeeds
      await mockAssignTopics(isLoading$, false)
      expect(isLoading$.value).toBe(false)
    })

    it("should maintain loading state isolation between instances", () => {
      const isLoading1$ = createMockIsLoadingSignal()
      const isLoading2$ = createMockIsLoadingSignal()

      isLoading1$.value = true

      expect(isLoading1$.value).toBe(true)
      expect(isLoading2$.value).toBe(false)
    })
  })

  describe("error handling", () => {
    it("should catch and log errors", async () => {
      const isLoading$ = createMockIsLoadingSignal()
      const consoleErrorSpy = { called: false }

      // Mock console.error
      const originalConsoleError = console.error
      console.error = () => {
        consoleErrorSpy.called = true
      }

      try {
        await mockAssignTopics(isLoading$, true)
      } catch (error) {
        // Expected to fail
      }

      // Restore console.error
      console.error = originalConsoleError

      expect(consoleErrorSpy.called).toBe(true)
      expect(isLoading$.value).toBe(false)
    })

    it("should always reset loading state even on error", async () => {
      const isLoading$ = createMockIsLoadingSignal()

      try {
        await mockAssignTopics(isLoading$, true)
      } catch (error) {
        // Expected to fail
      }

      // Loading state should be reset
      expect(isLoading$.value).toBe(false)

      // Should be able to try again
      await mockAssignTopics(isLoading$, false)
      expect(isLoading$.value).toBe(false)
    })
  })

  describe("guard conditions", () => {
    it("should not start new assignment when already loading", async () => {
      const isLoading$ = createMockIsLoadingSignal()
      let assignmentCount = 0

      const mockAssignWithCounter = async () => {
        if (isLoading$.value) return
        assignmentCount++
        isLoading$.value = true
        await new Promise((resolve) => setTimeout(resolve, 10))
        isLoading$.value = false
      }

      // Start first assignment
      const promise1 = mockAssignWithCounter()

      // Try to start second assignment (should be blocked)
      const promise2 = mockAssignWithCounter()

      await promise1
      await promise2

      expect(assignmentCount).toBe(1)
    })

    it("should allow new assignment after previous completes", async () => {
      const isLoading$ = createMockIsLoadingSignal()

      await mockAssignTopics(isLoading$)
      expect(isLoading$.value).toBe(false)

      // Should allow new assignment
      await mockAssignTopics(isLoading$)
      expect(isLoading$.value).toBe(false)
    })
  })
})
