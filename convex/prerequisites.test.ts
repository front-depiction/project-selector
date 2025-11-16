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

    const students = generateTestStudents(topicIds, 5)
    const preferenceIds = await insertTestPreferences(ctx, students, semesterId)

    return { periodId, semesterId, topicIds, preferenceIds }
  })
}

test("prerequisites: createPrerequisite", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Create a prerequisite
  const prereqId = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Programming Fundamentals",
    description: "Basic programming knowledge required",
    requiredValue: 1
  })
  
  expect(prereqId).toBeDefined()
  
  // Get the created prerequisite
  const prereq = await t.query(api.prerequisites.getPrerequisite, { id: prereqId })
  expect(prereq).toBeDefined()
  expect(prereq?.title).toBe("Programming Fundamentals")
  expect(prereq?.description).toBe("Basic programming knowledge required")
  expect(prereq?.requiredValue).toBe(1)
  
  vi.useRealTimers()
})

test("prerequisites: createPrerequisite without description", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Create a prerequisite without description
  const prereqId = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Math Background",
    requiredValue: 0
  })
  
  // Get the created prerequisite
  const prereq = await t.query(api.prerequisites.getPrerequisite, { id: prereqId })
  expect(prereq).toBeDefined()
  expect(prereq?.title).toBe("Math Background")
  expect(prereq?.description).toBeUndefined()
  expect(prereq?.requiredValue).toBe(0)
  
  vi.useRealTimers()
})

test("prerequisites: getAllPrerequisites", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Create multiple prerequisites
  await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Prereq 1",
    requiredValue: 1
  })
  
  await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Prereq 2",
    requiredValue: 0
  })
  
  // Get all prerequisites
  const allPrereqs = await t.query(api.prerequisites.getAllPrerequisites, {})
  expect(allPrereqs).toBeDefined()
  expect(allPrereqs.length).toBe(2)
  expect(allPrereqs[0].title).toBe("Prereq 1")
  expect(allPrereqs[1].title).toBe("Prereq 2")
  
  vi.useRealTimers()
})

test("prerequisites: getTopicPrerequisites", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Create prerequisites
  const prereq1Id = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Programming",
    requiredValue: 1
  })
  
  const prereq2Id = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Math",
    requiredValue: 0
  })
  
  // Create a topic with prerequisites
  const topicId = await t.mutation(api.admin.createTopic, {
    title: "Advanced Topic",
    description: "Requires prerequisites",
    semesterId: "2024-test",
    prerequisiteIds: [prereq1Id, prereq2Id]
  })
  
  // Get topic prerequisites
  const topicPrereqs = await t.query(api.prerequisites.getTopicPrerequisites, {
    topicId
  })
  
  expect(topicPrereqs).toBeDefined()
  expect(topicPrereqs.length).toBe(2)
  expect(topicPrereqs.some(p => p?.title === "Programming")).toBe(true)
  expect(topicPrereqs.some(p => p?.title === "Math")).toBe(true)
  
  vi.useRealTimers()
})

test("prerequisites: getTopicPrerequisites with no prerequisites", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Create a topic without prerequisites
  const topicId = await t.mutation(api.admin.createTopic, {
    title: "Simple Topic",
    description: "No prerequisites",
    semesterId: "2024-test"
  })
  
  // Get topic prerequisites
  const topicPrereqs = await t.query(api.prerequisites.getTopicPrerequisites, {
    topicId
  })
  
  expect(topicPrereqs).toBeDefined()
  expect(topicPrereqs.length).toBe(0)
  
  vi.useRealTimers()
})

