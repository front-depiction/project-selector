import { mutation, query, QueryCtx } from "./_generated/server"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"

/**
 * Character set for generating access codes.
 * Excludes confusing characters: 0, O, 1, I, L
 * 32 characters ^ 6 positions = ~1 billion combinations
 */
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/**
 * Generate a random 6-character alphanumeric access code.
 * Human-friendly: avoids confusing characters like 0/O, 1/I/L
 */
function generateAccessCode(): string {
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  }
  return code
}

/**
 * Generate multiple unique student access codes for a selection period.
 * These codes are anonymous - teacher maps them to student names locally.
 * Students with these codes can access ALL topics in the period's semester.
 * 
 * @returns Object with generated codes array and total count
 */
export const generateStudentAccessCodes = mutation({
  args: {
    selectionPeriodId: v.id("selectionPeriods"),
    count: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const addedBy = identity?.email ?? "system"

    if (args.count < 1 || args.count > 500) {
      throw new Error("Count must be between 1 and 500")
    }

    // Verify period exists
    const period = await ctx.db.get(args.selectionPeriodId)
    if (!period) {
      throw new Error("Selection period not found")
    }

    // Get existing codes to avoid duplicates
    const existingEntries = await ctx.db
      .query("periodStudentAllowList")
      .withIndex("by_period", (q) => q.eq("selectionPeriodId", args.selectionPeriodId))
      .collect()

    const existingCodes = new Set(existingEntries.map(e => e.studentId))
    const generatedCodes: string[] = []

    for (let i = 0; i < args.count; i++) {
      let code: string
      let attempts = 0
      const maxAttempts = 100

      // Generate unique code
      do {
        code = generateAccessCode()
        attempts++
        if (attempts > maxAttempts) {
          throw new Error("Failed to generate unique code after maximum attempts")
        }
      } while (existingCodes.has(code))

      existingCodes.add(code)

      // Insert into period allow list
      await ctx.db.insert("periodStudentAllowList", {
        selectionPeriodId: args.selectionPeriodId,
        studentId: code,
        addedAt: Date.now(),
        addedBy,
      })

      generatedCodes.push(code)
    }

    return {
      codes: generatedCodes,
      total: generatedCodes.length,
    }
  },
})

/**
 * Get all access codes for a period (for teacher to download/view)
 */
export const getPeriodAccessCodes = query({
  args: { selectionPeriodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("periodStudentAllowList")
      .withIndex("by_period", (q) => q.eq("selectionPeriodId", args.selectionPeriodId))
      .collect()

    return entries.map(e => ({
      _id: e._id,
      code: e.studentId,
      addedAt: e.addedAt,
      addedBy: e.addedBy,
    }))
  },
})

/**
 * Validate an access code format and check if it exists
 */
export const validateAccessCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.code.toUpperCase().trim()

    // Check format: 6 characters, alphanumeric
    if (!/^[A-Z0-9]{6}$/.test(normalized)) {
      return { valid: false, error: "Code must be 6 alphanumeric characters" }
    }

    // Check if code exists in period allow list
    const entry = await ctx.db
      .query("periodStudentAllowList")
      .withIndex("by_studentId", (q) => q.eq("studentId", normalized))
      .first()

    if (!entry) {
      return { valid: false, error: "Code not found" }
    }

    return { valid: true, normalizedCode: normalized, selectionPeriodId: entry.selectionPeriodId }
  },
})

/**
 * Get period info for a valid access code (for student entry)
 */
export const getPeriodForAccessCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.code.toUpperCase().trim()

    const entry = await ctx.db
      .query("periodStudentAllowList")
      .withIndex("by_studentId", (q) => q.eq("studentId", normalized))
      .first()

    if (!entry) return null

    const period = await ctx.db.get(entry.selectionPeriodId)
    return period
  },
})

/**
 * Remove a single access code from a period
 */
export const removeStudentCode = mutation({
  args: {
    selectionPeriodId: v.id("selectionPeriods"),
    studentId: v.string(),
  },
  handler: async (ctx, args) => {
    const normalized = args.studentId.toUpperCase().trim()

    const entry = await ctx.db
      .query("periodStudentAllowList")
      .withIndex("by_period_studentId", (q) =>
        q.eq("selectionPeriodId", args.selectionPeriodId)
          .eq("studentId", normalized)
      )
      .first()

    if (entry) {
      await ctx.db.delete(entry._id)
      return { success: true }
    }

    return { success: false, error: "Code not found" }
  },
})

/**
 * Clear all access codes for a period
 */
export const clearAllStudentCodes = mutation({
  args: { selectionPeriodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("periodStudentAllowList")
      .withIndex("by_period", (q) => q.eq("selectionPeriodId", args.selectionPeriodId))
      .collect()

    await Promise.all(entries.map(e => ctx.db.delete(e._id)))

    return { deleted: entries.length }
  },
})

/**
 * Get count of access codes for a period
 */
export const getAccessCodeCount = query({
  args: { selectionPeriodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("periodStudentAllowList")
      .withIndex("by_period", (q) => q.eq("selectionPeriodId", args.selectionPeriodId))
      .collect()

    return entries.length
  },
})

/**
 * Check if a student ID is allowed for a topic.
 * Students get access via period-level allow lists only.
 * A student with a code for a period can access ALL topics in that period's semester.
 */
export async function isStudentAllowedForTopic(
  ctx: QueryCtx,
  topicId: Id<"topics">,
  studentId: string
): Promise<boolean> {
  const normalized = studentId.trim().toUpperCase()

  // Get the topic to find its semester
  const topic = await ctx.db.get(topicId)
  if (!topic) return false

  // Find all periods for this semester (not just active ones, to support closed periods too)
  const periods = await ctx.db
    .query("selectionPeriods")
    .withIndex("by_semester", (q) => q.eq("semesterId", topic.semesterId))
    .collect()

  if (periods.length === 0) return false

  // Check if student has access via any period-level allow list for this semester
  for (const period of periods) {
    const periodEntry = await ctx.db
      .query("periodStudentAllowList")
      .withIndex("by_period_studentId", (q) =>
        q.eq("selectionPeriodId", period._id).eq("studentId", normalized)
      )
      .first()

    if (periodEntry !== null) return true
  }

  return false
}

/**
 * Query version of isStudentAllowedForTopic
 */
export const checkStudentAccess = query({
  args: {
    topicId: v.id("topics"),
    studentId: v.string(),
  },
  handler: async (ctx, args) => {
    return await isStudentAllowedForTopic(ctx, args.topicId, args.studentId)
  },
})
