/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, vi } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"
import {
  createTestSelectionPeriod,
  createTestTopics,
  generateTestStudents,
  insertTestPreferences
} from "./share/admin_helpers"

async function seedTestData(t: ReturnType<typeof convexTest>) {
  const semesterId = "2024-spring"
  const now = Date.now()
  const thirtyDaysFromNow = now + (30 * 24 * 60 * 60 * 1000)

  return await t.run(async (ctx: any) => {
    const [periodId, topicIds] = await Promise.all([
      createTestSelectionPeriod(ctx, semesterId, now, thirtyDaysFromNow),
      createTestTopics(ctx, semesterId)
    ])

    const students = generateTestStudents(topicIds, 10)
    const preferenceIds = await insertTestPreferences(ctx, students, semesterId)

    return { periodId, semesterId, topicIds, preferenceIds }
  })
}

test("analytics: getRecentRankingEvents returns array", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  await seedTestData(t)
  
  // Get recent events (default 24 hours)
  const events = await t.query(api.analytics.getRecentRankingEvents, {})
  
  expect(events).toBeDefined()
  expect(Array.isArray(events)).toBe(true)
  
  vi.useRealTimers()
})

test("analytics: getRecentRankingEvents with custom hours", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  await seedTestData(t)
  
  // Get events from last 48 hours
  const events = await t.query(api.analytics.getRecentRankingEvents, {
    hours: 48
  })
  
  expect(events).toBeDefined()
  expect(Array.isArray(events)).toBe(true)
  
  vi.useRealTimers()
})

test("analytics: getRecentRankingEvents returns empty when no events", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Don't seed any data
  const events = await t.query(api.analytics.getRecentRankingEvents, {})
  
  expect(events).toBeDefined()
  expect(Array.isArray(events)).toBe(true)
  expect(events.length).toBe(0)
  
  vi.useRealTimers()
})