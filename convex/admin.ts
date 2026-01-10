import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import * as Topic from "./schemas/Topic"
import * as SelectionPeriod from "./schemas/SelectionPeriod"
import { getActiveSelectionPeriod } from "./share/selection_periods"
import {
  createTestSelectionPeriod,
  createTestTopics,
  generateTestStudents,
  insertTestPreferences,
  createTestRankings,
  deleteAllFromTable,
  cancelAllScheduled
} from "./share/admin_helpers"

/**
 * Seeds test data for development.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const seedTestData = mutation({
  args: {},
  handler: async (ctx) => {
    const semesterId = "2024-spring"
    const now = Date.now()
    const thirtyDaysFromNow = now + (30 * 24 * 60 * 60 * 1000)

    const [, topicIds] = await Promise.all([
      createTestSelectionPeriod(ctx, semesterId, now, thirtyDaysFromNow),
      createTestTopics(ctx, semesterId)
    ])

    const students = generateTestStudents(topicIds, 60)
    const [preferenceIds] = await Promise.all([
      insertTestPreferences(ctx, students, semesterId),
      createTestRankings(ctx, students, semesterId)
    ])
    return preferenceIds
  }
})

/**
 * Creates a new topic.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const createTopic = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    semesterId: v.string(),
    subtopicIds: v.optional(v.array(v.id("subtopics"))),
    requiresAllowList: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("topics", {
      ...Topic.make({
        title: args.title,
        description: args.description,
        semesterId: args.semesterId,
        isActive: true,
        subtopicIds: args.subtopicIds?.map(id => id as string)
      }),
      requiresAllowList: args.requiresAllowList ?? false
    })
    return id
  }
})

/**
 * Updates an existing topic.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const updateTopic = mutation({
  args: {
    id: v.id("topics"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    subtopicIds: v.optional(v.array(v.id("subtopics"))),
    requiresAllowList: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    await ctx.db.get(args.id).then(maybeTopic =>
      maybeTopic
      || Promise.reject("Topic Not Found"))

    const updates: any = {}
    if (args.title !== undefined) updates.title = args.title
    if (args.description !== undefined) updates.description = args.description
    if (args.isActive !== undefined) updates.isActive = args.isActive
    if (args.subtopicIds !== undefined) updates.subtopicIds = args.subtopicIds
    if (args.requiresAllowList !== undefined) updates.requiresAllowList = args.requiresAllowList

    await ctx.db.patch(args.id, updates)
  }
})

/**
 * Toggles a topic's active status.
 *
 * @category Mutations
 * @since 0.1.0
 */
export const toggleTopicActive = mutation({
  args: {
    id: v.id("topics")
  },
  handler: async (ctx, args) => {
    const topic = await ctx.db.get(args.id)
    if (!topic) {
      throw new Error("Topic not found")
    }

    await ctx.db.patch(args.id, {
      isActive: !topic.isActive
    })
  }
})

/**
 * Deletes a topic.
 *
 * @category Mutations
 * @since 0.1.0
 */
export const deleteTopic = mutation({
  args: {
    id: v.id("topics")
  },
  handler: async (ctx, args) => {
    // Check if topic has any preferences
    const allPreferences = await ctx.db.query("preferences").collect()
    const hasSelections = allPreferences.some(pref =>
      pref.topicOrder.includes(args.id)
    )

    if (hasSelections) {
      throw new Error("Cannot delete topic with existing student selections")
    }

    await ctx.db.delete(args.id)
  }
})


/**
 * Creates a selection period for seeding/testing.
 * Pure creation function - no cleanup or deletion.
 *
 * @category Mutations
 * @since 0.1.0
 */
export const createSelectionPeriod = mutation({
  args: {
    semesterId: v.string(),
    title: v.string(),
    description: v.string(),
    openDate: v.number(),
    closeDate: v.number(),
    isActive: v.boolean()
  },
  handler: async (ctx, args) => {
    const period = SelectionPeriod.makeInactive({
      semesterId: args.semesterId,
      title: args.title,
      description: args.description,
      openDate: args.openDate,
      closeDate: args.closeDate
    })

    const periodId = await ctx.db.insert("selectionPeriods", period)

    // If active, schedule close and activate
    if (args.isActive) {
      const scheduledId = await ctx.scheduler.runAt(
        args.closeDate,
        internal.assignments.assignPeriod,
        { periodId }
      )
      await ctx.db.replace(periodId, SelectionPeriod.toOpen(period, scheduledId))
    }
  }
})

/**
 * Gets the current selection period.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getCurrentPeriod = query({
  args: {},
  handler: async (ctx) => {
    const active = await getActiveSelectionPeriod(ctx)
    if (active) return active

    const periods = await ctx.db.query("selectionPeriods").collect()
    return SelectionPeriod.getMostRecentAssigned(periods) ?? null
  }
})

/**
 * Gets all selection periods.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getAllPeriods = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("selectionPeriods").collect()
  }
})

/**
 * Clears all data (for development).
 *
 * @category Mutations
 * @since 0.1.0
 */
export const clearAllData = mutation({
  args: {},
  handler: (ctx) =>
    Promise.all([
      deleteAllFromTable(ctx, "topics"),
      deleteAllFromTable(ctx, "subtopics"),
      deleteAllFromTable(ctx, "preferences"),
      deleteAllFromTable(ctx, "rankingEvents"),
      deleteAllFromTable(ctx, "selectionPeriods"),
      deleteAllFromTable(ctx, "assignments"),
      deleteAllFromTable(ctx, "topicStudentAllowList"),
      deleteAllFromTable(ctx, "topicTeacherAllowList"),
      cancelAllScheduled(ctx),
    ])
      .then(() => "All data cleared")
})
