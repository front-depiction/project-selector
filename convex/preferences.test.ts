/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, vi } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"
import {
  createTestSelectionPeriod,
  createTestTopics
} from "./share/admin_helpers"

async function seedTestDataWithoutRankings(t: ReturnType<typeof convexTest>) {
  const semesterId = "2024-spring"
  const now = Date.now()
  const thirtyDaysFromNow = now + (30 * 24 * 60 * 60 * 1000)

  return await t.run(async (ctx: any) => {
    const [periodId, topicIds] = await Promise.all([
      createTestSelectionPeriod(ctx, semesterId, now, thirtyDaysFromNow),
      createTestTopics(ctx, semesterId)
    ])

    return { periodId, semesterId, topicIds }
  })
}

test("preferences: getPreferences returns null when no preferences exist", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  await seedTestDataWithoutRankings(t)
  
  const studentId = "student-nonexistent"
  
  // Get preferences for non-existent student
  const preferences = await t.query(api.preferences.getPreferences, { studentId })
  expect(preferences).toBeNull()
  
  vi.useRealTimers()
})

test("preferences: getAllPreferences returns empty array when no preferences", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { semesterId } = await seedTestDataWithoutRankings(t)
  
  // Get all preferences for semester with no preferences
  const allPreferences = await t.query(api.preferences.getAllPreferences, { semesterId })
  expect(allPreferences).toBeDefined()
  expect(allPreferences.length).toBe(0)
  
  vi.useRealTimers()
})

test("preferences: getAllPreferences for non-existent semester", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Get preferences for non-existent semester
  const noPreferences = await t.query(api.preferences.getAllPreferences, { 
    semesterId: "non-existent"
  })
  expect(noPreferences.length).toBe(0)
  
  vi.useRealTimers()
})

test("preferences: cannot get preferences when no active period", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  const studentId = "student-test"
  
  // Try to get preferences when no active period exists
  const preferences = await t.query(api.preferences.getPreferences, { studentId })
  expect(preferences).toBeNull()
  
  vi.useRealTimers()
})