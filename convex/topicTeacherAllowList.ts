import { mutation, query, QueryCtx } from "./_generated/server"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"

/**
 * Add a teacher email to a topic
 */
export const addTeacherEmail = mutation({
  args: {
    topicId: v.id("topics"),
    email: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const addedBy = identity?.email ?? "system"
    const normalizedEmail = args.email.toLowerCase().trim()

    if (!normalizedEmail) {
      throw new Error("Email cannot be empty")
    }

    const existing = await ctx.db
      .query("topicTeacherAllowList")
      .withIndex("by_topic_email", (q) =>
        q.eq("topicId", args.topicId).eq("email", normalizedEmail)
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

    return await ctx.db.insert("topicTeacherAllowList", {
      topicId: args.topicId,
      email: normalizedEmail,
      note: args.note,
      addedAt: Date.now(),
      addedBy,
    })
  },
})

/**
 * Add multiple teacher emails to a topic (bulk)
 */
export const bulkAddTeacherEmails = mutation({
  args: {
    topicId: v.id("topics"),
    emails: v.array(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const addedBy = identity?.email ?? "system"

    const results = { added: 0, updated: 0, skipped: 0 }

    for (const email of args.emails) {
      const normalizedEmail = email.toLowerCase().trim()
      if (!normalizedEmail || !normalizedEmail.includes("@")) {
        results.skipped++
        continue
      }

      const existing = await ctx.db
        .query("topicTeacherAllowList")
        .withIndex("by_topic_email", (q) =>
          q.eq("topicId", args.topicId).eq("email", normalizedEmail)
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
        await ctx.db.insert("topicTeacherAllowList", {
          topicId: args.topicId,
          email: normalizedEmail,
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
 * Remove a teacher from a topic
 */
export const removeTeacherEmail = mutation({
  args: {
    topicId: v.id("topics"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim()

    const entry = await ctx.db
      .query("topicTeacherAllowList")
      .withIndex("by_topic_email", (q) =>
        q.eq("topicId", args.topicId).eq("email", normalizedEmail)
      )
      .first()

    if (entry) await ctx.db.delete(entry._id)
    return { success: true }
  },
})

/**
 * Clear all teachers from a topic
 */
export const clearAllTeachers = mutation({
  args: { topicId: v.id("topics") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("topicTeacherAllowList")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
      .collect()

    for (const entry of entries) {
      await ctx.db.delete(entry._id)
    }

    return { deleted: entries.length }
  },
})

/**
 * Get all teachers for a topic
 */
export const getTopicTeachers = query({
  args: { topicId: v.id("topics") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("topicTeacherAllowList")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
      .collect()
  },
})

/**
 * Check if a teacher email can manage a topic
 */
export async function canTeacherManageTopic(
  ctx: QueryCtx,
  topicId: Id<"topics">,
  email: string | undefined
): Promise<boolean> {
  if (!email) return false

  const normalizedEmail = email.toLowerCase().trim()
  const entry = await ctx.db
    .query("topicTeacherAllowList")
    .withIndex("by_topic_email", (q) =>
      q.eq("topicId", topicId).eq("email", normalizedEmail)
    )
    .first()

  return entry !== null
}

/**
 * Query version of canTeacherManageTopic
 */
export const checkTeacherAccess = query({
  args: {
    topicId: v.id("topics"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    return await canTeacherManageTopic(ctx, args.topicId, args.email)
  },
})

/**
 * Get all topics a teacher can manage
 */
export const getMyManagedTopics = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.email) return []

    const normalizedEmail = identity.email.toLowerCase().trim()
    const entries = await ctx.db
      .query("topicTeacherAllowList")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .collect()

    // Get the actual topic documents
    const topics = await Promise.all(
      entries.map(async (entry) => await ctx.db.get(entry.topicId))
    )

    return topics.filter(Boolean)
  },
})

/**
 * Get all topics a specific teacher can manage (by email)
 */
export const getTeacherManagedTopics = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim()
    
    const entries = await ctx.db
      .query("topicTeacherAllowList")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .collect()

    // Get the actual topic documents
    const topics = await Promise.all(
      entries.map(async (entry) => await ctx.db.get(entry.topicId))
    )

    return topics.filter(Boolean)
  },
})

/**
 * Get count of teachers allowed for a topic
 */
export const getTeacherAllowListCount = query({
  args: { topicId: v.id("topics") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("topicTeacherAllowList")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
      .collect()

    return entries.length
  },
})
