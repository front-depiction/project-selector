import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

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
 * Generate multiple unique student access codes for a topic.
 * These codes are anonymous - teacher maps them to student names locally.
 * 
 * @returns Object with generated codes array and total count
 */
export const generateStudentAccessCodes = mutation({
  args: {
    topicId: v.id("topics"),
    count: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const addedBy = identity?.email ?? "system"

    if (args.count < 1 || args.count > 500) {
      throw new Error("Count must be between 1 and 500")
    }

    // Get existing codes to avoid duplicates
    const existingEntries = await ctx.db
      .query("topicStudentAllowList")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
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

      // Insert into allow list
      await ctx.db.insert("topicStudentAllowList", {
        topicId: args.topicId,
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
 * Get all access codes for a topic (for teacher to download/view)
 */
export const getTopicAccessCodes = query({
  args: { topicId: v.id("topics") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("topicStudentAllowList")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
      .collect()

    return entries.map(e => ({
      code: e.studentId,
      addedAt: e.addedAt,
      addedBy: e.addedBy,
    }))
  },
})

/**
 * Validate an access code format (6 alphanumeric characters)
 */
export const validateAccessCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.code.toUpperCase().trim()
    
    // Check format: 6 characters, alphanumeric
    if (!/^[A-Z0-9]{6}$/.test(normalized)) {
      return { valid: false, error: "Code must be 6 alphanumeric characters" }
    }

    // Check if code exists in any topic
    const entry = await ctx.db
      .query("topicStudentAllowList")
      .withIndex("by_studentId", (q) => q.eq("studentId", normalized))
      .first()

    if (!entry) {
      return { valid: false, error: "Code not found" }
    }

    return { valid: true, normalizedCode: normalized }
  },
})

/**
 * Get topic info for a valid access code (for student entry)
 */
export const getTopicForAccessCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.code.toUpperCase().trim()

    const entry = await ctx.db
      .query("topicStudentAllowList")
      .withIndex("by_studentId", (q) => q.eq("studentId", normalized))
      .first()

    if (!entry) return null

    const topic = await ctx.db.get(entry.topicId)
    return topic
  },
})
