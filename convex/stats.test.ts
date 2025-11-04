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

/**
 * Seeds test database with dummy data for testing.
 * Uses the same helpers as the real seedTestData mutation, but skips
 * ranking creation to avoid needing the aggregate component.
 */
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

test("getLandingStats returns stats object", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  await seedTestData(t)
  
  // Query landing stats
  const stats = await t.query(api.stats.getLandingStats, {})
  
  // Verify stats structure exists
  expect(stats).toBeDefined()
  expect(stats.periodStatus).toBeDefined()
  // Note: totalTopics and totalStudents may be 0 if period is inactive
  expect(typeof stats.totalTopics).toBe('number')
  expect(typeof stats.totalStudents).toBe('number')
  
  vi.useRealTimers()
})