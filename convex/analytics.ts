import { query } from "./_generated/server"
import { v } from "convex/values"
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
 * Get ranking events for a specific topic over time.
 * 
 * @category Queries
 * @since 0.2.0
 */
export const getTopicRankingHistory = query({
  args: {
    topicId: v.id("topics"),
    days: v.optional(v.number()), // Default 30 days
  },
  handler: async (ctx, args) => {
    const days = args.days || 30
    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000)

    // Get events and current metrics in parallel
    const [events, currentCount, currentSum] = await Promise.all([
      ctx.db
        .query("rankingEvents")
        .withIndex("by_topic", q =>
          q.eq("topicId", args.topicId)
            .gte("_creationTime", startTime)
        )
        .collect(),
      rankingsAggregate.count(ctx, { namespace: args.topicId }),
      rankingsAggregate.sum(ctx, { namespace: args.topicId })
    ])

    // Group events by 1-minute buckets
    const minuteBuckets = events.reduce((buckets, event) => {
      // Round down to nearest minute
      const minuteTimestamp = Math.floor(event._creationTime / 60000) * 60000
      const minuteKey = new Date(minuteTimestamp).toISOString()
      
      const bucket = buckets.get(minuteKey) || {
        timestamp: minuteKey,
        added: 0,
        moved: 0,
        removed: 0,
        positions: []
      }
      
      // Update bucket based on event type
      const updatedBucket = {
        ...bucket,
        added: bucket.added + (event.action === "added" ? 1 : 0),
        moved: bucket.moved + (event.action === "moved" ? 1 : 0),
        removed: bucket.removed + (event.action === "removed" ? 1 : 0),
        positions: event.position > 0 
          ? [...bucket.positions, event.position]
          : bucket.positions
      }
      
      return buckets.set(minuteKey, updatedBucket)
    }, new Map<string, any>())

    // Transform to chart data with averages
    const chartData = Array.from(minuteBuckets.values())
      .map(bucket => ({
        timestamp: bucket.timestamp,
        added: bucket.added,
        moved: bucket.moved,
        removed: bucket.removed,
        averagePosition: bucket.positions.length > 0
          ? bucket.positions.reduce((a: number, b: number) => a + b, 0) / bucket.positions.length
          : null,
        eventCount: bucket.added + bucket.moved + bucket.removed
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))

    const currentAverage = currentCount > 0 ? currentSum / currentCount : null

    return {
      chartData,
      currentMetrics: {
        totalStudents: currentCount,
        averagePosition: currentAverage,
      }
    }
  },
})

/**
 * Get overall ranking trends across all topics.
 * 
 * @category Queries
 * @since 0.2.0
 */
export const getOverallRankingTrends = query({
  args: {
    days: v.optional(v.number()), // Default 7 days
  },
  handler: async (ctx, args) => {
    const days = args.days || 7
    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000)

    // Get all active topics
    const topics = await ctx.db
      .query("topics")
      .filter(q => q.eq(q.field("isActive"), true))
      .collect()

    // Get all metrics in parallel
    const topicMetrics = await Promise.all(
      topics.map(async (topic) => {
        // Fetch all data for this topic in parallel
        const [count, sum, recentEvents] = await Promise.all([
          rankingsAggregate.count(ctx, { namespace: topic._id }),
          rankingsAggregate.sum(ctx, { namespace: topic._id }),
          ctx.db
            .query("rankingEvents")
            .withIndex("by_topic", q =>
              q.eq("topicId", topic._id)
                .gte("_creationTime", startTime)
            )
            .take(100)
        ])

        const average = count > 0 ? sum / count : null

        return {
          topicId: topic._id,
          title: topic.title,
          currentCount: count,
          averagePosition: average,
          recentActivity: recentEvents.length,
          trend: calculateTrend(recentEvents)
        }
      })
    )

    // Filter, sort, and limit in a single pipeline
    return topicMetrics
      .filter(m => m.averagePosition !== null)
      .sort((a, b) => (a.averagePosition || 999) - (b.averagePosition || 999))
      .slice(0, 10) // Top 10
  },
})

/**
 * Get competition level for each topic.
 * 
 * @category Queries
 * @since 0.2.0
 */
/**
 * Get all recent ranking events for general analytics.
 * 
 * @category Queries
 * @since 0.2.1
 */
export const getRecentRankingEvents = query({
  args: {
    hours: v.optional(v.number()), // Default 24 hours
  },
  handler: async (ctx, args) => {
    const hours = args.hours || 24
    const startTime = Date.now() - (hours * 60 * 60 * 1000)

    const events = await ctx.db
      .query("rankingEvents")
      .filter(q => q.gte(q.field("_creationTime"), startTime))
      .collect()

    return events
  },
})

/**
 * Get comprehensive analytics for a single topic including student rankings.
 *
 * @category Queries
 * @since 0.2.2
 */
