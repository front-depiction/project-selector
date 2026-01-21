/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, vi } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"
import { createTestSelectionPeriod } from "./share/admin_helpers"
import type { Id } from "./_generated/dataModel"

async function createTestPeriod(t: ReturnType<typeof convexTest>) {
  const semesterId = "2024-spring"
  const now = Date.now()
  const futureClose = now + (30 * 24 * 60 * 60 * 1000)

  return await t.run(async (ctx: any) => {
    return await createTestSelectionPeriod(ctx, semesterId, now, futureClose)
  })
}

test("periodStudentAccessCodes: generateStudentAccessCodes creates unique codes", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createTestPeriod(t)

  const result = await t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
    selectionPeriodId: periodId,
    count: 10
  })

  expect(result).toBeDefined()
  expect(result.total).toBe(10)
  expect(result.codes).toHaveLength(10)

  // Verify all codes are unique
  const uniqueCodes = new Set(result.codes)
  expect(uniqueCodes.size).toBe(10)

  // Verify all codes are 6 characters
  result.codes.forEach(code => {
    expect(code.length).toBe(6)
    expect(/^[A-Z0-9]{6}$/.test(code)).toBe(true)
  })

  vi.useRealTimers()
})

test("periodStudentAccessCodes: generateStudentAccessCodes rejects invalid count", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createTestPeriod(t)

  await expect(
    t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
      selectionPeriodId: periodId,
      count: 0
    })
  ).rejects.toThrow("Count must be between 1 and 500")

  await expect(
    t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
      selectionPeriodId: periodId,
      count: 501
    })
  ).rejects.toThrow("Count must be between 1 and 500")

  vi.useRealTimers()
})

test("periodStudentAccessCodes: generateStudentAccessCodes throws error for non-existent period", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  // Create a real period ID format but don't insert it
  // Convex will validate the ID format first, so we need a valid format
  // The actual error will be from the handler checking if period exists
  const periodId = await createTestPeriod(t)
  await t.run(async (ctx: any) => {
    await ctx.db.delete(periodId)
  })

  await expect(
    t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
      selectionPeriodId: periodId,
      count: 5
    })
  ).rejects.toThrow("Selection period not found")

  vi.useRealTimers()
})

test("periodStudentAccessCodes: getPeriodAccessCodes returns all codes for period", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createTestPeriod(t)

  const generateResult = await t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
    selectionPeriodId: periodId,
    count: 5
  })

  const codes = await t.query(api.periodStudentAccessCodes.getPeriodAccessCodes, {
    selectionPeriodId: periodId
  })

  expect(codes).toBeDefined()
  expect(codes.length).toBe(5)
  expect(codes.every(c => c.code)).toBe(true)
  expect(codes.every(c => c.addedAt)).toBe(true)

  const returnedCodes = codes.map(c => c.code).sort()
  expect(returnedCodes).toEqual([...generateResult.codes].sort())

  vi.useRealTimers()
})

test("periodStudentAccessCodes: validateAccessCode validates format", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createTestPeriod(t)

  // Generate a code
  const result = await t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
    selectionPeriodId: periodId,
    count: 1
  })
  const validCode = result.codes[0]

  // Test valid code
  const validResult = await t.query(api.periodStudentAccessCodes.validateAccessCode, {
    code: validCode
  })
  expect(validResult.valid).toBe(true)
  expect(validResult.normalizedCode).toBe(validCode.toUpperCase())
  expect(validResult.selectionPeriodId).toBe(periodId)

  // Test invalid format
  const invalidFormat = await t.query(api.periodStudentAccessCodes.validateAccessCode, {
    code: "ABC1234" // 7 characters
  })
  expect(invalidFormat.valid).toBe(false)
  expect(invalidFormat.error).toBe("Code must be 6 alphanumeric characters")

  // Test non-existent code
  const nonExistent = await t.query(api.periodStudentAccessCodes.validateAccessCode, {
    code: "ABCDEF"
  })
  expect(nonExistent.valid).toBe(false)
  expect(nonExistent.error).toBe("Code not found")

  vi.useRealTimers()
})

