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

    const students = generateTestStudents(topicIds, 70)
    const preferenceIds = await insertTestPreferences(ctx, students, semesterId)

    return { periodId, semesterId, topicIds, preferenceIds, students }
  })
}

test("assignments: assignNow creates assignments", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { periodId, students } = await seedTestData(t)
  
  // Assign students
  const batchId = await t.mutation(api.assignments.assignNow, { periodId })
  expect(batchId).toBeDefined()
  
  // Get assignments
  const assignments = await t.query(api.assignments.getAssignments, { periodId })
  expect(assignments).toBeDefined()
  expect(assignments).not.toBeNull()
  
  // Verify all students were assigned
  const totalAssigned = Object.values(assignments!).reduce(
    (sum, topicData) => sum + topicData.students.length,
    0
  )
  expect(totalAssigned).toBe(students.length)
  
  vi.useRealTimers()
})

test("assignments: getMyAssignment returns student assignment", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { periodId, students } = await seedTestData(t)
  
  // Assign students
  await t.mutation(api.assignments.assignNow, { periodId })
  
  // Get assignment for first student
  const studentId = students[0].id
  const myAssignment = await t.query(api.assignments.getMyAssignment, {
    periodId,
    studentId
  })
  
  expect(myAssignment).toBeDefined()
  expect(myAssignment).not.toBeNull()
  expect(myAssignment?.assignment.studentId).toBe(studentId)
  expect(myAssignment?.topic).toBeDefined()
  
  vi.useRealTimers()
})

test("assignments: getAssignmentStats returns statistics", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { periodId, students } = await seedTestData(t)
  
  // Assign students
  await t.mutation(api.assignments.assignNow, { periodId })
  
  // Get stats
  const stats = await t.query(api.assignments.getAssignmentStats, { periodId })
  expect(stats).toBeDefined()
  expect(stats).not.toBeNull()
  expect(stats?.totalAssignments).toBe(students.length)
  expect(stats?.matchedPreferences).toBeGreaterThan(0)
  expect(stats?.distribution).toBeDefined()
  
  vi.useRealTimers()
})

test("assignments: cannot assign twice", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { periodId } = await seedTestData(t)
  
  // First assignment
  const batchId1 = await t.mutation(api.assignments.assignNow, { periodId })
  expect(batchId1).toBeDefined()
  
  // Second assignment should fail
  await expect(
    t.mutation(api.assignments.assignNow, { periodId })
  ).rejects.toThrow("Period already assigned")
  
  vi.useRealTimers()
})

test("assignments: getAllAssignmentsForExport returns flat format", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data
  const { periodId, students } = await seedTestData(t)
  
  // Assign students
  await t.mutation(api.assignments.assignNow, { periodId })
  
  // Get assignments for export
  const exportData = await t.query(api.assignments.getAllAssignmentsForExport, { periodId })
  expect(exportData).toBeDefined()
  expect(exportData).not.toBeNull()
  expect(Array.isArray(exportData)).toBe(true)
  expect(exportData).toHaveLength(students.length)
  
  // Verify structure of export data
  const firstExport = exportData![0]
  expect(firstExport).toHaveProperty('student_id')
  expect(firstExport).toHaveProperty('assigned_topic')
  expect(typeof firstExport.student_id).toBe('string')
  expect(typeof firstExport.assigned_topic).toBe('string')
  
  // Verify all student IDs are present in export
  const exportedStudentIds = exportData!.map(item => item.student_id)
  const originalStudentIds = students.map(s => s.id)
  expect(exportedStudentIds.sort()).toEqual(originalStudentIds.sort())
  
  vi.useRealTimers()
})

test("assignments: getAllAssignmentsForExport returns null for unassigned period", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data but don't assign
  const { periodId } = await seedTestData(t)
  
  // Get assignments for export without assignment
  const exportData = await t.query(api.assignments.getAllAssignmentsForExport, { periodId })
  expect(exportData).toBeNull()
  
  vi.useRealTimers()
})

test("assignments: distribution is balanced", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  // Seed test data with more students
  const semesterId = "2024-balanced"
  const now = Date.now()
  const futureClose = now + (30 * 24 * 60 * 60 * 1000)
  
  const { periodId, topicIds } = await t.run(async (ctx: any) => {
    const [periodId, topicIds] = await Promise.all([
      createTestSelectionPeriod(ctx, semesterId, now, futureClose),
      createTestTopics(ctx, semesterId)
    ])
    
    // Create 30 students for 10 topics
    const students = generateTestStudents(topicIds, 30)
    await insertTestPreferences(ctx, students, semesterId)
    
    return { periodId, topicIds }
  })
  
  // Assign students
  await t.mutation(api.assignments.assignNow, { periodId })
  
  // Get stats
  const stats = await t.query(api.assignments.getAssignmentStats, { periodId })
  expect(stats).toBeDefined()
  
  // Check distribution is relatively balanced (each topic should have ~3 students)
  const distribution = Object.values(stats!.distribution)
  const min = Math.min(...distribution)
  const max = Math.max(...distribution)
  
  // Difference should be at most 1 for even distribution
  expect(max - min).toBeLessThanOrEqual(1)
  
  vi.useRealTimers()
})