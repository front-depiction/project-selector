import { mutation, query, internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import * as SelectionPeriod from "./schemas/SelectionPeriod"
import type { Id } from "./_generated/dataModel"
import { generateShareableSlug, isShareableSlug } from "./lib/slugGenerator"

/**
 * Creates a new selection period.
 * Multiple periods can exist, but only one can be active at a time.
 * 
 * When topicIds are provided, those topics will have their semesterId updated
 * to match the period's semesterId, properly linking them to this period.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const createPeriod = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    semesterId: v.string(),
    openDate: v.number(),
    closeDate: v.number(),
    minimizeCategoryIds: v.optional(v.array(v.id("categories"))),
    rankingsEnabled: v.optional(v.boolean()),
    topicIds: v.optional(v.array(v.id("topics"))),
  },
  handler: async (ctx, args) => {
    // Validate dates
    if (args.openDate >= args.closeDate) {
      throw new Error("Open date must be before close date")
    }

    // Generate a unique shareable slug for this period
    const shareableSlug = generateShareableSlug()

    // Update selected topics' semesterId to link them to this period
    if (args.topicIds && args.topicIds.length > 0) {
      for (const topicId of args.topicIds) {
        const topic = await ctx.db.get(topicId)
        if (topic) {
          await ctx.db.patch(topicId, { semesterId: args.semesterId })
        }
      }
    }

    const now = Date.now()

    // CASE 1: Period has already ended
    if (args.closeDate <= now) {
      const periodId = await ctx.db.insert("selectionPeriods", SelectionPeriod.makeClosed({
        semesterId: args.semesterId,
        title: args.title,
        description: args.description,
        openDate: args.openDate,
        closeDate: args.closeDate,
        shareableSlug,
        minimizeCategoryIds: args.minimizeCategoryIds,
        rankingsEnabled: args.rankingsEnabled,
      }))
      return { success: true, periodId, shareableSlug }
    }

    // CASE 2: Period should be open now
    if (args.openDate <= now) {
      // 1. Insert Inactive first (to get ID)
      const periodId = await ctx.db.insert("selectionPeriods", SelectionPeriod.makeInactive({
        semesterId: args.semesterId,
        title: args.title,
        description: args.description,
        openDate: args.openDate,
        closeDate: args.closeDate,
        shareableSlug,
        minimizeCategoryIds: args.minimizeCategoryIds,
        rankingsEnabled: args.rankingsEnabled,
      }))

      // 2. Schedule closing
      const closeScheduleId = await ctx.scheduler.runAt(
        args.closeDate,
        internal.assignments.assignPeriod,
        { periodId }
      )

      // 3. Update to Open
      await ctx.db.replace(periodId, SelectionPeriod.makeOpen({
        semesterId: args.semesterId,
        title: args.title,
        description: args.description,
        openDate: args.openDate,
        closeDate: args.closeDate,
        shareableSlug,
        scheduledFunctionId: closeScheduleId,
        minimizeCategoryIds: args.minimizeCategoryIds,
        rankingsEnabled: args.rankingsEnabled,
      }))

      return { success: true, periodId, shareableSlug }
    }

    // CASE 3: FUTURE (inactive, but scheduled to open)
    const periodId = await ctx.db.insert("selectionPeriods", SelectionPeriod.makeInactive({
      semesterId: args.semesterId,
      title: args.title,
      description: args.description,
      openDate: args.openDate,
      closeDate: args.closeDate,
      shareableSlug,
      minimizeCategoryIds: args.minimizeCategoryIds,
      rankingsEnabled: args.rankingsEnabled,
    }))

    // Schedule open
    const openScheduleId = await ctx.scheduler.runAt(
      args.openDate,
      internal.selectionPeriods.activatePeriod,
      { periodId }
    )

    // Update to Inactive with scheduledOpenFunctionId
    await ctx.db.replace(periodId, SelectionPeriod.makeInactive({
      semesterId: args.semesterId,
      title: args.title,
      description: args.description,
      openDate: args.openDate,
      closeDate: args.closeDate,
      shareableSlug,
      scheduledOpenFunctionId: openScheduleId,
      minimizeCategoryIds: args.minimizeCategoryIds,
      rankingsEnabled: args.rankingsEnabled,
    }))

    return { success: true, periodId, shareableSlug }
  }
})

/**
 * Updates an existing selection period.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const updatePeriod = mutation({
  args: {
    periodId: v.id("selectionPeriods"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    openDate: v.optional(v.number()),
    closeDate: v.optional(v.number()),
    minimizeCategoryIds: v.optional(v.array(v.id("categories"))),
    rankingsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.periodId)
    if (!existing) {
      throw new Error("Period not found")
    }

    // Don't allow updating if already assigned
    if (SelectionPeriod.isAssigned(existing)) {
      throw new Error("Cannot update a period that has already been assigned")
    }

    // Build updated values
    const title = args.title ?? existing.title
    const description = args.description ?? existing.description
    const openDate = args.openDate ?? existing.openDate
    const closeDate = args.closeDate ?? existing.closeDate
    const minimizeCategoryIds = args.minimizeCategoryIds ?? existing.minimizeCategoryIds
    const rankingsEnabled = args.rankingsEnabled ?? existing.rankingsEnabled

    if (openDate >= closeDate) {
      throw new Error("Open date must be before close date")
    }

    const now = Date.now()

    // Cancel existing scheduled functions
    if (SelectionPeriod.isOpen(existing)) {
      await ctx.scheduler.cancel(existing.scheduledFunctionId)
    } else if (SelectionPeriod.isInactive(existing) && existing.scheduledOpenFunctionId) {
      await ctx.scheduler.cancel(existing.scheduledOpenFunctionId)
    }

    // Re-evaluate state based on new dates
    // Preserve the existing shareableSlug
    const shareableSlug = existing.shareableSlug

    // State: CLOSED
    if (closeDate <= now) {
      await ctx.db.replace(args.periodId, SelectionPeriod.makeClosed({
        semesterId: existing.semesterId,
        title,
        description,
        openDate,
        closeDate,
        shareableSlug,
        minimizeCategoryIds,
        rankingsEnabled,
      }))
    }
    // State: OPEN
    else if (openDate <= now) {
      const closeScheduleId = await ctx.scheduler.runAt(
        closeDate,
        internal.assignments.assignPeriod,
        { periodId: args.periodId }
      )
      await ctx.db.replace(args.periodId, SelectionPeriod.makeOpen({
        semesterId: existing.semesterId,
        title,
        description,
        openDate,
        closeDate,
        shareableSlug,
        scheduledFunctionId: closeScheduleId,
        minimizeCategoryIds,
        rankingsEnabled,
      }))
    }
    // State: INACTIVE (Future)
    else {
      const openScheduleId = await ctx.scheduler.runAt(
        openDate,
        internal.selectionPeriods.activatePeriod,
        { periodId: args.periodId }
      )
      await ctx.db.replace(args.periodId, SelectionPeriod.makeInactive({
        semesterId: existing.semesterId,
        title,
        description,
        openDate,
        closeDate,
        shareableSlug,
        scheduledOpenFunctionId: openScheduleId,
        minimizeCategoryIds,
        rankingsEnabled,
      }))
    }

    return { success: true }
  }
})

/**
 * Deletes a selection period.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const deletePeriod = mutation({
  args: {
    periodId: v.id("selectionPeriods")
  },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId)
    if (!period) {
      throw new Error("Period not found")
    }

    // Cancel scheduled function if exists
    if (SelectionPeriod.hasScheduledFunction(period)) {
      await ctx.scheduler.cancel(period.scheduledFunctionId)
    } else if (SelectionPeriod.isInactive(period) && period.scheduledOpenFunctionId) {
      await ctx.scheduler.cancel(period.scheduledOpenFunctionId)
    }

    // Cascade delete all related data

    // 1. Delete assignments for this period
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_period", q => q.eq("periodId", args.periodId))
      .collect()
    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id)
    }

    // 2. Delete student answers for this period
    // Note: by_student_period index requires both studentId and selectionPeriodId,
    // so we query all and filter by period
    const allStudentAnswers = await ctx.db.query("studentAnswers").collect()
    const studentAnswers = allStudentAnswers.filter(a => a.selectionPeriodId === args.periodId)
    for (const answer of studentAnswers) {
      await ctx.db.delete(answer._id)
    }

    // 3. Delete period student allow list entries
    const allowListEntries = await ctx.db
      .query("periodStudentAllowList")
      .withIndex("by_period", q => q.eq("selectionPeriodId", args.periodId))
      .collect()
    for (const entry of allowListEntries) {
      await ctx.db.delete(entry._id)
    }

    // 4. Delete selection questions for this period
    const selectionQuestions = await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", q => q.eq("selectionPeriodId", args.periodId))
      .collect()
    for (const question of selectionQuestions) {
      await ctx.db.delete(question._id)
    }

    // 5. Delete preferences for this period's semester
    // Note: We delete by semesterId since preferences are linked to semester
    const preferences = await ctx.db
      .query("preferences")
      .withIndex("by_semester", q => q.eq("semesterId", period.semesterId))
      .collect()
    for (const preference of preferences) {
      await ctx.db.delete(preference._id)
    }

    // 6. Delete ranking events for this period's semester
    const rankingEvents = await ctx.db
      .query("rankingEvents")
      .withIndex("by_semester", q => q.eq("semesterId", period.semesterId))
      .collect()
    for (const event of rankingEvents) {
      await ctx.db.delete(event._id)
    }

    // Finally, delete the period itself
    await ctx.db.delete(args.periodId)
    return { success: true }
  }
})

/**
 * Sets a period as active/open.
 * Multiple periods can be open simultaneously - they remain active until their close date.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const setActivePeriod = mutation({
  args: {
    periodId: v.id("selectionPeriods")
  },
  handler: async (ctx, args) => {

    const period = await ctx.db.get(args.periodId)
    if (!period) throw new Error("Period not found")

    const now = Date.now();

    if (SelectionPeriod.isWithinWindow(now)(period)) {

      if (SelectionPeriod.isInactive(period) && period.scheduledOpenFunctionId) {
        await ctx.scheduler.cancel(period.scheduledOpenFunctionId)
      }

      // Schedule close
      const closeScheduleId = await ctx.scheduler.runAt(
        period.closeDate,
        internal.assignments.assignPeriod,
        { periodId: args.periodId }
      )
      // Update to Open (preserve existing shareableSlug)
      await ctx.db.replace(args.periodId, SelectionPeriod.makeOpen({
        semesterId: period.semesterId,
        title: period.title,
        description: period.description,
        openDate: period.openDate,
        closeDate: period.closeDate,
        shareableSlug: period.shareableSlug,
        scheduledFunctionId: closeScheduleId
      }))
    }

    return { success: true }
  }
})

/**
 * Internal mutation to activate a period when its open date is reached.
 */
export const activatePeriod = internalMutation({
  args: {
    periodId: v.id("selectionPeriods")
  },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId)
    if (!period) return // Deleted?

    // Only activate if still inactive
    if (period.kind !== "inactive") return

    const now = Date.now()
    if (period.openDate > now) {
    }

    // Check if we passed close date already
    if (period.closeDate <= now) {
      await ctx.db.replace(args.periodId, SelectionPeriod.makeClosed(SelectionPeriod.getBase(period)))
      return
    }

    // Activate!
    const closeScheduleId = await ctx.scheduler.runAt(
      period.closeDate,
      internal.assignments.assignPeriod,
      { periodId: args.periodId }
    )

    await ctx.db.replace(args.periodId, SelectionPeriod.makeOpen({
      ...SelectionPeriod.getBase(period),
      scheduledFunctionId: closeScheduleId
    }))
  }
})