export const getTopicAnalytics = query({
  args: {
    topicId: v.id("topics"),
  },
  handler: async (ctx, args) => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)

    // Fetch all data in parallel
    const [count, sum, top3Count, firstChoiceCount, recentEvents, allEvents] = await Promise.all([
      rankingsAggregate.count(ctx, { namespace: args.topicId }),
      rankingsAggregate.sum(ctx, { namespace: args.topicId }),
      rankingsAggregate.count(ctx, {
        namespace: args.topicId,
        bounds: { upper: { key: 3, inclusive: true } }
      }),
      rankingsAggregate.count(ctx, {
        namespace: args.topicId,
        bounds: { upper: { key: 1, inclusive: true } }
      }),
      ctx.db
        .query("rankingEvents")
        .withIndex("by_topic", q =>
          q.eq("topicId", args.topicId)
            .gte("_creationTime", sevenDaysAgo)
        )
        .collect(),
      ctx.db
        .query("rankingEvents")
        .withIndex("by_topic", q => q.eq("topicId", args.topicId))
        .collect()
    ])

    const averagePosition = count > 0 ? sum / count : 0
    const top3Percentage = count > 0 ? Math.round((top3Count / count) * 100) : 0

    // Calculate engagement score (based on activity and rankings)
    const engagementScore = Math.min(100, Math.round(
      (count * 10) + // Base score from number of selections
      (firstChoiceCount * 5) + // Bonus for first choices
      (recentEvents.length * 2) // Bonus for recent activity
    ))

    // Calculate retention rate (students who kept this topic in their list)
    const movedOrRemovedCount = allEvents.filter(e =>
      e.action === "removed"
    ).length
    const retentionRate = count > 0
      ? Math.round(((count - movedOrRemovedCount) / count) * 100)
      : 0

    // Calculate performance score (composite metric)
    const performanceScore = Math.round(
      (top3Percentage * 0.4) + // 40% weight on top 3 placement
      (engagementScore * 0.3) + // 30% weight on engagement
      (retentionRate * 0.3) // 30% weight on retention
    )

    // Calculate momentum
    const recentAdded = recentEvents.filter(e => e.action === "added").length
    const recentRemoved = recentEvents.filter(e => e.action === "removed").length
    const momentum: "rising" | "falling" | "stable" =
      recentAdded > recentRemoved + 2 ? "rising" :
      recentRemoved > recentAdded + 2 ? "falling" :
      "stable"

    // Get student rankings
    const preferences = await ctx.db
      .query("preferences")
      .collect()

    // Filter preferences that include this topic
    const relevantPreferences = preferences.filter(pref =>
      pref.topicOrder.includes(args.topicId)
    )

    const studentRankings = relevantPreferences.map((pref) => {
      const rank = pref.topicOrder.indexOf(args.topicId) + 1

      return {
        studentId: pref.studentId,
        studentName: pref.studentId, // Using studentId as name since we don't have a users table
        rank,
        timestamp: pref._creationTime
      }
    })

    return {
      metrics: {
        totalSelections: count,
        averagePosition: Math.round(averagePosition * 10) / 10,
        firstChoiceCount,
        top3Count,
        top3Percentage,
        engagementScore,
        retentionRate,
        performanceScore,
      },
      trends: {
        momentum,
        last7Days: recentEvents.length,
        totalEvents: allEvents.length,
      },
      studentRankings: studentRankings.sort((a, b) => a.rank - b.rank)
    }
  },
})

export const getTopicCompetitionLevels = query({
  args: {},
  handler: async (ctx) => {
    const topics = await ctx.db
      .query("topics")
      .filter(q => q.eq(q.field("isActive"), true))
      .collect()

    // Get all competition data in parallel
    const competitionData = await Promise.all(
      topics.map(async (topic) => {
        // Fetch all metrics for this topic in parallel
        const [count, sum, top3Count] = await Promise.all([
          rankingsAggregate.count(ctx, { namespace: topic._id }),
          rankingsAggregate.sum(ctx, { namespace: topic._id }),
          rankingsAggregate.count(ctx, {
            namespace: topic._id,
            bounds: { upper: { key: 3, inclusive: true } }
          })
        ])

        const average = count > 0 ? sum / count : null

        return {
          topic: topic.title,
          students: count,
          averageRank: average,
          top3Percentage: count > 0 ? (top3Count / count) * 100 : 0,
          competitionLevel: getCompetitionLevel(average, count),
          fill: getCompetitionColor(average, count)
        }
      })
    )

    // Filter and sort in a single pipeline
    return competitionData
      .filter(d => d.students > 0)
      .sort((a, b) => b.students - a.students)
  },
})

// Helper functions
function calculateTrend(events: any[]): "up" | "down" | "stable" {
  if (events.length < 2) return "stable"

  const recent = events.slice(-5)
  const addedCount = recent.filter(e => e.action === "added").length
  const removedCount = recent.filter(e => e.action === "removed").length

  if (addedCount > removedCount + 1) return "up"
  if (removedCount > addedCount + 1) return "down"
  return "stable"
}

function getCompetitionLevel(avgPosition: number | null, count: number): string {
  if (count === 0 || avgPosition === null) return "Low"
  if (avgPosition <= 2 && count > 5) return "Very High"
  if (avgPosition <= 3.5 && count > 3) return "High"
  if (avgPosition <= 5) return "Moderate"
  return "Low"
}

function getCompetitionColor(avgPosition: number | null, count: number): string {
  const level = getCompetitionLevel(avgPosition, count)
  switch (level) {
    case "Very High": return "var(--chart-1)"
    case "High": return "var(--chart-2)"
    case "Moderate": return "var(--chart-3)"
    default: return "var(--chart-4)"
  }
}