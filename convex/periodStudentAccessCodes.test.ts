/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, vi } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"
import { createTestSelectionPeriod } from "./share/admin_helpers"
import type { Id } from "./_generated/dataModel"
import * as SelectionPeriod from "./schemas/SelectionPeriod"

/**
 * Helper to create a period with a specific state for testing.
 * Creates period directly in the database to control the state.
 */
async function createPeriodWithState(
  t: ReturnType<typeof convexTest>,
  semesterId: string,
  kind: "inactive" | "open" | "closed" | "assigned"
): Promise<Id<"selectionPeriods">> {
  return await t.run(async (ctx: any) => {
    const now = Date.now()
    const futureClose = now + (30 * 24 * 60 * 60 * 1000)

    let period: SelectionPeriod.SelectionPeriod

    switch (kind) {
      case "inactive":
        period = SelectionPeriod.makeInactive({
          userId: "test-user",
          semesterId,
          title: "Test Inactive Period",
          description: "Test period in inactive state",
          openDate: now,
          closeDate: futureClose,
          shareableSlug: `test-inactive-${Date.now()}`,
        })
        break
      case "open":
        // For open period, we need a scheduled function ID
        // We'll schedule a dummy function to get a valid ID
        const scheduledId = await ctx.scheduler.runAt(
          futureClose,
          // Type cast required: scheduler expects internal function but we use a query for testing
          // This is a test-only pattern - the convex-test framework handles this
          api.selectionPeriods.getAllPeriodsWithStats as unknown as typeof api.selectionPeriods.getAllPeriodsWithStats,
          {}
        )
        period = SelectionPeriod.makeOpen({
          userId: "test-user",
          semesterId,
          title: "Test Open Period",
          description: "Test period in open state",
          openDate: now,
          closeDate: futureClose,
          shareableSlug: `test-open-${Date.now()}`,
          scheduledFunctionId: scheduledId,
        })
        break
      case "closed":
        period = SelectionPeriod.makeClosed({
          userId: "test-user",
          semesterId,
          title: "Test Closed Period",
          description: "Test period in closed state",
          openDate: now - (60 * 24 * 60 * 60 * 1000), // 60 days ago
          closeDate: now - (30 * 24 * 60 * 60 * 1000), // 30 days ago
          shareableSlug: `test-closed-${Date.now()}`,
        })
        break
      case "assigned":
        period = SelectionPeriod.makeAssigned({
          userId: "test-user",
          semesterId,
          title: "Test Assigned Period",
          description: "Test period in assigned state",
          openDate: now - (60 * 24 * 60 * 60 * 1000),
          closeDate: now - (30 * 24 * 60 * 60 * 1000),
          shareableSlug: `test-assigned-${Date.now()}`,
          assignmentBatchId: "test-batch-123",
        })
        break
    }

    return await ctx.db.insert("selectionPeriods", period)
  })
}

/**
 * Helper to add an access code to a period.
 */
async function addAccessCodeToPeriod(
  t: ReturnType<typeof convexTest>,
  periodId: Id<"selectionPeriods">,
  code: string
): Promise<void> {
  await t.run(async (ctx: any) => {
    await ctx.db.insert("periodStudentAllowList", {
      selectionPeriodId: periodId,
      studentId: code.toUpperCase(),
      addedAt: Date.now(),
      addedBy: "test@example.com",
    })
  })
}

// ============================================================================
// Test: Invalid code format (too short)
// ============================================================================
test("validateAccessCodeForPeriod: should return error for code that is too short", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createPeriodWithState(t, "2024-test", "open")

  // Test with a code that is too short (less than 6 characters)
  const result = await t.mutation(api.periodStudentAccessCodes.validateAccessCodeForPeriod, {
    code: "ABC12",  // Only 5 characters
    periodId,
  })

  expect(result.valid).toBe(false)
  expect(result.error).toBe("Code must be 6 alphanumeric characters")

  vi.useRealTimers()
})

// ============================================================================
// Test: Invalid code format (too long)
// ============================================================================
test("validateAccessCodeForPeriod: should return error for code that is too long", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createPeriodWithState(t, "2024-test", "open")

  // Test with a code that is too long (more than 6 characters)
  const result = await t.mutation(api.periodStudentAccessCodes.validateAccessCodeForPeriod, {
    code: "ABC1234",  // 7 characters
    periodId,
  })

  expect(result.valid).toBe(false)
  expect(result.error).toBe("Code must be 6 alphanumeric characters")

  vi.useRealTimers()
})

