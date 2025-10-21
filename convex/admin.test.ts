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

test("admin: createTopic and updateTopic", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  const semesterId = "2024-fall"
  
  // Create a new topic
  const topicId = await t.mutation(api.admin.createTopic, {
    title: "Test Topic",
    description: "This is a test topic",
    semesterId
  })
  
  expect(topicId).toBeDefined()
  
  // Verify topic was created
  const topic = await t.query(api.topics.getTopic, { id: topicId })
  expect(topic).toBeDefined()
  expect(topic?.title).toBe("Test Topic")
  expect(topic?.description).toBe("This is a test topic")
  expect(topic?.semesterId).toBe(semesterId)
  expect(topic?.isActive).toBe(true)
  
  // Update the topic
  await t.mutation(api.admin.updateTopic, {
    id: topicId,
    title: "Updated Topic",
    isActive: false
  })
  
  // Verify update
  const updatedTopic = await t.query(api.topics.getTopic, { id: topicId })
  expect(updatedTopic?.title).toBe("Updated Topic")
  expect(updatedTopic?.description).toBe("This is a test topic") // unchanged
  expect(updatedTopic?.isActive).toBe(false)
  
  vi.useRealTimers()
})

test("admin: getAllPeriods returns periods", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  await seedTestData(t)
  
  // Get all periods
  const allPeriods = await t.query(api.admin.getAllPeriods, {})
  expect(allPeriods).toBeDefined()
  expect(allPeriods.length).toBe(1)
  expect(allPeriods[0].semesterId).toBe("2024-spring")
  expect(allPeriods[0].title).toBe("Test Period")
  
  vi.useRealTimers()
})

test("admin: deleteTopic validation", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data with preferences
  const { topicIds } = await seedTestData(t)
  
  // Try to delete a topic that has preferences - should fail
  await expect(
    t.mutation(api.admin.deleteTopic, { id: topicIds[0] })
  ).rejects.toThrow("Cannot delete topic with existing student selections")
  
  // Create a new topic without preferences
  const newTopicId = await t.mutation(api.admin.createTopic, {
    title: "Deletable Topic",
    description: "This topic has no selections",
    semesterId: "2024-fall"
  })
  
  // Delete should succeed
  await t.mutation(api.admin.deleteTopic, { id: newTopicId })
  
  // Verify deletion
  const deletedTopic = await t.query(api.topics.getTopic, { id: newTopicId })
  expect(deletedTopic).toBeNull()
  
  vi.useRealTimers()
})