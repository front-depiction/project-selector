import { mutation, query, QueryCtx } from "./_generated/server"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"

/**
 * Add student IDs to a topic (bulk)
 */
export const bulkAddStudentIds = mutation({
  args: {
    topicId: v.id("topics"),
    studentIds: v.array(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const addedBy = identity?.email ?? "system"

    const results = { added: 0, updated: 0, skipped: 0 }

    for (const studentId of args.studentIds) {
      const normalized = studentId.trim()
      if (!normalized) {
        results.skipped++
        continue
      }

      const existing = await ctx.db
        .query("topicStudentAllowList")
        .withIndex("by_topic_studentId", (q) =>
          q.eq("topicId", args.topicId).eq("studentId", normalized)
        )
        .first()

      if (existing) {
        await ctx.db.patch(existing._id, {
          note: args.note,
          addedBy,
          addedAt: Date.now(),
        })
        results.updated++
      } else {
        await ctx.db.insert("topicStudentAllowList", {
          topicId: args.topicId,
          studentId: normalized,
          note: args.note,
          addedAt: Date.now(),
          addedBy,
        })
        results.added++
      }
    }

    return results
  },
})

/**
 * Add a single student ID to a topic
 */
export const addStudentId = mutation({
  args: {
    topicId: v.id("topics"),
    studentId: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const addedBy = identity?.email ?? "system"
    const normalized = args.studentId.trim()

    if (!normalized) {
      throw new Error("Student ID cannot be empty")
    }

    const existing = await ctx.db
      .query("topicStudentAllowList")
      .withIndex("by_topic_studentId", (q) =>
        q.eq("topicId", args.topicId).eq("studentId", normalized)
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        note: args.note,
        addedBy,
        addedAt: Date.now(),
      })
      return existing._id
    }

    return await ctx.db.insert("topicStudentAllowList", {
      topicId: args.topicId,
      studentId: normalized,
      note: args.note,
      addedAt: Date.now(),
      addedBy,
    })
  },
})

/**
 * Remove a student ID from a topic
 */
export const removeStudentId = mutation({
  args: {
    topicId: v.id("topics"),
    studentId: v.string(),
  },
  handler: async (ctx, args) => {
    const normalized = args.studentId.trim()

    const entry = await ctx.db
      .query("topicStudentAllowList")
      .withIndex("by_topic_studentId", (q) =>
        q.eq("topicId", args.topicId).eq("studentId", normalized)
      )
      .first()

    if (entry) await ctx.db.delete(entry._id)
    return { success: true }
  },
})

/**
 * Clear all student IDs from a topic
 */
export const clearAllStudentIds = mutation({
  args: { topicId: v.id("topics") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("topicStudentAllowList")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
      .collect()

    for (const entry of entries) {
      await ctx.db.delete(entry._id)
    }

    return { deleted: entries.length }
  },
})

/**
 * Get all student IDs for a topic
 */
export const getTopicStudentAllowList = query({
  args: { topicId: v.id("topics") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("topicStudentAllowList")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
      .collect()
  },
})

/**
 * Get all topics a student has access to
 */
export const getStudentAllowedTopics = query({
  args: { studentId: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.studentId.trim()
    
    const entries = await ctx.db
      .query("topicStudentAllowList")
      .withIndex("by_studentId", (q) => q.eq("studentId", normalized))
      .collect()

    // Get the actual topic documents
    const topics = await Promise.all(
      entries.map(async (entry) => await ctx.db.get(entry.topicId))
    )

    return topics.filter(Boolean)
  },
})

/**
 * Check if a student ID is allowed for a topic.
 * Checks both topic-level AND period-level allow lists.
 * Student is allowed if they have access via EITHER list.
 */
export async function isStudentAllowedForTopic(
  ctx: QueryCtx,
  topicId: Id<"topics">,
  studentId: string
): Promise<boolean> {
  const normalized = studentId.trim().toUpperCase()
  
  // Check topic-level allow list first (legacy)
  const topicEntry = await ctx.db
    .query("topicStudentAllowList")
    .withIndex("by_topic_studentId", (q) =>
      q.eq("topicId", topicId).eq("studentId", normalized)
    )
    .first()
  if (topicEntry !== null) return true
  
  // Check period-level allow list
  // First, get the topic to find its semester
  const topic = await ctx.db.get(topicId)
  if (!topic) return false
  
  // Find the active selection period for this semester
  const activePeriod = await ctx.db
    .query("selectionPeriods")
    .withIndex("by_semester", (q) => q.eq("semesterId", topic.semesterId))
    .filter((q) => q.eq(q.field("kind"), "open"))
    .first()
  
  if (!activePeriod) return false
  
  // Check if student has access via period-level allow list
  const periodEntry = await ctx.db
    .query("periodStudentAllowList")
    .withIndex("by_period_studentId", (q) =>
      q.eq("selectionPeriodId", activePeriod._id).eq("studentId", normalized)
    )
    .first()
  
  return periodEntry !== null
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
 * Get count of students allowed for a topic
 */
export const getStudentAllowListCount = query({
  args: { topicId: v.id("topics") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("topicStudentAllowList")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
      .collect()
    
    return entries.length
  },
})