test("periodStudentAccessCodes: validateAccessCode normalizes input", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createTestPeriod(t)

  const result = await t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
    selectionPeriodId: periodId,
    count: 1
  })
  const validCode = result.codes[0]

  // Test lowercase and spaces
  const normalized = await t.query(api.periodStudentAccessCodes.validateAccessCode, {
    code: `  ${validCode.toLowerCase()}  `
  })

  expect(normalized.valid).toBe(true)
  expect(normalized.normalizedCode).toBe(validCode.toUpperCase())

  vi.useRealTimers()
})

test("periodStudentAccessCodes: getPeriodForAccessCode returns period info", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createTestPeriod(t)

  const result = await t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
    selectionPeriodId: periodId,
    count: 1
  })

  const period = await t.query(api.periodStudentAccessCodes.getPeriodForAccessCode, {
    code: result.codes[0]
  })

  expect(period).toBeDefined()
  expect(period?._id).toBe(periodId)

  vi.useRealTimers()
})

test("periodStudentAccessCodes: getPeriodForAccessCode returns null for invalid code", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const period = await t.query(api.periodStudentAccessCodes.getPeriodForAccessCode, {
    code: "INVALID"
  })

  expect(period).toBeNull()

  vi.useRealTimers()
})

test("periodStudentAccessCodes: removeStudentCode removes a single code", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createTestPeriod(t)

  const result = await t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
    selectionPeriodId: periodId,
    count: 3
  })

  const codeToRemove = result.codes[0]

  const removeResult = await t.mutation(api.periodStudentAccessCodes.removeStudentCode, {
    selectionPeriodId: periodId,
    studentId: codeToRemove
  })

  expect(removeResult.success).toBe(true)

  // Verify code was removed
  const codes = await t.query(api.periodStudentAccessCodes.getPeriodAccessCodes, {
    selectionPeriodId: periodId
  })

  expect(codes.length).toBe(2)
  expect(codes.every(c => c.code !== codeToRemove)).toBe(true)

  vi.useRealTimers()
})

test("periodStudentAccessCodes: clearAllStudentCodes removes all codes", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createTestPeriod(t)

  await t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
    selectionPeriodId: periodId,
    count: 10
  })

  const clearResult = await t.mutation(api.periodStudentAccessCodes.clearAllStudentCodes, {
    selectionPeriodId: periodId
  })

  expect(clearResult.deleted).toBe(10)

  const codes = await t.query(api.periodStudentAccessCodes.getPeriodAccessCodes, {
    selectionPeriodId: periodId
  })

  expect(codes.length).toBe(0)

  vi.useRealTimers()
})

test("periodStudentAccessCodes: getAccessCodeCount returns correct count", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createTestPeriod(t)

  expect(await t.query(api.periodStudentAccessCodes.getAccessCodeCount, { selectionPeriodId: periodId })).toBe(0)

  await t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
    selectionPeriodId: periodId,
    count: 5
  })

  expect(await t.query(api.periodStudentAccessCodes.getAccessCodeCount, { selectionPeriodId: periodId })).toBe(5)

  await t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
    selectionPeriodId: periodId,
    count: 3
  })

  expect(await t.query(api.periodStudentAccessCodes.getAccessCodeCount, { selectionPeriodId: periodId })).toBe(8)

  vi.useRealTimers()
})

test("periodStudentAccessCodes: periodNeedsNames returns true when codes exist without names", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createTestPeriod(t)

  await t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
    selectionPeriodId: periodId,
    count: 3
  })

  const needsNames = await t.query(api.periodStudentAccessCodes.periodNeedsNames, {
    selectionPeriodId: periodId
  })

  expect(needsNames).toBe(true)

  vi.useRealTimers()
})

test("periodStudentAccessCodes: periodNeedsNames returns false when no codes exist", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createTestPeriod(t)

  const needsNames = await t.query(api.periodStudentAccessCodes.periodNeedsNames, {
    selectionPeriodId: periodId
  })

  expect(needsNames).toBe(false)

  vi.useRealTimers()
})

