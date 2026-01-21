/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, vi } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

test("selectionPeriods: createPeriod and getAllPeriodsWithStats", async () => {
  // Enable fake timers to handle scheduled functions
  vi.useFakeTimers()

  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const now = Date.now()
  const futureOpen = now + (24 * 60 * 60 * 1000) // 1 day from now
  const futureClose = now + (30 * 24 * 60 * 60 * 1000) // 30 days from now

  // Create a period (not active to avoid scheduled function issues)
  const result = await t.mutation(api.selectionPeriods.createPeriod, {
    title: "Spring 2024 Selection",
    description: "Project selection for Spring 2024",
    semesterId: "2024-spring",
    openDate: futureOpen,
    closeDate: futureClose,
  })

  expect(result.success).toBe(true)
  expect(result.periodId).toBeDefined()

  // Get all periods with stats
  const periods = await t.query(api.selectionPeriods.getAllPeriodsWithStats, {})
  expect(periods).toBeDefined()
  expect(periods.length).toBe(1)
  expect(periods[0].title).toBe("Spring 2024 Selection")
  expect(periods[0].semesterId).toBe("2024-spring")
  expect(periods[0].studentCount).toBe(0)

  // Reset to normal timers
  vi.useRealTimers()
})

test("selectionPeriods: updatePeriod", async () => {
  // Enable fake timers to handle scheduled functions
  vi.useFakeTimers()

  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const now = Date.now()
  const futureOpen = now + (24 * 60 * 60 * 1000)
  const futureClose = now + (30 * 24 * 60 * 60 * 1000)

  // Create a period
  const createResult = await t.mutation(api.selectionPeriods.createPeriod, {
    title: "Original Title",
    description: "Original Description",
    semesterId: "2024-test",
    openDate: futureOpen,
    closeDate: futureClose,
  })

  // Update the period
  const updateResult = await t.mutation(api.selectionPeriods.updatePeriod, {
    periodId: createResult.periodId!,
    title: "Updated Title",
    description: "Updated Description"
  })

  expect(updateResult.success).toBe(true)

  // Verify update
  const periods = await t.query(api.selectionPeriods.getAllPeriodsWithStats, {})
  expect(periods[0].title).toBe("Updated Title")
  expect(periods[0].description).toBe("Updated Description")

  // Reset to normal timers
  vi.useRealTimers()
})

test("selectionPeriods: deletePeriod", async () => {
  // Enable fake timers to handle scheduled functions
  vi.useFakeTimers()

  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const now = Date.now()
  const futureOpen = now + (24 * 60 * 60 * 1000)
  const futureClose = now + (30 * 24 * 60 * 60 * 1000)

  // Create a period
  const createResult = await t.mutation(api.selectionPeriods.createPeriod, {
    title: "To Delete",
    description: "Will be deleted",
    semesterId: "2024-delete",
    openDate: futureOpen,
    closeDate: futureClose,
  })

  // Delete it
  const deleteResult = await t.mutation(api.selectionPeriods.deletePeriod, {
    periodId: createResult.periodId!
  })

  expect(deleteResult.success).toBe(true)

  // Verify deletion
  const periods = await t.query(api.selectionPeriods.getAllPeriodsWithStats, {})
  expect(periods.length).toBe(0)

  // Reset to normal timers
  vi.useRealTimers()
})

test("selectionPeriods: multiple periods can exist", async () => {
  // Enable fake timers to handle scheduled functions
  vi.useFakeTimers()

  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const now = Date.now()
  const futureOpen = now + (24 * 60 * 60 * 1000)
  const futureClose = now + (30 * 24 * 60 * 60 * 1000)

  // Create two periods
  await t.mutation(api.selectionPeriods.createPeriod, {
    title: "Period 1",
    description: "First period",
    semesterId: "2024-1",
    openDate: futureOpen,
    closeDate: futureClose,
  })

  await t.mutation(api.selectionPeriods.createPeriod, {
    title: "Period 2",
    description: "Second period",
    semesterId: "2024-2",
    openDate: futureOpen,
    closeDate: futureClose,
  })

  // Verify both exist
  const periods = await t.query(api.selectionPeriods.getAllPeriodsWithStats, {})
  expect(periods.length).toBe(2)

  // Reset to normal timers
  vi.useRealTimers()
})

// ========================================
// getPeriodBySlug tests
// ========================================

