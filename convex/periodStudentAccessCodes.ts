import { mutation, query, QueryCtx } from "./_generated/server"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"

/**
 * Helper function to get question IDs for a period based on linked categories.
 * 
 * Questions are derived from categories linked to:
 * 1. The period via `minimizeCategoryIds` (Balance Distribution - minimize criterion)
 * 2. Any topic in the period's semester via `constraintIds` (Topic-Specific - prerequisite/pull criteria)
 */
async function getQuestionIdsForPeriod(
  ctx: QueryCtx,
  selectionPeriodId: Id<"selectionPeriods">
): Promise<Set<Id<"questions">>> {
  // Get the period
  const period = await ctx.db.get(selectionPeriodId)
  if (!period) return new Set()

  // Get all topics for this semester
  const topics = await ctx.db
    .query("topics")
    .withIndex("by_semester", q => q.eq("semesterId", period.semesterId))
    .collect()

  // Collect all category IDs from period and topics
  const categoryIds = new Set<Id<"categories">>()
  
  // From period (balance distribution - minimize categories)
  if (period.minimizeCategoryIds) {
    period.minimizeCategoryIds.forEach(id => categoryIds.add(id))
  }
  
  // From topics (topic-specific criteria - prerequisite and pull categories)
  for (const topic of topics) {
    if (topic.constraintIds) {
      topic.constraintIds.forEach(id => categoryIds.add(id))
    }
  }

  // If no categories are linked, return empty set
  if (categoryIds.size === 0) return new Set()

  // Get category names from those IDs
  const categoryNames = new Set<string>()
  for (const categoryId of categoryIds) {
    const category = await ctx.db.get(categoryId)
    if (category) {
      categoryNames.add(category.name)
    }
  }

  // If no valid category names found, return empty set
  if (categoryNames.size === 0) return new Set()

  // Get questions matching those category names (same semester)
  const allQuestions = await ctx.db
    .query("questions")
    .withIndex("by_semester", q => q.eq("semesterId", period.semesterId))
    .collect()

  const matchingQuestionIds = new Set<Id<"questions">>()
  for (const q of allQuestions) {
    if (categoryNames.has(q.category)) {
      matchingQuestionIds.add(q._id)
    }
  }

  return matchingQuestionIds
}

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
      name: e.name,
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
 * Validate an access code for a specific selection period.
 * Ensures the code belongs to the specified period and the period is open.
 *
 * @category Mutations
 * @since 0.3.0
 */