test("periodStudentAccessCodes: checkStudentAccess validates student access to topic", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"
  const now = Date.now()
  const futureClose = now + (30 * 24 * 60 * 60 * 1000)

  const { periodId, topicId } = await t.run(async (ctx: any) => {
    const periodId = await createTestSelectionPeriod(ctx, semesterId, now, futureClose)
    
    // Create a topic
    const topicId = await ctx.db.insert("topics", {
      title: "Test Topic",
      description: "Test",
      semesterId,
      isActive: true
    })

    return { periodId, topicId }
  })

  const result = await t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
    selectionPeriodId: periodId,
    count: 1
  })

  const studentCode = result.codes[0]

  // Student with valid code should have access
  const hasAccess = await t.query(api.periodStudentAccessCodes.checkStudentAccess, {
    topicId,
    studentId: studentCode
  })

  expect(hasAccess).toBe(true)

  // Invalid code should not have access
  const noAccess = await t.query(api.periodStudentAccessCodes.checkStudentAccess, {
    topicId,
    studentId: "INVALID"
  })

  expect(noAccess).toBe(false)

  vi.useRealTimers()
})

test("periodStudentAccessCodes: getStudentDisplayName returns name if available", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const authenticatedT = t.withIdentity({
    subject: "auth0|123456",
    email: "teacher@example.com",
    name: "Test Teacher"
  })

  const periodId = await createTestPeriod(t)

  const result = await t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
    selectionPeriodId: periodId,
    count: 1
  })

  const code = result.codes[0]

  // Initially should return code
  let displayName = await authenticatedT.query(api.periodStudentAccessCodes.getStudentDisplayName, {
    studentId: code
  })
  expect(displayName).toBe(code.toUpperCase())

  // Update with name
  await authenticatedT.mutation(api.periodStudentAccessCodes.updateStudentName, {
    selectionPeriodId: periodId,
    studentId: code,
    name: "John Doe"
  })

  // Should return name
  displayName = await authenticatedT.query(api.periodStudentAccessCodes.getStudentDisplayName, {
    studentId: code
  })
  expect(displayName).toBe("John Doe")

  vi.useRealTimers()
})

test("periodStudentAccessCodes: getStudentDisplayNames returns batch of names", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const authenticatedT = t.withIdentity({
    subject: "auth0|123456",
    email: "teacher@example.com",
    name: "Test Teacher"
  })

  const periodId = await createTestPeriod(t)

  const result = await t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
    selectionPeriodId: periodId,
    count: 3
  })

  const codes = result.codes

  // Update names for some
  await authenticatedT.mutation(api.periodStudentAccessCodes.updateStudentName, {
    selectionPeriodId: periodId,
    studentId: codes[0],
    name: "Alice"
  })

  await authenticatedT.mutation(api.periodStudentAccessCodes.updateStudentName, {
    selectionPeriodId: periodId,
    studentId: codes[1],
    name: "Bob"
  })

  const displayNames = await authenticatedT.query(api.periodStudentAccessCodes.getStudentDisplayNames, {
    studentIds: codes,
    periodId
  })

  expect(displayNames[codes[0].toUpperCase()]).toBe("Alice")
  expect(displayNames[codes[1].toUpperCase()]).toBe("Bob")
  expect(displayNames[codes[2].toUpperCase()]).toBe(codes[2].toUpperCase()) // No name set

  vi.useRealTimers()
})

test("periodStudentAccessCodes: updateStudentName updates name", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const authenticatedT = t.withIdentity({
    subject: "auth0|123456",
    email: "teacher@example.com",
    name: "Test Teacher"
  })

  const periodId = await createTestPeriod(t)

  const result = await t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
    selectionPeriodId: periodId,
    count: 1
  })

  const code = result.codes[0]

  const updateResult = await authenticatedT.mutation(api.periodStudentAccessCodes.updateStudentName, {
    selectionPeriodId: periodId,
    studentId: code,
    name: "Student Name"
  })

  expect(updateResult.success).toBe(true)

  const codes = await t.query(api.periodStudentAccessCodes.getPeriodAccessCodes, {
    selectionPeriodId: periodId
  })

  expect(codes[0].name).toBe("Student Name")

  vi.useRealTimers()
})