test("getPeriodBySlug: should return null for invalid slug format", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  // Test various invalid slug formats
  const result1 = await t.query(api.selectionPeriods.getPeriodBySlug, {
    slug: "not-a-valid-uuid"
  })
  expect(result1).toBeNull()

  const result2 = await t.query(api.selectionPeriods.getPeriodBySlug, {
    slug: ""
  })
  expect(result2).toBeNull()

  const result3 = await t.query(api.selectionPeriods.getPeriodBySlug, {
    slug: "12345"
  })
  expect(result3).toBeNull()

  // UUID v3 format (wrong version)
  const result4 = await t.query(api.selectionPeriods.getPeriodBySlug, {
    slug: "a1b2c3d4-e5f6-3a7b-8c9d-0e1f2a3b4c5d"
  })
  expect(result4).toBeNull()
})

test("getPeriodBySlug: should return null for non-existent slug", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  // Valid UUID v4 format but doesn't exist in database
  const result = await t.query(api.selectionPeriods.getPeriodBySlug, {
    slug: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
  })

  expect(result).toBeNull()
})

test("getPeriodBySlug: should return period for valid slug when period is open", async () => {
  vi.useFakeTimers()

  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const now = Date.now()
  // Create an open period (openDate in past, closeDate in future)
  const pastOpen = now - (24 * 60 * 60 * 1000) // 1 day ago
  const futureClose = now + (30 * 24 * 60 * 60 * 1000) // 30 days from now

  const createResult = await t.mutation(api.selectionPeriods.createPeriod, {
    title: "Open Period",
    description: "An open selection period",
    semesterId: "2024-spring",
    openDate: pastOpen,
    closeDate: futureClose,
  })

  expect(createResult.success).toBe(true)
  expect(createResult.shareableSlug).toBeDefined()

  // Query the period by its slug
  const period = await t.query(api.selectionPeriods.getPeriodBySlug, {
    slug: createResult.shareableSlug!
  })

  expect(period).not.toBeNull()
  expect(period!._id).toBeDefined()
  expect(period!.title).toBe("Open Period")
  expect(period!.description).toBe("An open selection period")
  expect(period!.shareableSlug).toBe(createResult.shareableSlug)
  expect(period!.accessMode).toBeDefined()

  vi.useRealTimers()
})

test("getPeriodBySlug: should return null for valid slug when period is not open (inactive)", async () => {
  vi.useFakeTimers()

  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const now = Date.now()
  // Create a future/inactive period (openDate in future)
  const futureOpen = now + (24 * 60 * 60 * 1000) // 1 day from now
  const futureClose = now + (30 * 24 * 60 * 60 * 1000) // 30 days from now

  const createResult = await t.mutation(api.selectionPeriods.createPeriod, {
    title: "Future Period",
    description: "A future selection period",
    semesterId: "2024-fall",
    openDate: futureOpen,
    closeDate: futureClose,
  })

  expect(createResult.success).toBe(true)
  expect(createResult.shareableSlug).toBeDefined()

  // The period should exist but getPeriodBySlug should return null
  // because the period is not open (it's inactive)
  const period = await t.query(api.selectionPeriods.getPeriodBySlug, {
    slug: createResult.shareableSlug!
  })

  expect(period).toBeNull()

  // Verify the period does exist via getAllPeriodsWithStats
  const allPeriods = await t.query(api.selectionPeriods.getAllPeriodsWithStats, {})
  expect(allPeriods.length).toBe(1)
  expect(allPeriods[0].kind).toBe("inactive")

  vi.useRealTimers()
})

test("getPeriodBySlug: should return null for valid slug when period is closed", async () => {
  vi.useFakeTimers()

  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const now = Date.now()
  // Create a closed period (both openDate and closeDate in past)
  const pastOpen = now - (30 * 24 * 60 * 60 * 1000) // 30 days ago
  const pastClose = now - (1 * 24 * 60 * 60 * 1000) // 1 day ago

  const createResult = await t.mutation(api.selectionPeriods.createPeriod, {
    title: "Closed Period",
    description: "A closed selection period",
    semesterId: "2023-fall",
    openDate: pastOpen,
    closeDate: pastClose,
  })

  expect(createResult.success).toBe(true)
  expect(createResult.shareableSlug).toBeDefined()

  // The period should exist but getPeriodBySlug should return null
  // because the period is closed
  const period = await t.query(api.selectionPeriods.getPeriodBySlug, {
    slug: createResult.shareableSlug!
  })

  expect(period).toBeNull()

  // Verify the period does exist via getAllPeriodsWithStats
  const allPeriods = await t.query(api.selectionPeriods.getAllPeriodsWithStats, {})
  expect(allPeriods.length).toBe(1)
  expect(allPeriods[0].kind).toBe("closed")

  vi.useRealTimers()
})