test("prerequisites: setPreferencePrerequisite", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { preferenceIds } = await seedTestData(t)
  
  // Create a prerequisite
  const prereqId = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Test Prereq",
    requiredValue: 1
  })
  
  // Set preference-prerequisite relationship
  const relationshipId = await t.mutation(api.prerequisites.setPreferencePrerequisite, {
    preferenceId: preferenceIds[0],
    prerequisiteId: prereqId,
    isMet: true
  })
  
  expect(relationshipId).toBeDefined()
  
  // Get preference prerequisites
  const prefPrereqs = await t.query(api.prerequisites.getPreferencePrerequisites, {
    preferenceId: preferenceIds[0]
  })
  
  expect(prefPrereqs).toBeDefined()
  expect(prefPrereqs.length).toBe(1)
  expect(prefPrereqs[0].prerequisiteId).toBe(prereqId)
  expect(prefPrereqs[0].isMet).toBe(true)
  
  vi.useRealTimers()
})

test("prerequisites: updatePreferencePrerequisite", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { preferenceIds } = await seedTestData(t)
  
  // Create a prerequisite
  const prereqId = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Test Prereq",
    requiredValue: 1
  })
  
  // Set initial relationship
  await t.mutation(api.prerequisites.setPreferencePrerequisite, {
    preferenceId: preferenceIds[0],
    prerequisiteId: prereqId,
    isMet: false
  })
  
  // Update the relationship
  await t.mutation(api.prerequisites.setPreferencePrerequisite, {
    preferenceId: preferenceIds[0],
    prerequisiteId: prereqId,
    isMet: true
  })
  
  // Verify update
  const prefPrereqs = await t.query(api.prerequisites.getPreferencePrerequisites, {
    preferenceId: preferenceIds[0]
  })
  
  expect(prefPrereqs[0].isMet).toBe(true)
  
  vi.useRealTimers()
})

test("prerequisites: checkTopicPrerequisitesMet with no prerequisites", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { preferenceIds, topicIds } = await seedTestData(t)
  
  // Check prerequisites for topic with no prerequisites
  const isMet = await t.query(api.prerequisites.checkTopicPrerequisitesMet, {
    preferenceId: preferenceIds[0],
    topicId: topicIds[0]
  })
  
  expect(isMet).toBe(true) // No prerequisites means they're considered met
  
  vi.useRealTimers()
})

test("prerequisites: checkTopicPrerequisitesMet with unmet prerequisites", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { preferenceIds } = await seedTestData(t)
  
  // Create prerequisites
  const prereq1Id = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Programming",
    requiredValue: 1
  })
  
  const prereq2Id = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Math",
    requiredValue: 0
  })
  
  // Create a topic with prerequisites
  const topicId = await t.mutation(api.admin.createTopic, {
    title: "Advanced Topic",
    description: "Requires prerequisites",
    semesterId: "2024-test",
    prerequisiteIds: [prereq1Id, prereq2Id]
  })
  
  // Set only one prerequisite as met
  await t.mutation(api.prerequisites.setPreferencePrerequisite, {
    preferenceId: preferenceIds[0],
    prerequisiteId: prereq1Id,
    isMet: true
  })
  
  // Check prerequisites (should be false since one is not met)
  const isMet = await t.query(api.prerequisites.checkTopicPrerequisitesMet, {
    preferenceId: preferenceIds[0],
    topicId
  })
  
  expect(isMet).toBe(false)
  
  vi.useRealTimers()
})

test("prerequisites: checkTopicPrerequisitesMet with all prerequisites met", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { preferenceIds } = await seedTestData(t)
  
  // Create prerequisites
  const prereq1Id = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Programming",
    requiredValue: 1
  })
  
  const prereq2Id = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Math",
    requiredValue: 0
  })
  
  // Create a topic with prerequisites
  const topicId = await t.mutation(api.admin.createTopic, {
    title: "Advanced Topic",
    description: "Requires prerequisites",
    semesterId: "2024-test",
    prerequisiteIds: [prereq1Id, prereq2Id]
  })
  
  // Set all prerequisites as met
  await t.mutation(api.prerequisites.setPreferencePrerequisite, {
    preferenceId: preferenceIds[0],
    prerequisiteId: prereq1Id,
    isMet: true
  })
  
  await t.mutation(api.prerequisites.setPreferencePrerequisite, {
    preferenceId: preferenceIds[0],
    prerequisiteId: prereq2Id,
    isMet: true
  })
  
  // Check prerequisites (should be true since all are met)
  const isMet = await t.query(api.prerequisites.checkTopicPrerequisitesMet, {
    preferenceId: preferenceIds[0],
    topicId
  })
  
  expect(isMet).toBe(true)
  
  vi.useRealTimers()
})

