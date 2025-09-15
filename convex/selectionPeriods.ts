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
        allPeriods.map(period => 
          ctx.db.patch(period._id, { isActive: false })
        )
      )
    }

    // Create the period
    const periodId = await ctx.db.insert("selectionPeriods", SelectionPeriod.makeOpen({
      semesterId: args.semesterId,
      title: args.title,
      description: args.description,
      openDate: args.openDate,
      closeDate: args.closeDate,
      isActive: args.setAsActive || false
    }))

    // Schedule automatic assignment at close date if in the future
    if (args.closeDate > now) {
      const scheduledId = await ctx.scheduler.runAt(
        args.closeDate,
        internal.assignments.assignPeriod,
        { periodId }
      )
      
      await ctx.db.patch(periodId, { scheduledFunctionId: scheduledId })
    }

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
    if (existing.status === "assigned") {
      throw new Error("Cannot update a period that has already been assigned")
    }

    const updates: Partial<typeof existing> = {}
    
    if (args.title !== undefined) updates.title = args.title
    if (args.description !== undefined) updates.description = args.description
    if (args.openDate !== undefined) updates.openDate = args.openDate
    
    // Handle close date changes
    if (args.closeDate !== undefined && args.closeDate !== existing.closeDate) {
      updates.closeDate = args.closeDate
      
      // Cancel old scheduled function
      if (existing.scheduledFunctionId) {
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
        updates.scheduledFunctionId = scheduledId
      }
    }

    await ctx.db.patch(args.periodId, updates)
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
    if (period.status === "assigned") {
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
    if (period.scheduledFunctionId) {
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

    // Deactivate all periods
    const allPeriods = await ctx.db.query("selectionPeriods").collect()
    await Promise.all(
      allPeriods.map(p => 
        ctx.db.patch(p._id, { isActive: p._id === args.periodId })
      )
    )

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
        if (period.status === "assigned") {
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