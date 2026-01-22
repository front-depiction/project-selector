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
      createTestSelectionPeriod(ctx, "test-user", semesterId, now, thirtyDaysFromNow),
      createTestTopics(ctx, "test-user", semesterId)
    ])

    const students = generateTestStudents(topicIds, 10)
    const preferenceIds = await insertTestPreferences(ctx, students, semesterId)

    return { periodId, semesterId, topicIds, preferenceIds }
  })
}

test("integration test", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { semesterId, topicIds } = await seedTestData(t)
  
  // Test getAllTopics without semesterId filter
  const allTopics = await t.query(api.topics.getAllTopics, {})
  expect(allTopics).toBeDefined()
  expect(allTopics.length).toBe(10) // TOPICDATA has 10 topics
  
  // Test getAllTopics with semesterId filter
  const semesterTopics = await t.query(api.topics.getAllTopics, { semesterId })
  expect(semesterTopics).toBeDefined()
  expect(semesterTopics.length).toBe(10)
  
  // Verify all returned topics match the seeded topic IDs
  const returnedTopicIds = semesterTopics.map(topic => topic._id)
  expect(returnedTopicIds.sort()).toEqual([...topicIds].sort())
  
  // Verify topic structure and properties
  semesterTopics.forEach(topic => {
    expect(topic._id).toBeDefined()
    expect(topic.title).toBeDefined()
    expect(topic.description).toBeDefined()
    expect(topic.semesterId).toBe(semesterId)
    expect(topic.isActive).toBe(true)
  })
  
  // Test with non-existent semesterId
  const noTopics = await t.query(api.topics.getAllTopics, { semesterId: "non-existent" })
  expect(noTopics).toBeDefined()
  expect(noTopics.length).toBe(0)
  
  // Test getTopic - get a specific topic by ID
  const firstTopicId = topicIds[0]
  const singleTopic = await t.query(api.topics.getTopic, { id: firstTopicId })
  expect(singleTopic).toBeDefined()
  expect(singleTopic?._id).toBe(firstTopicId)
  expect(singleTopic?.semesterId).toBe(semesterId)
  expect(singleTopic?.isActive).toBe(true)
  
  vi.useRealTimers()
})

test("getActiveTopicsWithCongestion", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { semesterId } = await seedTestData(t)
  
  // Test getActiveTopicsWithCongestion
  const topicsWithCongestion = await t.query(api.topics.getActiveTopicsWithCongestion, {})
  expect(topicsWithCongestion).toBeDefined()
  expect(topicsWithCongestion.length).toBe(10)
  
  // Verify topics have basic structure
  topicsWithCongestion.forEach(topic => {
    expect(topic._id).toBeDefined()
    expect(topic.title).toBeDefined()
    expect(topic.description).toBeDefined()
    expect(topic.semesterId).toBe(semesterId)
    expect(topic.isActive).toBe(true)
  })
  
  vi.useRealTimers()
})