test("prerequisites: getPreferencePrerequisites with no relationships", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { preferenceIds } = await seedTestData(t)
  
  // Get preference prerequisites (should be empty)
  const prefPrereqs = await t.query(api.prerequisites.getPreferencePrerequisites, {
    preferenceId: preferenceIds[0]
  })
  
  expect(prefPrereqs).toBeDefined()
  expect(prefPrereqs.length).toBe(0)
  
  vi.useRealTimers()
})

test("prerequisites: updatePrerequisite", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Create a prerequisite
  const prereqId = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Original Title",
    description: "Original Description",
    requiredValue: 1
  })
  
  // Update it
  await t.mutation(api.prerequisites.updatePrerequisite, {
    id: prereqId,
    title: "Updated Title",
    requiredValue: 0
  })
  
  // Verify update
  const updatedPrereq = await t.query(api.prerequisites.getPrerequisite, { id: prereqId })
  expect(updatedPrereq?.title).toBe("Updated Title")
  expect(updatedPrereq?.description).toBe("Original Description") // unchanged
  expect(updatedPrereq?.requiredValue).toBe(0)
  
  vi.useRealTimers()
})

test("prerequisites: deletePrerequisite", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Create a prerequisite
  const prereqId = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "To Delete",
    requiredValue: 1
  })
  
  // Delete it
  await t.mutation(api.prerequisites.deletePrerequisite, { id: prereqId })
  
  // Verify deletion
  const deletedPrereq = await t.query(api.prerequisites.getPrerequisite, { id: prereqId })
  expect(deletedPrereq).toBeNull()
  
  vi.useRealTimers()
})

test("prerequisites: deletePrerequisite removes from topics", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Create prerequisites
  const prereq1Id = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Prereq 1",
    requiredValue: 1
  })
  
  const prereq2Id = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Prereq 2",
    requiredValue: 0
  })
  
  // Create a topic with prerequisites
  const topicId = await t.mutation(api.admin.createTopic, {
    title: "Topic with Prerequisites",
    description: "Has prerequisites",
    semesterId: "2024-test",
    prerequisiteIds: [prereq1Id, prereq2Id]
  })
  
  // Delete one prerequisite
  await t.mutation(api.prerequisites.deletePrerequisite, { id: prereq1Id })
  
  // Verify topic's prerequisiteIds was updated
  const topic = await t.query(api.topics.getTopic, { id: topicId })
  expect(topic?.prerequisiteIds).toBeDefined()
  expect(topic?.prerequisiteIds?.length).toBe(1)
  expect(topic?.prerequisiteIds?.[0]).toBe(prereq2Id)
  
  vi.useRealTimers()
})

test("prerequisites: deletePrerequisite removes preference relationships", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { preferenceIds } = await seedTestData(t)
  
  // Create a prerequisite
  const prereqId = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Test Prereq",
    requiredValue: 1
  })
  
  // Create preference-prerequisite relationship
  await t.mutation(api.prerequisites.setPreferencePrerequisite, {
    preferenceId: preferenceIds[0],
    prerequisiteId: prereqId,
    isMet: true
  })
  
  // Delete the prerequisite
  await t.mutation(api.prerequisites.deletePrerequisite, { id: prereqId })
  
  // Verify relationship was deleted
  const prefPrereqs = await t.query(api.prerequisites.getPreferencePrerequisites, {
    preferenceId: preferenceIds[0]
  })
  expect(prefPrereqs.length).toBe(0)
  
  vi.useRealTimers()
})

