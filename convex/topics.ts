import { query, QueryCtx } from "./_generated/server"
import { v } from "convex/values"
import * as Topic from "./schemas/Topic"
import * as SelectionPeriod from "./schemas/SelectionPeriod"
import * as Preference from "./schemas/Preference"
import * as Congestion from "./lib/congestion"
import { api } from "./_generated/api"
import { DirectAggregate } from "@convex-dev/aggregate"
import { components } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { getCurrentUser } from "./users"

// Access the rankings aggregate
const rankingsAggregate = new DirectAggregate<{
  Namespace: Id<"topics">;
  Key: number;
  Id: string;
}>(components.aggregate)

/**
 * Helper: Filter topics based on user's allow-list status.
 * Topics with requiresAllowList=true are only visible to allowed users.
 */
async function filterTopicsByAllowList<T extends { requiresAllowList?: boolean }>(
  ctx: QueryCtx,
  topics: T[]
): Promise<T[]> {
  const user = await getCurrentUser(ctx)
  const isAllowed = user?.isAllowed ?? false

  return topics.filter((topic) => {
    // If topic doesn't require allow-list, everyone can see it
    if (!topic.requiresAllowList) return true
    // If topic requires allow-list, only allowed users can see it
    return isAllowed
  })
}

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
      .withIndex("by_kind", q => q.eq("kind", "open"))
      .first()

    if (!activePeriod || !SelectionPeriod.isOpen(activePeriod)) return []

    // Get all active topics and all preferences for this semester in parallel
    const [topics, allPreferences] = await Promise.all([
      ctx.db
        .query("topics")
        .withIndex("by_semester", q => q.eq("semesterId", activePeriod.semesterId))
        .filter(q => q.eq(q.field("isActive"), true))
        .collect(),
      ctx.db
        .query("preferences")
        .withIndex("by_semester", q => q.eq("semesterId", activePeriod.semesterId))
        .collect()
    ])

    // Calculate congestion for each topic
    const totalStudents = allPreferences.length

    // Filter topics by allow-list access
    const accessibleTopics = await filterTopicsByAllowList(ctx, topics)

    // Map topics to include congestion data
    return accessibleTopics.map(topic => {
      const studentCount = allPreferences.filter(pref =>
        Preference.hasSelectedTopic(topic._id)(pref)
      ).length

      const congestionData = Congestion.calculateCongestionData({
        studentCount,
        totalStudents,
        totalTopics: accessibleTopics.length
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
      .withIndex("by_kind", q => q.eq("kind", "open"))
      .first()

    if (!activePeriod) return []

    // Check if period is open
    if (!SelectionPeriod.isOpen(activePeriod)) return []

    // Get all active topics for this semester
    const allTopics = await ctx.db
      .query("topics")
      .withIndex("by_semester", q => q.eq("semesterId", activePeriod.semesterId))
      .filter(q => q.eq(q.field("isActive"), true))
      .collect()

    // Filter topics by allow-list access
    const topics = await filterTopicsByAllowList(ctx, allTopics)

    // Get metrics for each topic from the aggregate
    const topicsWithMetrics = await Promise.all(
      topics.map(async (topic) => {
        // Fetch count and sum in parallel for each topic
        const [count, sum] = await Promise.all([
          rankingsAggregate.count(ctx, { namespace: topic._id }),
          rankingsAggregate.sum(ctx, { namespace: topic._id })
        ])

        const averagePosition = count > 0 ? sum / count : null

        // Calculate competition level based on average position
        const likelihoodCategory = count === 0
          ? "low"
          : averagePosition === null
            ? "unknown"
            : averagePosition <= 2
              ? "very-high"
              : averagePosition <= 3.5
                ? "high"
                : averagePosition <= 5
                  ? "moderate"
                  : "low"

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

/**
 * Gets a single topic by ID.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getTopic = query({
  args: {
    id: v.id("topics")
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  }
})