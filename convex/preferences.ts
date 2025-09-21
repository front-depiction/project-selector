import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import * as Preference from "./schemas/Preference"
import * as SelectionPeriod from "./schemas/SelectionPeriod"
import { getActiveSelectionPeriod } from "./share/selection_periods"
import { createRankingEventsAndUpdateAggregate } from "./share/rankings"

/**
 * Saves or updates student preferences.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const savePreferences = mutation({
  args: {
    studentId: v.string(),
    topicOrder: v.array(v.id("topics"))
  },
  handler: async (ctx, args) => {
    // Get active selection period
    const activePeriod = await getActiveSelectionPeriod(ctx)

    if (!activePeriod) {
      throw new Error("No active selection period")
    }

    // Check if period is open
    if (!SelectionPeriod.isOpen()(activePeriod)) {
      throw new Error("Selection period is closed")
    }

    // Save preferences (keeping existing system)
    const existing = await ctx.db
      .query("preferences")
      .withIndex("by_student", q =>
        q.eq("studentId", args.studentId)
         .eq("semesterId", activePeriod.semesterId)
      )
      .first()

    const newPreference = Preference.make({
      studentId: args.studentId,
      semesterId: activePeriod.semesterId,
      topicOrder: args.topicOrder
    })

    if (existing) {
      await ctx.db.patch(existing._id, newPreference)
    } else {
      await ctx.db.insert("preferences", newPreference)
    }

    // Create ranking events and update aggregate
    await createRankingEventsAndUpdateAggregate(ctx, {
      studentId: args.studentId,
      semesterId: activePeriod.semesterId,
      topicOrder: args.topicOrder,
      existingTopicOrder: existing?.topicOrder
    })

    return { success: true }
  }
})

/**
 * Gets student preferences for the current selection period.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getPreferences = query({
  args: { 
    studentId: v.string() 
  },
  handler: async (ctx, args) => {
    // Get active selection period
    const activePeriod = await getActiveSelectionPeriod(ctx)

    if (!activePeriod) return null

    // Get preferences for this student and semester
    return await ctx.db
      .query("preferences")
      .withIndex("by_student", q =>
        q.eq("studentId", args.studentId)
         .eq("semesterId", activePeriod.semesterId)
      )
      .first()
  }
})

/**
 * Gets all preferences for statistics (admin use).
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getAllPreferences = query({
  args: {
    semesterId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const semesterId = args.semesterId
    if (semesterId) {
      return await ctx.db
        .query("preferences")
        .withIndex("by_semester", q => q.eq("semesterId", semesterId))
        .collect()
    }

    // Get active period's preferences by default
    const activePeriod = await getActiveSelectionPeriod(ctx)

    if (!activePeriod) return []

    return await ctx.db
      .query("preferences")
      .withIndex("by_semester", q => q.eq("semesterId", activePeriod.semesterId))
      .collect()
  }
})