/**
 * Gets all selection periods with their statistics.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getAllPeriodsWithStats = query({
  args: {},
  handler: async (ctx) => {
    const periods = await ctx.db.query("selectionPeriods").collect()

    // Get stats for each period
    const periodsWithStats = await Promise.all(
      periods.map(async (period) => {
        // Count generated student codes (allow list)
        const allowList = await ctx.db
          .query("periodStudentAllowList")
          .withIndex("by_period", q => q.eq("selectionPeriodId", period._id))
          .collect()

        // Count assignments if assigned
        let assignmentCount = 0
        if (SelectionPeriod.isAssigned(period)) {
          const assignments = await ctx.db
            .query("assignments")
            .withIndex("by_period", q => q.eq("periodId", period._id))
            .collect()
          assignmentCount = assignments.length
        }

        return {
          ...period,
          studentCount: allowList.length,
          assignmentCount
        }
      })
    )

    // Sort by close date (most recent first)
    return periodsWithStats.sort((a, b) => (b.closeDate || 0) - (a.closeDate || 0))
  }
})

/**
 * Gets a selection period by its shareable slug.
 * Only returns periods that are in "open" state (joinable by students).
 *
 * This is a public query intended for student access via shareable links.
 *
 * @category Queries
 * @since 0.1.0
 */
export const getPeriodBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args): Promise<(SelectionPeriod.SelectionPeriod & { _id: Id<"selectionPeriods"> }) | null> => {
    // Validate slug format
    if (!isShareableSlug(args.slug)) {
      return null
    }

    // Query by index
    const period = await ctx.db
      .query("selectionPeriods")
      .withIndex("by_slug", q => q.eq("shareableSlug", args.slug))
      .first()

    if (!period) {
      return null
    }

    // Only return if period is open (joinable)
    if (period.kind !== "open") {
      return null
    }

    return period
  }
})

/**
 * Gets a selection period by its shareable slug regardless of state.
 * Intended for admin use where access to any period state is required.
 *
 * @category Queries
 * @since 0.1.0
 */
export const getPeriodBySlugAnyState = query({
  args: { slug: v.string() },
  handler: async (ctx, args): Promise<(SelectionPeriod.SelectionPeriod & { _id: Id<"selectionPeriods"> }) | null> => {
    // Validate slug format
    if (!isShareableSlug(args.slug)) {
      return null
    }

    // Query by index
    const period = await ctx.db
      .query("selectionPeriods")
      .withIndex("by_slug", q => q.eq("shareableSlug", args.slug))
      .first()

    return period ?? null
  }
})