// ============================================================================
// Test: Invalid code format (special characters)
// ============================================================================
test("validateAccessCodeForPeriod: should return error for code with special characters", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createPeriodWithState(t, "2024-test", "open")

  // Test with a code containing special characters
  const result = await t.mutation(api.periodStudentAccessCodes.validateAccessCodeForPeriod, {
    code: "ABC@#$",  // Contains special characters
    periodId,
  })

  expect(result.valid).toBe(false)
  expect(result.error).toBe("Code must be 6 alphanumeric characters")

  vi.useRealTimers()
})

// ============================================================================
// Test: Invalid code format (spaces)
// ============================================================================
test("validateAccessCodeForPeriod: should return error for code with spaces", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createPeriodWithState(t, "2024-test", "open")

  // Test with a code containing spaces (after trim, it won't be 6 chars)
  const result = await t.mutation(api.periodStudentAccessCodes.validateAccessCodeForPeriod, {
    code: "AB C12",  // Contains space
    periodId,
  })

  expect(result.valid).toBe(false)
  expect(result.error).toBe("Code must be 6 alphanumeric characters")

  vi.useRealTimers()
})

// ============================================================================
// Test: Non-existent code
// ============================================================================
test("validateAccessCodeForPeriod: should return error for non-existent code", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createPeriodWithState(t, "2024-test", "open")

  // Test with a valid format but non-existent code
  const result = await t.mutation(api.periodStudentAccessCodes.validateAccessCodeForPeriod, {
    code: "XYZ789",  // Valid format but doesn't exist
    periodId,
  })

  expect(result.valid).toBe(false)
  expect(result.error).toBe("Invalid access code")

  vi.useRealTimers()
})

// ============================================================================
// Test: Code belongs to different period
// ============================================================================
test("validateAccessCodeForPeriod: should return error when code belongs to different period", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  // Create two periods
  const period1Id = await createPeriodWithState(t, "2024-semester1", "open")
  const period2Id = await createPeriodWithState(t, "2024-semester2", "open")

  // Add code to period1
  const testCode = "ABC123"
  await addAccessCodeToPeriod(t, period1Id, testCode)

  // Try to validate the code against period2 (different period)
  const result = await t.mutation(api.periodStudentAccessCodes.validateAccessCodeForPeriod, {
    code: testCode,
    periodId: period2Id,  // Wrong period
  })

  expect(result.valid).toBe(false)
  expect(result.error).toBe("This code is not valid for this selection period")

  vi.useRealTimers()
})

// ============================================================================
// Test: Period is inactive (not open state)
// ============================================================================
test("validateAccessCodeForPeriod: should return error when period is inactive", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createPeriodWithState(t, "2024-test", "inactive")

  // Add a valid code to this period
  const testCode = "TEST01"
  await addAccessCodeToPeriod(t, periodId, testCode)

  // Try to validate - should fail because period is not open
  const result = await t.mutation(api.periodStudentAccessCodes.validateAccessCodeForPeriod, {
    code: testCode,
    periodId,
  })

  expect(result.valid).toBe(false)
  expect(result.error).toBe("This selection period is not currently accepting applications")

  vi.useRealTimers()
})

// ============================================================================
// Test: Period is closed (not open state)
// ============================================================================
test("validateAccessCodeForPeriod: should return error when period is closed", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createPeriodWithState(t, "2024-test", "closed")

  // Add a valid code to this period
  const testCode = "TEST02"
  await addAccessCodeToPeriod(t, periodId, testCode)

  // Try to validate - should fail because period is closed
  const result = await t.mutation(api.periodStudentAccessCodes.validateAccessCodeForPeriod, {
    code: testCode,
    periodId,
  })

  expect(result.valid).toBe(false)
  expect(result.error).toBe("This selection period is not currently accepting applications")

  vi.useRealTimers()
})

