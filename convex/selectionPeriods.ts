import { mutation, query } from "./_generated/server"
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
    setAsActive: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    // Validate dates
    if (args.openDate >= args.closeDate) {
      throw new Error("Open date must be before close date")
    }

    const now = Date.now()
    
    // Deactivate other periods if this should be active
    if (args.setAsActive) {
      const allPeriods = await ctx.db.query("selectionPeriods").collect()
      await Promise.all(
        allPeriods.map(async period => {
          // Close any open periods
          if (SelectionPeriod.isOpen(period)) {
            await ctx.db.replace(period._id, SelectionPeriod.close(period))
          }
        })
      )
    }

    // Create the period as inactive first
    const periodId = await ctx.db.insert("selectionPeriods", SelectionPeriod.makeInactive({
      semesterId: args.semesterId,
      title: args.title,
      description: args.description,
      openDate: args.openDate,
      closeDate: args.closeDate
    }))

    // Schedule automatic assignment at close date if in the future
    let scheduledId: Id<"_scheduled_functions"> | undefined
    if (args.closeDate > now) {
      scheduledId = await ctx.scheduler.runAt(
        args.closeDate,
        internal.assignments.assignPeriod,
        { periodId }
      )
    }

    // Update to open state if requested and we have a scheduled function
    if (scheduledId && args.setAsActive) {
      const finalPeriod = SelectionPeriod.makeOpen({
        semesterId: args.semesterId,
        title: args.title,
        description: args.description,
        openDate: args.openDate,
        closeDate: args.closeDate,
        scheduledFunctionId: scheduledId
      })
      await ctx.db.replace(periodId, finalPeriod)
    }
    // Otherwise leave as inactive (already created above)

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

    // Handle close date changes
    if (args.closeDate !== undefined && args.closeDate !== existing.closeDate) {
      // Cancel old scheduled function
      if (SelectionPeriod.hasScheduledFunction(existing)) {
        await ctx.scheduler.cancel(existing.scheduledFunctionId)
      }

      // Create new scheduled function if close date is in the future
      const now = Date.now()
      if (args.closeDate > now) {
        const scheduledId = await ctx.scheduler.runAt(
          args.closeDate,
          internal.assignments.assignPeriod,
          { periodId: args.periodId }
        )

        // Update as open period with new scheduled function
        await ctx.db.replace(args.periodId, SelectionPeriod.makeOpen({
          semesterId: existing.semesterId,
          title,
          description,
          openDate,
          closeDate,
          scheduledFunctionId: scheduledId
        }))
      } else {
        // Update as closed period if past close date
        await ctx.db.replace(args.periodId, SelectionPeriod.makeClosed({
          semesterId: existing.semesterId,
          title,
          description,
          openDate,
          closeDate
        }))
      }
    } else {
      // Just update fields without changing scheduled function
      if (SelectionPeriod.isOpen(existing)) {
        await ctx.db.replace(args.periodId, SelectionPeriod.makeOpen({
          semesterId: existing.semesterId,
          title,
          description,
          openDate,
          closeDate,
          scheduledFunctionId: existing.scheduledFunctionId
        }))
      } else if (SelectionPeriod.isClosed(existing)) {
        await ctx.db.replace(args.periodId, SelectionPeriod.makeClosed({
          semesterId: existing.semesterId,
          title,
          description,
          openDate,
          closeDate
        }))
      } else if (SelectionPeriod.isInactive(existing)) {
        await ctx.db.replace(args.periodId, SelectionPeriod.makeInactive({
          semesterId: existing.semesterId,
          title,
          description,
          openDate,
          closeDate
        }))
      }
      // Don't update if assigned
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
    }

    await ctx.db.delete(args.periodId)
    return { success: true }
  }
})

/**
 * Sets a period as active, deactivating all others.
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
    if (!period) {
      throw new Error("Period not found")
    }

    // Can't activate an already assigned period
    if (SelectionPeriod.isAssigned(period)) {
      throw new Error("Cannot activate an already assigned period")
    }

    // Close all other open periods first
    const allPeriods = await ctx.db.query("selectionPeriods").collect()
    await Promise.all(
      allPeriods
        .filter(p => p._id !== args.periodId && SelectionPeriod.isOpen(p))
        .map(p => ctx.db.replace(p._id, SelectionPeriod.toClosed(p as SelectionPeriod.OpenPeriod)))
    )

    // If already open, nothing more to do
    if (SelectionPeriod.isOpen(period)) {
      return { success: true }
    }

    // For inactive or closed periods, we need to schedule and open
    const now = Date.now()
    if (period.closeDate <= now) {
      throw new Error("Cannot activate a period with a past close date")
    }

    // Schedule the assignment function
    const scheduledId = await ctx.scheduler.runAt(
      period.closeDate,
      internal.assignments.assignPeriod,
      { periodId: args.periodId }
    )

    // Update to open state
    await ctx.db.replace(args.periodId, SelectionPeriod.makeOpen({
      semesterId: period.semesterId,
      title: period.title,
      description: period.description,
      openDate: period.openDate,
      closeDate: period.closeDate,
      scheduledFunctionId: scheduledId
    }))

    return { success: true }
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