test("prerequisites: deletePreferencePrerequisite", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { preferenceIds } = await seedTestData(t)
  
  // Create a prerequisite
  const prereqId = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Test Prereq",
    requiredValue: 1
  })
  
  // Create preference-prerequisite relationship
  await t.mutation(api.prerequisites.setPreferencePrerequisite, {
    preferenceId: preferenceIds[0],
    prerequisiteId: prereqId,
    isMet: true
  })
  
  // Delete the relationship
  await t.mutation(api.prerequisites.deletePreferencePrerequisite, {
    preferenceId: preferenceIds[0],
    prerequisiteId: prereqId
  })
  
  // Verify relationship was deleted
  const prefPrereqs = await t.query(api.prerequisites.getPreferencePrerequisites, {
    preferenceId: preferenceIds[0]
  })
  expect(prefPrereqs.length).toBe(0)
  
  vi.useRealTimers()
})

test("prerequisites: getPrerequisitePreferences", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { preferenceIds } = await seedTestData(t)
  
  // Create a prerequisite
  const prereqId = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Test Prereq",
    requiredValue: 1
  })
  
  // Create relationships with multiple preferences
  await t.mutation(api.prerequisites.setPreferencePrerequisite, {
    preferenceId: preferenceIds[0],
    prerequisiteId: prereqId,
    isMet: true
  })
  
  await t.mutation(api.prerequisites.setPreferencePrerequisite, {
    preferenceId: preferenceIds[1],
    prerequisiteId: prereqId,
    isMet: false
  })
  
  // Get prerequisite preferences
  const prereqPrefs = await t.query(api.prerequisites.getPrerequisitePreferences, {
    prerequisiteId: prereqId
  })
  
  expect(prereqPrefs).toBeDefined()
  expect(prereqPrefs.length).toBe(2)
  expect(prereqPrefs.some(p => p.preferenceId === preferenceIds[0])).toBe(true)
  expect(prereqPrefs.some(p => p.preferenceId === preferenceIds[1])).toBe(true)
  
  vi.useRealTimers()
})

test("prerequisites: getAllPreferencePrerequisites", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { preferenceIds } = await seedTestData(t)
  
  // Create prerequisites
  const prereq1Id = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Prereq 1",
    requiredValue: 1
  })
  
  const prereq2Id = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Prereq 2",
    requiredValue: 0
  })
  
  // Create multiple relationships
  await t.mutation(api.prerequisites.setPreferencePrerequisite, {
    preferenceId: preferenceIds[0],
    prerequisiteId: prereq1Id,
    isMet: true
  })
  
  await t.mutation(api.prerequisites.setPreferencePrerequisite, {
    preferenceId: preferenceIds[1],
    prerequisiteId: prereq2Id,
    isMet: false
  })
  
  // Get all relationships
  const allRelationships = await t.query(api.prerequisites.getAllPreferencePrerequisites, {})
  
  expect(allRelationships).toBeDefined()
  expect(allRelationships.length).toBe(2)
  
  vi.useRealTimers()
})

test("prerequisites: setMultiplePreferencePrerequisites", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { preferenceIds } = await seedTestData(t)
  
  // Create prerequisites
  const prereq1Id = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Prereq 1",
    requiredValue: 1
  })
  
  const prereq2Id = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Prereq 2",
    requiredValue: 0
  })
  
  // Create multiple relationships at once
  const result = await t.mutation(api.preferencePrerequisites.setMultiplePreferencePrerequisites, {
    relationships: [
      {
        preferenceId: preferenceIds[0],
        prerequisiteId: prereq1Id,
        isMet: true
      },
      {
        preferenceId: preferenceIds[0],
        prerequisiteId: prereq2Id,
        isMet: false
      },
      {
        preferenceId: preferenceIds[1],
        prerequisiteId: prereq1Id,
        isMet: true
      }
    ]
  })
  
  expect(result).toBeDefined()
  expect(result.length).toBe(3)
  
  // Verify relationships were created
  const prefPrereqs = await t.query(api.prerequisites.getPreferencePrerequisites, {
    preferenceId: preferenceIds[0]
  })
  expect(prefPrereqs.length).toBe(2)
  
  vi.useRealTimers()
})

