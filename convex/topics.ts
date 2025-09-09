import { query } from "./_generated/server"
import { v } from "convex/values"
import * as Topic from "./schemas/Topic"
import * as SelectionPeriod from "./schemas/SelectionPeriod"
import * as Preference from "./schemas/Preference"
import * as Congestion from "./lib/congestion"

/**
 * Gets all active topics with congestion data for the current selection period.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getActiveTopicsWithCongestion = query({
  args: {},
  handler: async (ctx) => {
    // Get active selection period
    const activePeriod = await ctx.db
      .query("selectionPeriods")
      .withIndex("by_active", q => q.eq("isActive", true))
      .first()

    if (!activePeriod) return []

    // Check if period is open
    if (!SelectionPeriod.isOpen()(activePeriod)) return []

    // Get all active topics for this semester
    const topics = await ctx.db
      .query("topics")
      .withIndex("by_semester", q => q.eq("semesterId", activePeriod.semesterId))
      .filter(q => q.eq(q.field("isActive"), true))
      .collect()

    // Get all preferences for congestion calculation
    const allPreferences = await ctx.db
      .query("preferences")
      .withIndex("by_semester", q => q.eq("semesterId", activePeriod.semesterId))
      .collect()

    // Calculate congestion for each topic
    const totalStudents = allPreferences.length

    // Map topics to include congestion data
    return topics.map(topic => {
      const studentCount = allPreferences.filter(pref =>
        Preference.hasSelectedTopic(topic._id)(pref)
      ).length

      const congestionData = Congestion.calculateCongestionData({
        studentCount,
        totalStudents,
        totalTopics: topics.length
      })

      return Topic.withCongestion(topic, congestionData)
    })
  }
})

/**
 * Gets all topics for admin management.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getAllTopics = query({
  args: {
    semesterId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const semesterId = args.semesterId
    
    if (semesterId) {
      return await ctx.db
        .query("topics")
        .withIndex("by_semester", q => q.eq("semesterId", semesterId))
        .collect()
    }
    
    return await ctx.db.query("topics").collect()
  }
})