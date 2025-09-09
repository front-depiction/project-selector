import { query } from "./_generated/server"
import * as SelectionPeriod from "./schemas/SelectionPeriod"

/**
 * Gets statistics for the landing page.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getLandingStats = query({
  args: {},
  handler: async (ctx) => {
    // Get active selection period
    const activePeriod = await ctx.db
      .query("selectionPeriods")
      .withIndex("by_active", q => q.eq("isActive", true))
      .first()

    if (!activePeriod) {
      return {
        isActive: false,
        periodStatus: "inactive" as const,
        totalTopics: 0,
        totalStudents: 0,
        averageSelectionsPerStudent: 0,
        mostPopularTopics: [],
        leastPopularTopics: []
      }
    }

    const periodStatus = SelectionPeriod.getStatus()(activePeriod)

    // Get all topics for this semester
    const topics = await ctx.db
      .query("topics")
      .withIndex("by_semester", q => q.eq("semesterId", activePeriod.semesterId))
      .filter(q => q.eq(q.field("isActive"), true))
      .collect()

    // Get all preferences
    const preferences = await ctx.db
      .query("preferences")
      .withIndex("by_semester", q => q.eq("semesterId", activePeriod.semesterId))
      .collect()

    // Calculate topic popularity
    const topicCounts = new Map<string, number>()
    let totalSelections = 0

    for (const pref of preferences) {
      for (const topicId of pref.topicOrder) {
        topicCounts.set(topicId, (topicCounts.get(topicId) || 0) + 1)
        totalSelections++
      }
    }

    // Get most and least popular topics
    const topicsWithCounts = topics.map(topic => ({
      ...topic,
      count: topicCounts.get(topic._id) || 0
    }))

    const sortedByPopularity = [...topicsWithCounts].sort((a, b) => b.count - a.count)
    const mostPopular = sortedByPopularity.slice(0, 3)
    const leastPopular = sortedByPopularity.slice(-3).reverse()

    const averageSelectionsPerStudent = 
      preferences.length > 0 ? totalSelections / preferences.length : 0

    return {
      isActive: true,
      periodStatus,
      openDate: activePeriod.openDate,
      closeDate: activePeriod.closeDate,
      totalTopics: topics.length,
      totalStudents: preferences.length,
      totalSelections,
      averageSelectionsPerStudent,
      mostPopularTopics: mostPopular.map(t => ({
        title: t.title,
        count: t.count
      })),
      leastPopularTopics: leastPopular.map(t => ({
        title: t.title,
        count: t.count
      }))
    }
  }
})