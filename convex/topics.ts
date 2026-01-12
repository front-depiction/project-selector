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
import { isStudentAllowedForTopic } from "./periodStudentAccessCodes"

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
      .withIndex("by_kind", q => q.eq("kind", "open"))
      .first()

    if (!activePeriod) return []

    // Check if period is open
    if (!SelectionPeriod.isOpen(activePeriod)) return []

    // Get all active topics for this semester
    const topics = await ctx.db
      .query("topics")
      .withIndex("by_semester", q => q.eq("semesterId", activePeriod.semesterId))
      .filter(q => q.eq(q.field("isActive"), true))
      .collect()

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

/**
 * Gets active topics filtered by student allow-list.
 * Only returns topics the student has been granted access to.
 * Student allow-list is always enforced - topics without any students in the allow-list are not visible to anyone.
 * 
 * @category Queries
 * @since 0.2.0
 */
export const getActiveTopicsForStudent = query({
  args: { studentId: v.string() },
  handler: async (ctx, args) => {
    const studentId = args.studentId.trim()
    if (!studentId) return []

    // Get ALL active/open selection periods (not just the first one)
    const activePeriods = await ctx.db
      .query("selectionPeriods")
      .withIndex("by_kind", q => q.eq("kind", "open"))
      .collect()
      .then(periods => periods.filter(SelectionPeriod.isOpen))

    if (activePeriods.length === 0) return []

    // Get all unique semester IDs from all open periods
    const semesterIds = new Set(activePeriods.map(p => p.semesterId))

    // Get all active topics for ALL semesters with open periods
    const allTopics = []
    for (const semesterId of semesterIds) {
      const topics = await ctx.db
        .query("topics")
        .withIndex("by_semester", q => q.eq("semesterId", semesterId))
        .filter(q => q.eq(q.field("isActive"), true))
        .collect()
      allTopics.push(...topics)
    }

    // Filter topics by student allow-list - always enforced
    const accessibleTopics = []
    for (const topic of allTopics) {
      const isAllowed = await isStudentAllowedForTopic(ctx, topic._id, studentId)
      if (isAllowed) {
        accessibleTopics.push(topic)
      }
    }

    return accessibleTopics
  }
})

/**
 * Gets active topics with metrics, filtered by student allow-list.
 * Student allow-list is always enforced.
 * 
 * @category Queries
 * @since 0.2.0
 */
export const getActiveTopicsWithMetricsForStudent = query({
  args: { studentId: v.string() },
  handler: async (ctx, args) => {
    const studentId = args.studentId.trim()
    if (!studentId) return []

    // Get ALL active/open selection periods (not just the first one)
    const activePeriods = await ctx.db
      .query("selectionPeriods")
      .withIndex("by_kind", q => q.eq("kind", "open"))
      .collect()
      .then(periods => periods.filter(SelectionPeriod.isOpen))

    if (activePeriods.length === 0) return []

    // Get all unique semester IDs from all open periods
    const semesterIds = new Set(activePeriods.map(p => p.semesterId))

    // Get all active topics for ALL semesters with open periods
    const allTopics = []
    for (const semesterId of semesterIds) {
      const topics = await ctx.db
        .query("topics")
        .withIndex("by_semester", q => q.eq("semesterId", semesterId))
        .filter(q => q.eq(q.field("isActive"), true))
        .collect()
      allTopics.push(...topics)
    }

    // Filter topics by student allow-list - always enforced
    const accessibleTopics = []
    for (const topic of allTopics) {
      const isAllowed = await isStudentAllowedForTopic(ctx, topic._id, studentId)
      if (isAllowed) {
        accessibleTopics.push(topic)
      }
    }

    // Get metrics for each accessible topic
    const topicsWithMetrics = await Promise.all(
      accessibleTopics.map(async (topic) => {
        const [count, sum] = await Promise.all([
          rankingsAggregate.count(ctx, { namespace: topic._id }),
          rankingsAggregate.sum(ctx, { namespace: topic._id })
        ])

        const averagePosition = count > 0 ? sum / count : null
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

    return topicsWithMetrics.sort((a, b) => {
      if (a.averagePosition === null) return 1
      if (b.averagePosition === null) return -1
      return a.averagePosition - b.averagePosition
    })
  }
})