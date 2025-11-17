/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, vi } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

async function seedTestData(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx: any) => {
    // Create test prerequisites
    const prereq1Id = await ctx.db.insert("prerequisites", {
      title: "Programming Fundamentals",
      description: "Basic programming knowledge required",
      requiredValue: 1
    })
    
    const prereq2Id = await ctx.db.insert("prerequisites", {
      title: "Data Structures",
      description: "Understanding of data structures and algorithms",
      requiredValue: 1
    })
    
    const prereq3Id = await ctx.db.insert("prerequisites", {
      title: "Web Development",
      description: "Experience with HTML, CSS, and JavaScript",
      requiredValue: 0
    })
    
    return {
      prereq1Id,
      prereq2Id,
      prereq3Id,
      studentId: "test-student-123"
    }
  })
}

test("studentPrerequisites: getPrerequisitesWithStudentEvaluations - no evaluations", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  const { prereq1Id, prereq2Id, prereq3Id, studentId } = await seedTestData(t)
  
  // Get prerequisites with student evaluations (should have null evaluations)
  const prerequisitesWithEvaluations = await t.query(
    api.studentPrerequisites.getPrerequisitesWithStudentEvaluations,
    { studentId }
  )
  
  expect(prerequisitesWithEvaluations).toHaveLength(3)
  expect(prerequisitesWithEvaluations[0].studentEvaluation).toBeNull()
  expect(prerequisitesWithEvaluations[1].studentEvaluation).toBeNull()
  expect(prerequisitesWithEvaluations[2].studentEvaluation).toBeNull()
})

test("studentPrerequisites: saveStudentPrerequisiteEvaluation - new evaluation", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  const { prereq1Id, studentId } = await seedTestData(t)
  
  // Save a new evaluation
  const result = await t.mutation(api.studentPrerequisites.saveStudentPrerequisiteEvaluation, {
    studentId,
    prerequisiteId: prereq1Id,
    isMet: true
  })
  
  expect(result).toBeDefined()
  
  // Get the saved evaluation
  const evaluation = await t.query(api.studentPrerequisites.getStudentPrerequisiteEvaluation, {
    studentId,
    prerequisiteId: prereq1Id
  })
  
  expect(evaluation).toBeDefined()
  expect(evaluation?.studentId).toBe(studentId)
  expect(evaluation?.prerequisiteId).toBe(prereq1Id)
  expect(evaluation?.isMet).toBe(true)
})

test("studentPrerequisites: saveStudentPrerequisiteEvaluation - update existing", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  const { prereq1Id, studentId } = await seedTestData(t)
  
  // Save initial evaluation
  await t.mutation(api.studentPrerequisites.saveStudentPrerequisiteEvaluation, {
    studentId,
    prerequisiteId: prereq1Id,
    isMet: true
  })
  
  // Update the evaluation
  await t.mutation(api.studentPrerequisites.saveStudentPrerequisiteEvaluation, {
    studentId,
    prerequisiteId: prereq1Id,
    isMet: false
  })
  
  // Get the updated evaluation
  const evaluation = await t.query(api.studentPrerequisites.getStudentPrerequisiteEvaluation, {
    studentId,
    prerequisiteId: prereq1Id
  })
  
  expect(evaluation?.isMet).toBe(false)
})

test("studentPrerequisites: saveStudentPrerequisiteEvaluations - multiple evaluations", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  const { prereq1Id, prereq2Id, prereq3Id, studentId } = await seedTestData(t)
  
  // Save multiple evaluations at once
  const results = await t.mutation(api.studentPrerequisites.saveStudentPrerequisiteEvaluations, {
    studentId,
    evaluations: [
      { prerequisiteId: prereq1Id, isMet: true },
      { prerequisiteId: prereq2Id, isMet: true },
      { prerequisiteId: prereq3Id, isMet: false }
    ]
  })
  
  expect(results).toHaveLength(3)
  
  // Verify all evaluations were saved
  const evaluation1 = await t.query(api.studentPrerequisites.getStudentPrerequisiteEvaluation, {
    studentId,
    prerequisiteId: prereq1Id
  })
  const evaluation2 = await t.query(api.studentPrerequisites.getStudentPrerequisiteEvaluation, {
    studentId,
    prerequisiteId: prereq2Id
  })
  const evaluation3 = await t.query(api.studentPrerequisites.getStudentPrerequisiteEvaluation, {
    studentId,
    prerequisiteId: prereq3Id
  })
  
  expect(evaluation1?.isMet).toBe(true)
  expect(evaluation2?.isMet).toBe(true)
  expect(evaluation3?.isMet).toBe(false)
})

