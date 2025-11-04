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

test("topicAnalytics: getTopicPerformanceAnalytics returns array", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { semesterId } = await seedTestData(t)
  
  // Get analytics
  const analytics = await t.query(api.topicAnalytics.getTopicPerformanceAnalytics, {
    semesterId
  })
  
  expect(analytics).toBeDefined()
  expect(Array.isArray(analytics)).toBe(true)
  expect(analytics.length).toBe(10) // 10 topics from TOPICDATA
  
  vi.useRealTimers()
})

test("topicAnalytics: getTopicPerformanceAnalytics has correct structure", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { semesterId } = await seedTestData(t)
  
  // Get analytics
  const analytics = await t.query(api.topicAnalytics.getTopicPerformanceAnalytics, {
    semesterId
  })
  
  // Verify structure
  analytics.forEach(topic => {
    expect(topic.id).toBeDefined()
    expect(topic.title).toBeDefined()
    expect(topic.description).toBeDefined()
    expect(topic.metrics).toBeDefined()
    expect(topic.trends).toBeDefined()
  })
  
  vi.useRealTimers()
})

test("topicAnalytics: getTopicDetailedAnalytics returns detailed info", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { topicIds } = await seedTestData(t)
  
  // Get detailed analytics for first topic
  const analytics = await t.query(api.topicAnalytics.getTopicDetailedAnalytics, {
    topicId: topicIds[0]
  })
  
  expect(analytics).toBeDefined()
  expect(analytics.topic).toBeDefined()
  expect(analytics.topic.id).toBe(topicIds[0])
  expect(analytics.students).toBeDefined()
  expect(analytics.timeline).toBeDefined()
  expect(analytics.positionChanges).toBeDefined()
  expect(analytics.summary).toBeDefined()
  
  vi.useRealTimers()
})

test("topicAnalytics: timeline data is array", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { topicIds } = await seedTestData(t)
  
  // Get detailed analytics
  const analytics = await t.query(api.topicAnalytics.getTopicDetailedAnalytics, {
    topicId: topicIds[0]
  })
  
  // Verify timeline structure
  expect(analytics.timeline).toBeDefined()
  expect(Array.isArray(analytics.timeline)).toBe(true)
  
  // Each timeline entry should have date and events
  analytics.timeline.forEach(entry => {
    expect(entry.date).toBeDefined()
    expect(typeof entry.events).toBe('number')
    expect(entry.events).toBeGreaterThanOrEqual(0)
  })
  
  vi.useRealTimers()
})