test("prerequisites: deleteAllPreferencePrerequisites", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { preferenceIds } = await seedTestData(t)
  
  // Create prerequisites
  const prereq1Id = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Prereq 1",
    requiredValue: 1
  })
  
  const prereq2Id = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Prereq 2",
    requiredValue: 0
  })
  
  // Create multiple relationships for same preference
  await t.mutation(api.prerequisites.setPreferencePrerequisite, {
    preferenceId: preferenceIds[0],
    prerequisiteId: prereq1Id,
    isMet: true
  })
  
  await t.mutation(api.prerequisites.setPreferencePrerequisite, {
    preferenceId: preferenceIds[0],
    prerequisiteId: prereq2Id,
    isMet: false
  })
  
  // Delete all relationships for preference
  const deletedIds = await t.mutation(api.preferencePrerequisites.deleteAllPreferencePrerequisites, {
    preferenceId: preferenceIds[0]
  })
  
  expect(deletedIds).toBeDefined()
  expect(deletedIds.length).toBe(2)
  
  // Verify all relationships were deleted
  const prefPrereqs = await t.query(api.prerequisites.getPreferencePrerequisites, {
    preferenceId: preferenceIds[0]
  })
  expect(prefPrereqs.length).toBe(0)
  
  vi.useRealTimers()
})

test("prerequisites: deleteAllPrerequisitePreferences", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { preferenceIds } = await seedTestData(t)
  
  // Create a prerequisite
  const prereqId = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Test Prereq",
    requiredValue: 1
  })
  
  // Create multiple relationships for same prerequisite
  await t.mutation(api.prerequisites.setPreferencePrerequisite, {
    preferenceId: preferenceIds[0],
    prerequisiteId: prereqId,
    isMet: true
  })
  
  await t.mutation(api.prerequisites.setPreferencePrerequisite, {
    preferenceId: preferenceIds[1],
    prerequisiteId: prereqId,
    isMet: false
  })
  
  // Delete all relationships for prerequisite
  const deletedIds = await t.mutation(api.preferencePrerequisites.deleteAllPrerequisitePreferences, {
    prerequisiteId: prereqId
  })
  
  expect(deletedIds).toBeDefined()
  expect(deletedIds.length).toBe(2)
  
  // Verify all relationships were deleted
  const prereqPrefs = await t.query(api.prerequisites.getPrerequisitePreferences, {
    prerequisiteId: prereqId
  })
  expect(prereqPrefs.length).toBe(0)
  
  vi.useRealTimers()
})

test("prerequisites: getPreferencePrerequisitesWithDetails", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { preferenceIds } = await seedTestData(t)
  
  // Create a prerequisite
  const prereqId = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Test Prereq",
    requiredValue: 1
  })
  
  // Create relationship
  await t.mutation(api.prerequisites.setPreferencePrerequisite, {
    preferenceId: preferenceIds[0],
    prerequisiteId: prereqId,
    isMet: true
  })
  
  // Get relationships with details
  const relationshipsWithDetails = await t.query(api.preferencePrerequisites.getPreferencePrerequisitesWithDetails, {
    preferenceId: preferenceIds[0]
  })
  
  expect(relationshipsWithDetails).toBeDefined()
  expect(relationshipsWithDetails.length).toBe(1)
  expect(relationshipsWithDetails[0].relationship.isMet).toBe(true)
  expect(relationshipsWithDetails[0].prerequisite?.title).toBe("Test Prereq")
  expect(relationshipsWithDetails[0].preference?.studentId).toBe("student-1")
  
  vi.useRealTimers()
})

