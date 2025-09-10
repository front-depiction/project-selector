import { query } from "./_generated/server"
import { v } from "convex/values"

/**
 * Get comprehensive analytics for all topics including performance metrics.
 * 
 * @category Queries
 * @since 0.3.0
 */
export const getTopicPerformanceAnalytics = query({
  args: {
    semesterId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // Get topics for the semester
    const topicsQuery = ctx.db.query("topics")
    const topics = args.semesterId
      ? await topicsQuery.filter(q => q.eq(q.field("semesterId"), args.semesterId)).collect()
      : await topicsQuery.collect()

    // Get all preferences and ranking events
    const [preferences, rankingEvents] = await Promise.all([
      ctx.db.query("preferences").collect(),
      ctx.db.query("rankingEvents").collect()
    ])

    // Calculate analytics for each topic
    const topicAnalytics = await Promise.all(topics.map(async topic => {
      // Find all preferences that include this topic
      const topicPreferences = preferences.filter(pref =>
        pref.topicOrder.includes(topic._id)
      )

      // Calculate position distribution
      const positionDistribution = topicPreferences.map(pref => {
        const position = pref.topicOrder.indexOf(topic._id) + 1
        return position
      })

      // Get ranking events for this topic
      const topicEvents = rankingEvents.filter(event =>
        event.topicId === topic._id
      )

      // Calculate metrics
      const totalSelections = topicPreferences.length
      const averagePosition = positionDistribution.length > 0
        ? positionDistribution.reduce((a, b) => a + b, 0) / positionDistribution.length
        : 0

      const firstChoiceCount = positionDistribution.filter(pos => pos === 1).length
      const top3Count = positionDistribution.filter(pos => pos <= 3).length

      // Calculate engagement score (based on ranking events)
      const recentEvents = topicEvents.filter(event =>
        event._creationTime > Date.now() - 7 * 24 * 60 * 60 * 1000
      )
      const engagementScore = recentEvents.length

      // Calculate retention rate (students who kept it in their list)
      const addedEvents = topicEvents.filter(e => e.action === "added").length
      const removedEvents = topicEvents.filter(e => e.action === "removed").length
      const retentionRate = addedEvents > 0
        ? ((addedEvents - removedEvents) / addedEvents) * 100
        : 0

      // Performance score (weighted combination of metrics)
      const performanceScore = (
        (firstChoiceCount * 3) +
        (top3Count * 2) +
        (totalSelections * 1) +
        (engagementScore * 0.5) +
        (retentionRate * 0.1)
      )

      // Get subtopics for this topic
      const subtopics = topic.subtopicIds ?
        await Promise.all(
          topic.subtopicIds.map(id => ctx.db.get(id))
        ) : []

      return {
        id: topic._id,
        title: topic.title,
        description: topic.description,
        subtopics: subtopics.filter(s => s !== null),
        isActive: topic.isActive,
        metrics: {
          totalSelections,
          averagePosition: Math.round(averagePosition * 100) / 100,
          firstChoiceCount,
          top3Count,
          top3Percentage: totalSelections > 0
            ? Math.round((top3Count / totalSelections) * 100)
            : 0,
          engagementScore,
          retentionRate: Math.round(retentionRate),
          performanceScore: Math.round(performanceScore * 100) / 100,
          positionDistribution
        },
        trends: {
          last7Days: recentEvents.length,
          totalEvents: topicEvents.length,
          momentum: calculateMomentum(topicEvents)
        }
      }
    }))

    // Sort by performance score
    return topicAnalytics.sort((a, b) =>
      b.metrics.performanceScore - a.metrics.performanceScore
    )
  }
})

/**
 * Get detailed analytics for a single topic including subtopic breakdown.
 * 
 * @category Queries
 * @since 0.3.0
 */
export const getTopicDetailedAnalytics = query({
  args: {
    topicId: v.id("topics")
  },
  handler: async (ctx, args) => {
    const topic = await ctx.db.get(args.topicId)
    if (!topic) throw new Error("Topic not found")

    // Get all related data
    const [preferences, rankingEvents] = await Promise.all([
      ctx.db.query("preferences").collect(),
      ctx.db.query("rankingEvents")
        .withIndex("by_topic", q => q.eq("topicId", args.topicId))
        .collect()
    ])

    // Find students who selected this topic
    const selectedByStudents = preferences
      .filter(pref => pref.topicOrder.includes(args.topicId))
      .map(pref => ({
        studentId: pref.studentId,
        position: pref.topicOrder.indexOf(args.topicId) + 1,
        lastUpdated: pref.lastUpdated
      }))

    // Time series data for the last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const timeSeriesData = generateTimeSeriesData(rankingEvents, thirtyDaysAgo)

    // Position changes over time
    const positionChanges = rankingEvents
      .filter(e => e.action === "moved")
      .map(e => ({
        studentId: e.studentId,
        from: e.previousPosition || 0,
        to: e.position,
        timestamp: e._creationTime,
        direction: (e.previousPosition || 0) > e.position ? "up" : "down"
      }))

    // Get subtopics for this topic
    const subtopics = topic.subtopicIds ?
      await Promise.all(
        topic.subtopicIds.map(id => ctx.db.get(id))
      ) : []

    return {
      topic: {
        id: topic._id,
        title: topic.title,
        description: topic.description,
        subtopics: subtopics.filter(s => s !== null),
        isActive: topic.isActive
      },
      students: selectedByStudents,
      timeline: timeSeriesData,
      positionChanges,
      summary: {
        totalStudents: selectedByStudents.length,
        averagePosition: selectedByStudents.length > 0
          ? selectedByStudents.reduce((sum, s) => sum + s.position, 0) / selectedByStudents.length
          : 0,
        recentActivity: rankingEvents.filter(e =>
          e._creationTime > Date.now() - 24 * 60 * 60 * 1000
        ).length
      }
    }
  }
})

// Helper functions
function calculateMomentum(events: any[]): "rising" | "falling" | "stable" {
  if (events.length < 5) return "stable"

  const recentEvents = events.slice(-10)
  const olderEvents = events.slice(-20, -10)

  const recentAdds = recentEvents.filter(e => e.action === "added").length
  const olderAdds = olderEvents.filter(e => e.action === "added").length

  if (recentAdds > olderAdds * 1.5) return "rising"
  if (recentAdds < olderAdds * 0.5) return "falling"
  return "stable"
}

function generateTimeSeriesData(events: any[], startTime: number) {
  const dayBuckets = new Map<string, number>()

  events
    .filter(e => e._creationTime >= startTime)
    .forEach(event => {
      const date = new Date(event._creationTime)
      const dayKey = date.toISOString().split('T')[0]
      dayBuckets.set(dayKey, (dayBuckets.get(dayKey) || 0) + 1)
    })

  // Fill in missing days with 0
  const days = []
  const currentDate = new Date(startTime)
  const endDate = new Date()

  while (currentDate <= endDate) {
    const dayKey = currentDate.toISOString().split('T')[0]
    days.push({
      date: dayKey,
      events: dayBuckets.get(dayKey) || 0
    })
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return days
}