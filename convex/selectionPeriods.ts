import { mutation, query, internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import * as SelectionPeriod from "./schemas/SelectionPeriod"
import type { Id } from "./_generated/dataModel"

/**
 * Creates a new selection period.
 * Multiple periods can exist, but only one can be active at a time.
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
  },
  handler: async (ctx, args) => {
    // Validate dates
    if (args.openDate >= args.closeDate) {
      throw new Error("Open date must be before close date")
    }

    const now = Date.now()

    // CASE 1: Period has already ended
    if (args.closeDate <= now) {
      const periodId = await ctx.db.insert("selectionPeriods", SelectionPeriod.makeClosed({
        semesterId: args.semesterId,
        title: args.title,
        description: args.description,
        openDate: args.openDate,
        closeDate: args.closeDate
      }))
      return { success: true, periodId }
    }

    // CASE 2: Period should be open now
    if (args.openDate <= now) {
      // 1. Insert Inactive first (to get ID)
      const periodId = await ctx.db.insert("selectionPeriods", SelectionPeriod.makeInactive({
        semesterId: args.semesterId,
        title: args.title,
        description: args.description,
        openDate: args.openDate,
        closeDate: args.closeDate
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
        scheduledFunctionId: closeScheduleId
      }))

      return { success: true, periodId }
    }

    // CASE 3: FUTURE (inactive, but scheduled to open)
    const periodId = await ctx.db.insert("selectionPeriods", SelectionPeriod.makeInactive({
      semesterId: args.semesterId,
      title: args.title,
      description: args.description,
      openDate: args.openDate,
      closeDate: args.closeDate
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
      scheduledOpenFunctionId: openScheduleId
    }))

    return { success: true, periodId }
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
    closeDate: v.optional(v.number())
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

    const now = Date.now()

    // Cancel existing scheduled functions
    if (SelectionPeriod.isOpen(existing)) {
      await ctx.scheduler.cancel(existing.scheduledFunctionId)
    } else if (SelectionPeriod.isInactive(existing) && existing.scheduledOpenFunctionId) {
      await ctx.scheduler.cancel(existing.scheduledOpenFunctionId)
    }

    // Re-evaluate state based on new dates

    // State: CLOSED
    if (closeDate <= now) {
      await ctx.db.replace(args.periodId, SelectionPeriod.makeClosed({
        semesterId: existing.semesterId,
        title,
        description,
        openDate,
        closeDate
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
        scheduledFunctionId: closeScheduleId
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
        scheduledOpenFunctionId: openScheduleId
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

    // Don't allow deleting if already assigned
    if (SelectionPeriod.isAssigned(period)) {
      throw new Error("Cannot delete a period that has already been assigned")
    }

    // Check if there are any preferences for this period's semester
    const preferences = await ctx.db
      .query("preferences")
      .withIndex("by_semester", q => q.eq("semesterId", period.semesterId))
      .first()

    if (preferences) {
      throw new Error("Cannot delete period with existing student selections")
    }

    // Cancel scheduled function if exists
    if (SelectionPeriod.hasScheduledFunction(period)) {
      await ctx.scheduler.cancel(period.scheduledFunctionId)
    } else if (SelectionPeriod.isInactive(period) && period.scheduledOpenFunctionId) {
      await ctx.scheduler.cancel(period.scheduledOpenFunctionId)
    }

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
      // Update to Open
      await ctx.db.replace(args.periodId, SelectionPeriod.makeOpen({
        semesterId: period.semesterId,
        title: period.title,
        description: period.description,
        openDate: period.openDate,
        closeDate: period.closeDate,
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
        // Count preferences for this period's semester
        const preferences = await ctx.db
          .query("preferences")
          .withIndex("by_semester", q => q.eq("semesterId", period.semesterId))
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
          studentCount: preferences.length,
          assignmentCount
        }
      })
    )

    // Sort by close date (most recent first)
    return periodsWithStats.sort((a, b) => (b.closeDate || 0) - (a.closeDate || 0))
  }
})