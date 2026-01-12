import { query } from "./_generated/server"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import * as SelectionPeriod from "./schemas/SelectionPeriod"

/**
 * Type definition for landing stats return value
 */
export type LandingStats = 
  | {
      isActive: false
      periodStatus: "inactive"
      title: undefined
      totalTopics: number
      totalStudents: number
      averageSelectionsPerStudent: number
      mostPopularTopics: Array<{ title: string; count: number }>
      leastPopularTopics: Array<{ title: string; count: number }>
      totalSelections: number
    }
  | {
      isActive: true
      periodStatus: "open" | "closed" | "assigned" | "inactive"
      title: string
      openDate: number
      closeDate: number
      totalTopics: number
      totalStudents: number
      totalSelections: number
      averageSelectionsPerStudent: number
      mostPopularTopics: Array<{ title: string; count: number }>
      leastPopularTopics: Array<{ title: string; count: number }>
    }

/**
 * Gets statistics for the landing page.
 * If periodId is provided, stats are filtered to that period.
 * Otherwise, uses the active period or most recent assigned period.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getLandingStats = query({
  args: {
    periodId: v.optional(v.id("selectionPeriods"))
  },
  handler: async (ctx, args) => {
    let activePeriod = null

    // If periodId is provided, use that period
    if (args.periodId) {
      activePeriod = await ctx.db.get(args.periodId)
    }

    // Otherwise, get active selection period (open)
    if (!activePeriod) {
      const openPeriods = await ctx.db
        .query("selectionPeriods")
        .withIndex("by_kind", q => q.eq("kind", "open"))
        .collect()
      
      // If multiple open periods, get the most recent one
      if (openPeriods.length > 0) {
        activePeriod = openPeriods.sort((a, b) => (b.closeDate || 0) - (a.closeDate || 0))[0]
      }
    }

    // If no active period, check for recently assigned periods
    if (!activePeriod) {
      const allPeriods = await ctx.db
        .query("selectionPeriods")
        .collect()
      
      // Find the most recent assigned period
      const assignedPeriods = allPeriods
        .filter(p => SelectionPeriod.isAssigned(p))
        .sort((a, b) => (b.closeDate || 0) - (a.closeDate || 0))
      
      activePeriod = assignedPeriods[0]
    }

    // If no active period, aggregate stats across all periods
    if (!activePeriod) {
      // Get all topics (across all semesters)
      const allTopics = await ctx.db
        .query("topics")
        .filter(q => q.eq(q.field("isActive"), true))
        .collect()

      // Get all access code entries (across all periods)
      const allAccessCodeEntries = await ctx.db
        .query("periodStudentAllowList")
        .collect()
      
      // Count unique students (by studentId)
      const uniqueStudents = new Set(allAccessCodeEntries.map(e => e.studentId))
      const totalStudents = uniqueStudents.size

      // Get all preferences (across all semesters)
      const allPreferences = await ctx.db
        .query("preferences")
        .collect()

      const totalSelections = allPreferences
        .reduce((sum, pref) => sum + pref.topicOrder.length, 0)

      const averageSelectionsPerStudent =
        totalStudents > 0 ? totalSelections / totalStudents : 0

      return {
        isActive: false,
        periodStatus: "inactive" as const,
        title: undefined,
        totalTopics: allTopics.length,
        totalStudents,
        averageSelectionsPerStudent,
        mostPopularTopics: [],
        leastPopularTopics: [],
        totalSelections
      }
    }

    const periodStatus = SelectionPeriod.getStatus()(activePeriod)

    // Get all topics for this semester
    const topics = await ctx.db
      .query("topics")
      .withIndex("by_semester", q => q.eq("semesterId", activePeriod.semesterId))
      .filter(q => q.eq(q.field("isActive"), true))
      .collect()

    // Get all students with access codes for this period
    const accessCodeEntries = await ctx.db
      .query("periodStudentAllowList")
      .withIndex("by_period", q => q.eq("selectionPeriodId", activePeriod._id))
      .collect()
    
    const totalStudents = accessCodeEntries.length

    // Get all preferences (only from students who have actually submitted)
    const preferences = await ctx.db
      .query("preferences")
      .withIndex("by_semester", q => q.eq("semesterId", activePeriod.semesterId))
      .collect()

    // Calculate topic popularity declaratively
    const topicCounts = preferences
      .flatMap(pref => pref.topicOrder)
      .reduce((counts, topicId) => {
        counts.set(topicId, (counts.get(topicId) || 0) + 1)
        return counts
      }, new Map<string, number>())

    const totalSelections = preferences
      .reduce((sum, pref) => sum + pref.topicOrder.length, 0)

    // Get most and least popular topics
    const topicsWithCounts = topics.map(topic => ({
      ...topic,
      count: topicCounts.get(topic._id) || 0
    }))

    const sortedByPopularity = [...topicsWithCounts].sort((a, b) => b.count - a.count)
    const mostPopular = sortedByPopularity.slice(0, 3)
    const leastPopular = sortedByPopularity.slice(-3).reverse()

    const averageSelectionsPerStudent =
      totalStudents > 0 ? totalSelections / totalStudents : 0

    return {
      isActive: true,
      periodStatus,
      title: activePeriod.title,
      openDate: activePeriod.openDate,
      closeDate: activePeriod.closeDate,
      totalTopics: topics.length,
      totalStudents,
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