test("periodStudentAccessCodes: importStudentNames imports multiple names", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const authenticatedT = t.withIdentity({
    subject: "auth0|123456",
    email: "teacher@example.com",
    name: "Test Teacher"
  })

  const periodId = await createTestPeriod(t)

  const result = await t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
    selectionPeriodId: periodId,
    count: 3
  })

  const codes = result.codes

  const importResult = await authenticatedT.mutation(api.periodStudentAccessCodes.importStudentNames, {
    selectionPeriodId: periodId,
    nameMappings: [
      { code: codes[0], name: "Alice" },
      { code: codes[1], name: "Bob" },
      { code: codes[2], name: "Charlie" }
    ]
  })

  expect(importResult.updated).toBe(3)

  const displayNames = await authenticatedT.query(api.periodStudentAccessCodes.getStudentDisplayNames, {
    studentIds: codes,
    periodId
  })

  expect(displayNames[codes[0].toUpperCase()]).toBe("Alice")
  expect(displayNames[codes[1].toUpperCase()]).toBe("Bob")
  expect(displayNames[codes[2].toUpperCase()]).toBe("Charlie")

  vi.useRealTimers()
})

test("periodStudentAccessCodes: importStudentNames handles errors gracefully", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const authenticatedT = t.withIdentity({
    subject: "auth0|123456",
    email: "teacher@example.com",
    name: "Test Teacher"
  })

  const periodId = await createTestPeriod(t)

  const result = await t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
    selectionPeriodId: periodId,
    count: 1
  })

  const code = result.codes[0]

  const importResult = await authenticatedT.mutation(api.periodStudentAccessCodes.importStudentNames, {
    selectionPeriodId: periodId,
    nameMappings: [
      { code, name: "Valid" },
      { code: "INVALID", name: "Invalid Code" }
    ]
  })

  expect(importResult.updated).toBe(1)
  expect(importResult.errors).toBeDefined()
  expect(importResult.errors?.length).toBeGreaterThan(0)

  vi.useRealTimers()
})

test("periodStudentAccessCodes: batchCheckPeriodsNeedNames checks multiple periods", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId1 = await createTestPeriod(t)
  
  const semesterId2 = "2024-fall"
  const now = Date.now()
  const futureClose = now + (30 * 24 * 60 * 60 * 1000)
  const periodId2 = await t.run(async (ctx: any) => {
    return await createTestSelectionPeriod(ctx, semesterId2, now, futureClose)
  })

  // Generate codes for period 1 only
  await t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
    selectionPeriodId: periodId1,
    count: 3
  })

  const result = await t.query(api.periodStudentAccessCodes.batchCheckPeriodsNeedNames, {
    periodIds: [periodId1, periodId2]
  })

  expect(result[periodId1]).toBe(true) // Has codes, no names
  expect(result[periodId2]).toBe(false) // No codes

  vi.useRealTimers()
})

test("periodStudentAccessCodes: batchCheckPeriodsReadyForAssignment checks questionnaire completion", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"
  const now = Date.now()
  const futureClose = now + (30 * 24 * 60 * 60 * 1000)

  const { periodId, questionId } = await t.run(async (ctx: any) => {
    const periodId = await createTestSelectionPeriod(ctx, semesterId, now, futureClose)
    
    // Create a category and question linked to the period
    const categoryId = await ctx.db.insert("categories", {
      name: "Test Category",
      semesterId,
      createdAt: Date.now()
    })

    const questionId = await ctx.db.insert("questions", {
      question: "Test question",
      kind: "boolean" as const,
      semesterId,
      category: "Test Category",
      createdAt: Date.now()
    })

    // Link category to period
    await ctx.db.patch(periodId, {
      minimizeCategoryIds: [categoryId]
    })

    return { periodId, questionId }
  })

  const result = await t.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
    selectionPeriodId: periodId,
    count: 2
  })

  const codes = result.codes

  // Initially not ready (no answers)
  let readyCheck = await t.query(api.periodStudentAccessCodes.batchCheckPeriodsReadyForAssignment, {
    periodIds: [periodId]
  })

  expect(readyCheck[periodId]).toBe(false)

  // Add answers for all students
  for (const code of codes) {
    await t.mutation(api.studentAnswers.saveAnswers, {
      studentId: code,
      selectionPeriodId: periodId,
      answers: [{
        questionId,
        kind: "boolean",
        value: true
      }]
    })
  }

  // Now should be ready
  readyCheck = await t.query(api.periodStudentAccessCodes.batchCheckPeriodsReadyForAssignment, {
    periodIds: [periodId]
  })

  expect(readyCheck[periodId]).toBe(true)

  vi.useRealTimers()
})