test("prerequisites: getPrerequisitePreferencesWithDetails", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { preferenceIds } = await seedTestData(t)
  
  // Create a prerequisite
  const prereqId = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Test Prereq",
    requiredValue: 1
  })
  
  // Create relationship
  await t.mutation(api.prerequisites.setPreferencePrerequisite, {
    preferenceId: preferenceIds[0],
    prerequisiteId: prereqId,
    isMet: true
  })
  
  // Get relationships with details
  const relationshipsWithDetails = await t.query(api.preferencePrerequisites.getPrerequisitePreferencesWithDetails, {
    prerequisiteId: prereqId
  })
  
  expect(relationshipsWithDetails).toBeDefined()
  expect(relationshipsWithDetails.length).toBe(1)
  expect(relationshipsWithDetails[0].relationship.isMet).toBe(true)
  expect(relationshipsWithDetails[0].prerequisite?.title).toBe("Test Prereq")
  expect(relationshipsWithDetails[0].preference?.studentId).toBe("student-1")
  
  vi.useRealTimers()
})

test("deletePrerequisite should cascade delete studentPrerequisites", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Create a prerequisite
  const prereqId = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Test Prereq",
    requiredValue: 1
  })
  
  const studentId = "test-student-123"
  
  // Create a student prerequisite evaluation
  await t.mutation(api.studentPrerequisites.saveStudentPrerequisiteEvaluation, {
    studentId,
    prerequisiteId: prereqId,
    isMet: true
  })
  
  // Verify the student prerequisite exists
  const evaluation = await t.query(api.studentPrerequisites.getStudentPrerequisiteEvaluation, {
    studentId,
    prerequisiteId: prereqId
  })
  expect(evaluation).toBeDefined()
  expect(evaluation?.isMet).toBe(true)
  
  // Delete the prerequisite
  await t.mutation(api.prerequisites.deletePrerequisite, { id: prereqId })
  
  // Student prerequisite should be deleted
  const deletedEvaluation = await t.query(api.studentPrerequisites.getStudentPrerequisiteEvaluation, {
    studentId,
    prerequisiteId: prereqId
  })
  expect(deletedEvaluation).toBeNull()
  
  // Also verify the prerequisite itself is deleted
  const deletedPrereq = await t.query(api.prerequisites.getPrerequisite, { id: prereqId })
  expect(deletedPrereq).toBeNull()
  
  vi.useRealTimers()
})

test("deletePrerequisite should cascade delete all related studentPrerequisites", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Create a prerequisite
  const prereqId = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Test Prereq",
    requiredValue: 1
  })
  
  const student1Id = "student-1"
  const student2Id = "student-2"
  const student3Id = "student-3"
  
  // Create multiple student prerequisite evaluations
  await t.mutation(api.studentPrerequisites.saveStudentPrerequisiteEvaluation, {
    studentId: student1Id,
    prerequisiteId: prereqId,
    isMet: true
  })
  
  await t.mutation(api.studentPrerequisites.saveStudentPrerequisiteEvaluation, {
    studentId: student2Id,
    prerequisiteId: prereqId,
    isMet: false
  })
  
  await t.mutation(api.studentPrerequisites.saveStudentPrerequisiteEvaluation, {
    studentId: student3Id,
    prerequisiteId: prereqId,
    isMet: true
  })
  
  // Verify all student prerequisites exist
  const eval1 = await t.query(api.studentPrerequisites.getStudentPrerequisiteEvaluation, {
    studentId: student1Id,
    prerequisiteId: prereqId
  })
  const eval2 = await t.query(api.studentPrerequisites.getStudentPrerequisiteEvaluation, {
    studentId: student2Id,
    prerequisiteId: prereqId
  })
  const eval3 = await t.query(api.studentPrerequisites.getStudentPrerequisiteEvaluation, {
    studentId: student3Id,
    prerequisiteId: prereqId
  })
  
  expect(eval1).toBeDefined()
  expect(eval2).toBeDefined()
  expect(eval3).toBeDefined()
  
  // Delete the prerequisite
  await t.mutation(api.prerequisites.deletePrerequisite, { id: prereqId })
  
  // All student prerequisites should be deleted
  const deletedEval1 = await t.query(api.studentPrerequisites.getStudentPrerequisiteEvaluation, {
    studentId: student1Id,
    prerequisiteId: prereqId
  })
  const deletedEval2 = await t.query(api.studentPrerequisites.getStudentPrerequisiteEvaluation, {
    studentId: student2Id,
    prerequisiteId: prereqId
  })
  const deletedEval3 = await t.query(api.studentPrerequisites.getStudentPrerequisiteEvaluation, {
    studentId: student3Id,
    prerequisiteId: prereqId
  })
  
  expect(deletedEval1).toBeNull()
  expect(deletedEval2).toBeNull()
  expect(deletedEval3).toBeNull()
  
  vi.useRealTimers()
})

