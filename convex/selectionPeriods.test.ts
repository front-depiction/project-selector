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
    setAsActive: false
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
    setAsActive: false
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
    setAsActive: false
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
    setAsActive: false
  })
  
  await t.mutation(api.selectionPeriods.createPeriod, {
    title: "Period 2",
    description: "Second period",
    semesterId: "2024-2",
    openDate: futureOpen,
    closeDate: futureClose,
    setAsActive: false
  })
  
  // Verify both exist
  const periods = await t.query(api.selectionPeriods.getAllPeriodsWithStats, {})
  expect(periods.length).toBe(2)
  
  // Reset to normal timers
  vi.useRealTimers()
})