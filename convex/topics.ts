import { query } from "./_generated/server"
import { v } from "convex/values"
import * as Topic from "./schemas/Topic"
import * as SelectionPeriod from "./schemas/SelectionPeriod"
import * as Preference from "./schemas/Preference"
import * as Congestion from "./lib/congestion"
import { api } from "./_generated/api"
import { DirectAggregate } from "@convex-dev/aggregate"
import { components } from "./_generated/api"
import type { Id } from "./_generated/dataModel"

// Access the rankings aggregate
const rankingsAggregate = new DirectAggregate<{
  Namespace: Id<"topics">;
  Key: number;
  Id: string;
}>(components.aggregate)

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

      return {
        _id: topic._id,
        ...Topic.withCongestion(topic, congestionData)
      }
    })
  }
})


/**
 * Gets all active topics with real-time metrics from the aggregate.
 * This is the primary query for the student selection page.
 * 
 * @category Queries
 * @since 0.2.0
 */
export const getActiveTopicsWithMetrics = query({
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

    // Get metrics for each topic from the aggregate
    const topicsWithMetrics = await Promise.all(
      topics.map(async (topic) => {
        const count = await rankingsAggregate.count(ctx, { namespace: topic._id })
        const sum = await rankingsAggregate.sum(ctx, { namespace: topic._id })
        const averagePosition = count > 0 ? sum / count : null
        
        // Calculate competition level based on average position
        let likelihoodCategory = "unknown"
        if (count === 0) {
          likelihoodCategory = "low"
        } else if (averagePosition !== null) {
          if (averagePosition <= 2) likelihoodCategory = "very-high"
          else if (averagePosition <= 3.5) likelihoodCategory = "high"
          else if (averagePosition <= 5) likelihoodCategory = "moderate"
          else likelihoodCategory = "low"
        }
        
        return {
          _id: topic._id,
          title: topic.title,
          description: topic.description,
          isActive: topic.isActive,
          semesterId: topic.semesterId,
          studentCount: count,
          averagePosition,
          likelihoodCategory
        }
      })
    )

    // Sort by average position (most competitive first)
    return topicsWithMetrics.sort((a, b) => {
      if (a.averagePosition === null) return 1
      if (b.averagePosition === null) return -1
      return a.averagePosition - b.averagePosition
    })
  }
})

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