test("deletePrerequisite should handle mixed relationships correctly", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data for preferences
  const { preferenceIds } = await seedTestData(t)
  
  // Create prerequisites
  const prereq1Id = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Prereq 1",
    requiredValue: 1
  })
  
  const prereq2Id = await t.mutation(api.prerequisites.createPrerequisite, {
    title: "Prereq 2", 
    requiredValue: 0
  })
  
  // Create a topic with both prerequisites
  const topicId = await t.mutation(api.admin.createTopic, {
    title: "Advanced Topic",
    description: "Requires prerequisites",
    semesterId: "2024-test",
    prerequisiteIds: [prereq1Id, prereq2Id]
  })
  
  // Create student prerequisite evaluations for prereq1
  const studentId = "test-student"
  await t.mutation(api.studentPrerequisites.saveStudentPrerequisiteEvaluation, {
    studentId,
    prerequisiteId: prereq1Id,
    isMet: true
  })
  
  // Create preference-prerequisite relationships for prereq1
  await t.mutation(api.prerequisites.setPreferencePrerequisite, {
    preferenceId: preferenceIds[0],
    prerequisiteId: prereq1Id,
    isMet: true
  })
  
  // Create student prerequisite evaluations for prereq2 (should remain)
  await t.mutation(api.studentPrerequisites.saveStudentPrerequisiteEvaluation, {
    studentId,
    prerequisiteId: prereq2Id,
    isMet: false
  })
  
  // Create preference-prerequisite relationships for prereq2 (should remain)
  await t.mutation(api.prerequisites.setPreferencePrerequisite, {
    preferenceId: preferenceIds[0],
    prerequisiteId: prereq2Id,
    isMet: false
  })
  
  // Delete prereq1
  await t.mutation(api.prerequisites.deletePrerequisite, { id: prereq1Id })
  
  // prereq1 relationships should be deleted
  const deletedStudentEval = await t.query(api.studentPrerequisites.getStudentPrerequisiteEvaluation, {
    studentId,
    prerequisiteId: prereq1Id
  })
  expect(deletedStudentEval).toBeNull()
  
  const deletedPrefPrereqs = await t.query(api.prerequisites.getPreferencePrerequisites, {
    preferenceId: preferenceIds[0]
  })
  expect(deletedPrefPrereqs.filter(p => p.prerequisiteId === prereq1Id)).toHaveLength(0)
  
  // prereq2 relationships should remain intact
  const remainingStudentEval = await t.query(api.studentPrerequisites.getStudentPrerequisiteEvaluation, {
    studentId,
    prerequisiteId: prereq2Id
  })
  expect(remainingStudentEval).toBeDefined()
  expect(remainingStudentEval?.isMet).toBe(false)
  
  const remainingPrefPrereqs = await t.query(api.prerequisites.getPreferencePrerequisites, {
    preferenceId: preferenceIds[0]
  })
  expect(remainingPrefPrereqs.filter(p => p.prerequisiteId === prereq2Id)).toHaveLength(1)
  
  // Topic should have prereq1 removed but prereq2 remaining
  const topic = await t.query(api.topics.getTopic, { id: topicId })
  expect(topic?.prerequisiteIds).toBeDefined()
  expect(topic?.prerequisiteIds?.length).toBe(1)
  expect(topic?.prerequisiteIds?.[0]).toBe(prereq2Id)
  
  vi.useRealTimers()
})