test("studentPrerequisites: hasCompletedPrerequisiteEvaluations - incomplete", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  const { prereq1Id, studentId } = await seedTestData(t)
  
  // Save only one evaluation out of three
  await t.mutation(api.studentPrerequisites.saveStudentPrerequisiteEvaluation, {
    studentId,
    prerequisiteId: prereq1Id,
    isMet: true
  })
  
  // Check completion status
  const status = await t.query(api.studentPrerequisites.hasCompletedPrerequisiteEvaluations, {
    studentId
  })
  
  expect(status.total).toBe(3)
  expect(status.completed).toBe(1)
  expect(status.isComplete).toBe(false)
})

test("studentPrerequisites: hasCompletedPrerequisiteEvaluations - complete", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  const { prereq1Id, prereq2Id, prereq3Id, studentId } = await seedTestData(t)
  
  // Save all evaluations
  await t.mutation(api.studentPrerequisites.saveStudentPrerequisiteEvaluations, {
    studentId,
    evaluations: [
      { prerequisiteId: prereq1Id, isMet: true },
      { prerequisiteId: prereq2Id, isMet: false },
      { prerequisiteId: prereq3Id, isMet: true }
    ]
  })
  
  // Check completion status
  const status = await t.query(api.studentPrerequisites.hasCompletedPrerequisiteEvaluations, {
    studentId
  })
  
  expect(status.total).toBe(3)
  expect(status.completed).toBe(3)
  expect(status.isComplete).toBe(true)
})

test("studentPrerequisites: getPrerequisitesWithStudentEvaluations - with evaluations", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  const { prereq1Id, prereq2Id, studentId } = await seedTestData(t)
  
  // Save some evaluations
  await t.mutation(api.studentPrerequisites.saveStudentPrerequisiteEvaluation, {
    studentId,
    prerequisiteId: prereq1Id,
    isMet: true
  })
  
  // Get prerequisites with evaluations
  const prerequisitesWithEvaluations = await t.query(
    api.studentPrerequisites.getPrerequisitesWithStudentEvaluations,
    { studentId }
  )
  
  expect(prerequisitesWithEvaluations).toHaveLength(3)
  
  // Find the evaluated prerequisite
  const evaluatedPrereq = prerequisitesWithEvaluations.find(p => p._id === prereq1Id)
  const unevaluatedPrereq = prerequisitesWithEvaluations.find(p => p._id === prereq2Id)
  
  expect(evaluatedPrereq?.studentEvaluation).toBeDefined()
  expect(evaluatedPrereq?.studentEvaluation?.isMet).toBe(true)
  expect(unevaluatedPrereq?.studentEvaluation).toBeNull()
})

test("studentPrerequisites: different students have separate evaluations", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))
  
  const { prereq1Id } = await seedTestData(t)
  
  const student1Id = "student-1"
  const student2Id = "student-2"
  
  // Save evaluations for different students
  await t.mutation(api.studentPrerequisites.saveStudentPrerequisiteEvaluation, {
    studentId: student1Id,
    prerequisiteId: prereq1Id,
    isMet: true
  })
  
  await t.mutation(api.studentPrerequisites.saveStudentPrerequisiteEvaluation, {
    studentId: student2Id,
    prerequisiteId: prereq1Id,
    isMet: false
  })
  
  // Verify evaluations are separate
  const evaluation1 = await t.query(api.studentPrerequisites.getStudentPrerequisiteEvaluation, {
    studentId: student1Id,
    prerequisiteId: prereq1Id
  })
  
  const evaluation2 = await t.query(api.studentPrerequisites.getStudentPrerequisiteEvaluation, {
    studentId: student2Id,
    prerequisiteId: prereq1Id
  })
  
  expect(evaluation1?.isMet).toBe(true)
  expect(evaluation2?.isMet).toBe(false)
})