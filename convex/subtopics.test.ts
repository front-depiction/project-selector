/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

test("subtopics: createSubtopic and getAllSubtopics", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Create a subtopic
  const result = await t.mutation(api.subtopics.createSubtopic, {
    title: "Machine Learning Basics",
    description: "Introduction to ML concepts"
  })
  
  expect(result.success).toBe(true)
  expect(result.id).toBeDefined()
  
  // Get all subtopics
  const allSubtopics = await t.query(api.subtopics.getAllSubtopics, {})
  expect(allSubtopics).toBeDefined()
  expect(allSubtopics.length).toBe(1)
  expect(allSubtopics[0].title).toBe("Machine Learning Basics")
  expect(allSubtopics[0].description).toBe("Introduction to ML concepts")
})

test("subtopics: createMultipleSubtopics", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Create multiple subtopics
  const result = await t.mutation(api.subtopics.createMultipleSubtopics, {
    subtopics: [
      { title: "Subtopic 1", description: "Description 1" },
      { title: "Subtopic 2", description: "Description 2" },
      { title: "Subtopic 3", description: "Description 3" }
    ]
  })
  
  expect(result.success).toBe(true)
  expect(result.ids).toBeDefined()
  expect(result.ids.length).toBe(3)
  
  // Verify all were created
  const allSubtopics = await t.query(api.subtopics.getAllSubtopics, {})
  expect(allSubtopics.length).toBe(3)
})

test("subtopics: getSubtopicsByIds", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Create subtopics
  const result = await t.mutation(api.subtopics.createMultipleSubtopics, {
    subtopics: [
      { title: "Sub A", description: "Desc A" },
      { title: "Sub B", description: "Desc B" }
    ]
  })
  
  // Get by IDs
  const subtopics = await t.query(api.subtopics.getSubtopicsByIds, {
    ids: result.ids
  })
  
  expect(subtopics).toBeDefined()
  expect(subtopics.length).toBe(2)
  expect(subtopics[0]?.title).toBe("Sub A")
  expect(subtopics[1]?.title).toBe("Sub B")
})

test("subtopics: updateSubtopic", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Create a subtopic
  const createResult = await t.mutation(api.subtopics.createSubtopic, {
    title: "Original Title",
    description: "Original Description"
  })
  
  // Update it
  const updateResult = await t.mutation(api.subtopics.updateSubtopic, {
    id: createResult.id,
    title: "Updated Title"
  })
  
  expect(updateResult.success).toBe(true)
  
  // Verify update
  const subtopics = await t.query(api.subtopics.getSubtopicsByIds, {
    ids: [createResult.id]
  })
  
  expect(subtopics[0]?.title).toBe("Updated Title")
  expect(subtopics[0]?.description).toBe("Original Description") // unchanged
})

test("subtopics: deleteSubtopic", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Create a subtopic
  const createResult = await t.mutation(api.subtopics.createSubtopic, {
    title: "To Delete",
    description: "Will be deleted"
  })
  
  // Delete it
  const deleteResult = await t.mutation(api.subtopics.deleteSubtopic, {
    id: createResult.id
  })
  
  expect(deleteResult.success).toBe(true)
  
  // Verify deletion
  const allSubtopics = await t.query(api.subtopics.getAllSubtopics, {})
  expect(allSubtopics.length).toBe(0)
})

test("subtopics: deleteSubtopic removes from topics", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Create subtopics
  const subtopicResult = await t.mutation(api.subtopics.createMultipleSubtopics, {
    subtopics: [
      { title: "Sub 1", description: "Desc 1" },
      { title: "Sub 2", description: "Desc 2" }
    ]
  })
  
  // Create a topic with subtopics
  const topicId = await t.mutation(api.admin.createTopic, {
    title: "Topic with Subtopics",
    description: "Has subtopics",
    semesterId: "2024-test",
    subtopicIds: subtopicResult.ids
  })
  
  // Delete one subtopic
  await t.mutation(api.subtopics.deleteSubtopic, {
    id: subtopicResult.ids[0]
  })
  
  // Verify topic's subtopicIds was updated
  const topic = await t.query(api.topics.getTopic, { id: topicId })
  expect(topic?.subtopicIds).toBeDefined()
  expect(topic?.subtopicIds?.length).toBe(1)
  expect(topic?.subtopicIds?.[0]).toBe(subtopicResult.ids[1])
})