export const validateAccessCodeForPeriod = mutation({
  args: {
    code: v.string(),
    periodId: v.id("selectionPeriods"),
  },
  handler: async (ctx, args): Promise<{ valid: boolean; error?: string }> => {
    // Normalize code
    const normalizedCode = args.code.toUpperCase().trim()

    // Check format: 6 characters, alphanumeric
    if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) {
      return { valid: false, error: "Code must be 6 alphanumeric characters" }
    }

    // Find the access code entry
    const entry = await ctx.db
      .query("periodStudentAllowList")
      .withIndex("by_studentId", (q) => q.eq("studentId", normalizedCode))
      .first()

    if (!entry) {
      return { valid: false, error: "Invalid access code" }
    }

    // Check if code belongs to the specified period
    if (entry.selectionPeriodId !== args.periodId) {
      return { valid: false, error: "This code is not valid for this selection period" }
    }

    // Check period is open
    const period = await ctx.db.get(args.periodId)
    if (!period || period.kind !== "open") {
      return { valid: false, error: "This selection period is not currently accepting applications" }
    }

    return { valid: true }
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
 * Check if a period needs names (has codes but no names).
 * Returns true if period has access codes but none have names assigned.
 * 
 * @category Queries
 * @since 0.3.0
 */
export const periodNeedsNames = query({
  args: { selectionPeriodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("periodStudentAllowList")
      .withIndex("by_period", (q) => q.eq("selectionPeriodId", args.selectionPeriodId))
      .collect()

    if (entries.length === 0) return false // No codes, so no names needed
    
    // Check if any entry has a name
    const hasAnyName = entries.some(entry => entry.name && entry.name.trim().length > 0)
    
    // Needs names if we have codes but no names
    return !hasAnyName
  },
})

/**
 * Batch check which periods need names.
 * Returns a map of periodId -> boolean (true if needs names).
 * 
 * @category Queries
 * @since 0.3.0
 */
/**
 * Batch check if all questionnaires are complete for multiple periods
 */
export const batchCheckPeriodsReadyForAssignment = query({
  args: { periodIds: v.array(v.id("selectionPeriods")) },
  handler: async (ctx, args) => {
    const result: Record<string, boolean> = {}
    
    for (const periodId of args.periodIds) {
      // Get all question IDs for this period (derived from linked categories)
      const questionIds = await getQuestionIdsForPeriod(ctx, periodId)
      const requiredCount = questionIds.size

      // If no questions, skip (can't be ready)
      if (requiredCount === 0) {
        result[periodId] = false
        continue
      }

      // Get all students for this period
      const periodAllowListEntries = await ctx.db
        .query("periodStudentAllowList")
        .withIndex("by_period", q => q.eq("selectionPeriodId", periodId))
        .collect()

      const studentIds = new Set<string>()
      for (const entry of periodAllowListEntries) {
        studentIds.add(entry.studentId)
      }

      // If no students, not ready
      if (studentIds.size === 0) {
        result[periodId] = false
        continue
      }

      // Get all answers for this period
      const allAnswers = await ctx.db.query("studentAnswers")
        .filter(q => q.eq(q.field("selectionPeriodId"), periodId))
        .collect()

      // Group answers by student
      const studentAnswerCounts = new Map<string, Set<string>>()
      for (const answer of allAnswers) {
        if (!studentAnswerCounts.has(answer.studentId)) {
          studentAnswerCounts.set(answer.studentId, new Set())
        }
        if (questionIds.has(answer.questionId)) {
          studentAnswerCounts.get(answer.studentId)!.add(answer.questionId as string)
        }
      }

      // Check if all students have completed
      let allComplete = true
      for (const studentId of studentIds) {
        const answeredQuestions = studentAnswerCounts.get(studentId) || new Set()
        const answeredCount = answeredQuestions.size
        if (answeredCount < requiredCount) {
          allComplete = false
          break
        }
      }

      result[periodId] = allComplete
    }

    return result
  },
})

export const batchCheckPeriodsNeedNames = query({
  args: { periodIds: v.array(v.id("selectionPeriods")) },
  handler: async (ctx, args) => {
    const result: Record<string, boolean> = {}
    
    for (const periodId of args.periodIds) {
      const entries = await ctx.db
        .query("periodStudentAllowList")
        .withIndex("by_period", (q) => q.eq("selectionPeriodId", periodId))
        .collect()

      if (entries.length === 0) {
        result[periodId] = false
      } else {
        const hasAnyName = entries.some(entry => entry.name && entry.name.trim().length > 0)
        result[periodId] = !hasAnyName
      }
    }
    
    return result
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

/**
 * Get student display name (name if available, otherwise code).
 * GDPR: Only returns name if it was provided by teacher.
 * 
 * @category Queries
 * @since 0.3.0
 */
export const getStudentDisplayName = query({
  args: {
    studentId: v.string(),
  },
  handler: async (ctx, args) => {
    const normalized = args.studentId.trim().toUpperCase()
    
    const entry = await ctx.db
      .query("periodStudentAllowList")
      .withIndex("by_studentId", (q) => q.eq("studentId", normalized))
      .first()
    
    return entry?.name || normalized
  },
})

/**
 * Get student display names for multiple codes (batch lookup).
 * Returns map of studentId -> displayName (name if available, otherwise code).
 * 
 * @category Queries
 * @since 0.3.0
 */
export const getStudentDisplayNames = query({
  args: {
    studentIds: v.array(v.string()),
    periodId: v.optional(v.id("selectionPeriods")),
  },
  handler: async (ctx, args) => {
    const normalizedIds = args.studentIds.map(id => id.trim().toUpperCase())
    const result = new Map<string, string>()
    
    // If periodId is provided, filter by period for efficiency
    if (args.periodId) {
      const entries = await ctx.db
        .query("periodStudentAllowList")
        .withIndex("by_period", (q) => q.eq("selectionPeriodId", args.periodId!))
        .collect()
      
      const entryMap = new Map(entries.map(e => [e.studentId, e]))
      
      for (const id of normalizedIds) {
        const entry = entryMap.get(id)
        result.set(id, entry?.name || id)
      }
    } else {
      // Otherwise, query all entries and filter
      for (const id of normalizedIds) {
        const entry = await ctx.db
          .query("periodStudentAllowList")
          .withIndex("by_studentId", (q) => q.eq("studentId", id))
          .first()
        
        result.set(id, entry?.name || id)
      }
    }
    
    return Object.fromEntries(result)
  },
})

/**
 * Update a single student's name.
 * GDPR: Names are optional and only stored if explicitly provided by teacher.
 * 
 * @category Mutations
 * @since 0.3.0
 */
export const updateStudentName = mutation({
  args: {
    selectionPeriodId: v.id("selectionPeriods"),
    studentId: v.string(),
    name: v.string()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    
    const normalizedCode = args.studentId.trim().toUpperCase()
    const entry = await ctx.db
      .query("periodStudentAllowList")
      .withIndex("by_period_studentId", q => 
        q.eq("selectionPeriodId", args.selectionPeriodId)
         .eq("studentId", normalizedCode)
      )
      .first()
    
    if (!entry) {
      throw new Error("Access code not found")
    }
    
    await ctx.db.patch(entry._id, { name: args.name.trim() || undefined })
    return { success: true }
  },
})

/**
 * Import student names from CSV mapping.
 * GDPR: Names are optional and only stored if explicitly provided by teacher.
 * 
 * @category Mutations
 * @since 0.3.0
 */
export const importStudentNames = mutation({
  args: {
    selectionPeriodId: v.id("selectionPeriods"),
    nameMappings: v.array(v.object({
      code: v.string(),
      name: v.string()
    }))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    
    let updated = 0
    const errors: string[] = []
    
    for (const mapping of args.nameMappings) {
      const normalizedCode = mapping.code.trim().toUpperCase()
      const normalizedName = mapping.name.trim()
      
      if (!normalizedName) {
        errors.push(`Code ${normalizedCode}: name is empty`)
        continue
      }
      
      const entry = await ctx.db
        .query("periodStudentAllowList")
        .withIndex("by_period_studentId", q => 
          q.eq("selectionPeriodId", args.selectionPeriodId)
           .eq("studentId", normalizedCode)
        )
        .first()
      
      if (entry) {
        await ctx.db.patch(entry._id, { name: normalizedName })
        updated++
      } else {
        errors.push(`Code ${normalizedCode} not found in this period`)
      }
    }
    
    if (errors.length > 0 && updated === 0) {
      throw new Error(`Failed to import: ${errors.join(", ")}`)
    }
    
    return { updated, errors: errors.length > 0 ? errors : undefined }
  },
})