// ============================================================================
// Test: Period is assigned (not open state)
// ============================================================================
test("validateAccessCodeForPeriod: should return error when period is assigned", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createPeriodWithState(t, "2024-test", "assigned")

  // Add a valid code to this period
  const testCode = "TEST03"
  await addAccessCodeToPeriod(t, periodId, testCode)

  // Try to validate - should fail because period is assigned (not open)
  const result = await t.mutation(api.periodStudentAccessCodes.validateAccessCodeForPeriod, {
    code: testCode,
    periodId,
  })

  expect(result.valid).toBe(false)
  expect(result.error).toBe("This selection period is not currently accepting applications")

  vi.useRealTimers()
})

// ============================================================================
// Test: Valid code and open period - SUCCESS
// ============================================================================
test("validateAccessCodeForPeriod: should return valid:true for correct code and open period", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createPeriodWithState(t, "2024-test", "open")

  // Add a valid code to this period
  const testCode = "VALID1"
  await addAccessCodeToPeriod(t, periodId, testCode)

  // Validate - should succeed
  const result = await t.mutation(api.periodStudentAccessCodes.validateAccessCodeForPeriod, {
    code: testCode,
    periodId,
  })

  expect(result.valid).toBe(true)
  expect(result.error).toBeUndefined()

  vi.useRealTimers()
})

// ============================================================================
// Test: Code normalization (lowercase input should work)
// ============================================================================
test("validateAccessCodeForPeriod: should normalize lowercase code to uppercase", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createPeriodWithState(t, "2024-test", "open")

  // Add a valid code (stored as uppercase)
  const testCode = "UPPER1"
  await addAccessCodeToPeriod(t, periodId, testCode)

  // Validate with lowercase input - should still succeed
  const result = await t.mutation(api.periodStudentAccessCodes.validateAccessCodeForPeriod, {
    code: "upper1",  // lowercase
    periodId,
  })

  expect(result.valid).toBe(true)
  expect(result.error).toBeUndefined()

  vi.useRealTimers()
})

// ============================================================================
// Test: Code normalization (mixed case input should work)
// ============================================================================
test("validateAccessCodeForPeriod: should normalize mixed case code", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createPeriodWithState(t, "2024-test", "open")

  // Add a valid code
  const testCode = "MIXD01"
  await addAccessCodeToPeriod(t, periodId, testCode)

  // Validate with mixed case input
  const result = await t.mutation(api.periodStudentAccessCodes.validateAccessCodeForPeriod, {
    code: "MiXd01",  // Mixed case
    periodId,
  })

  expect(result.valid).toBe(true)
  expect(result.error).toBeUndefined()

  vi.useRealTimers()
})

// ============================================================================
// Test: Code with leading/trailing whitespace should be trimmed
// ============================================================================
test("validateAccessCodeForPeriod: should trim whitespace from code", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createPeriodWithState(t, "2024-test", "open")

  // Add a valid code
  const testCode = "TRIM01"
  await addAccessCodeToPeriod(t, periodId, testCode)

  // Validate with whitespace around code
  const result = await t.mutation(api.periodStudentAccessCodes.validateAccessCodeForPeriod, {
    code: "  TRIM01  ",  // With whitespace
    periodId,
  })

  expect(result.valid).toBe(true)
  expect(result.error).toBeUndefined()

  vi.useRealTimers()
})

// ============================================================================
// Test: Empty code
// ============================================================================
test("validateAccessCodeForPeriod: should return error for empty code", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createPeriodWithState(t, "2024-test", "open")

  // Test with empty code
  const result = await t.mutation(api.periodStudentAccessCodes.validateAccessCodeForPeriod, {
    code: "",
    periodId,
  })

  expect(result.valid).toBe(false)
  expect(result.error).toBe("Code must be 6 alphanumeric characters")

  vi.useRealTimers()
})

// ============================================================================
// Test: Whitespace-only code
// ============================================================================
test("validateAccessCodeForPeriod: should return error for whitespace-only code", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const periodId = await createPeriodWithState(t, "2024-test", "open")

  // Test with whitespace-only code (will be trimmed to empty)
  const result = await t.mutation(api.periodStudentAccessCodes.validateAccessCodeForPeriod, {
    code: "      ",
    periodId,
  })

  expect(result.valid).toBe(false)
  expect(result.error).toBe("Code must be 6 alphanumeric characters")

  vi.useRealTimers()
})
