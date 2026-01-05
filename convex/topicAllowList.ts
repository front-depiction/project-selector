import { mutation, query, QueryCtx } from "./_generated/server"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"

/**
 * Add a single email to a topic's allow-list.
 * 
 * @category Mutations
 * @since 0.3.0
 */
export const addEmail = mutation({
  args: {
    topicId: v.id("topics"),
    email: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const addedBy = identity?.email ?? "system"
    const normalizedEmail = args.email.toLowerCase().trim()

    // Check if already exists
    const existing = await ctx.db
      .query("topicAllowList")
      .withIndex("by_topic_email", (q) =>
        q.eq("topicId", args.topicId).eq("email", normalizedEmail)
      )
      .first()

    if (existing) {
      // Update existing entry
      await ctx.db.patch(existing._id, {
        note: args.note,
        addedBy,
        addedAt: Date.now(),
      })
      return existing._id
    }

    // Create new entry
    return await ctx.db.insert("topicAllowList", {
      topicId: args.topicId,
      email: normalizedEmail,
      note: args.note,
      addedAt: Date.now(),
      addedBy,
    })
  },
})

/**
 * Add multiple emails to a topic's allow-list (bulk import).
 * 
 * @category Mutations
 * @since 0.3.0
 */
export const bulkAddEmails = mutation({
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
      
      // Skip empty emails
      if (!normalizedEmail || !normalizedEmail.includes("@")) {
        results.skipped++
        continue
      }

      const existing = await ctx.db
        .query("topicAllowList")
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
        await ctx.db.insert("topicAllowList", {
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
 * Remove an email from a topic's allow-list.
 * 
 * @category Mutations
 * @since 0.3.0
 */
export const removeEmail = mutation({
  args: {
    topicId: v.id("topics"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim()

    const entry = await ctx.db
      .query("topicAllowList")
      .withIndex("by_topic_email", (q) =>
        q.eq("topicId", args.topicId).eq("email", normalizedEmail)
      )
      .first()

    if (entry) {
      await ctx.db.delete(entry._id)
    }

    return { success: true }
  },
})

/**
 * Clear all emails from a topic's allow-list.
 * 
 * @category Mutations
 * @since 0.3.0
 */
export const clearAllEmails = mutation({
  args: {
    topicId: v.id("topics"),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("topicAllowList")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
      .collect()

    for (const entry of entries) {
      await ctx.db.delete(entry._id)
    }

    return { deleted: entries.length }
  },
})

/**
 * Get all emails in a topic's allow-list.
 * 
 * @category Queries
 * @since 0.3.0
 */
export const getTopicAllowList = query({
  args: {
    topicId: v.id("topics"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("topicAllowList")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
      .collect()
  },
})

/**
 * Get the count of emails in a topic's allow-list.
 * 
 * @category Queries
 * @since 0.3.0
 */
export const getTopicAllowListCount = query({
  args: {
    topicId: v.id("topics"),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("topicAllowList")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
      .collect()
    return entries.length
  },
})

/**
 * Check if an email is allowed for a specific topic.
 * 
 * @category Queries
 * @since 0.3.0
 */
export const isEmailAllowedForTopic = query({
  args: {
    topicId: v.id("topics"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim()
    const entry = await ctx.db
      .query("topicAllowList")
      .withIndex("by_topic_email", (q) =>
        q.eq("topicId", args.topicId).eq("email", normalizedEmail)
      )
      .first()
    return entry !== null
  },
})

/**
 * Helper function to check if a user's email is allowed for a topic.
 * Used internally by topic queries.
 * 
 * @category Internal
 * @since 0.3.0
 */
export async function isUserAllowedForTopic(
  ctx: QueryCtx,
  topicId: Id<"topics">,
  userEmail: string | undefined
): Promise<boolean> {
  if (!userEmail) return false
  
  const normalizedEmail = userEmail.toLowerCase().trim()
  const entry = await ctx.db
    .query("topicAllowList")
    .withIndex("by_topic_email", (q) =>
      q.eq("topicId", topicId).eq("email", normalizedEmail)
    )
    .first()
  
  return entry !== null
}

