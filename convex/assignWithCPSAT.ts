import { action, internalAction } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"

/**
 * Assigns students to topics using CP-SAT solver, then saves results.
 * This is the recommended way to assign students when CP-SAT is available.
 * 
 * @category Actions
 * @since 0.3.0
 */
export const assignWithCPSAT = action({
  args: {
    periodId: v.id("selectionPeriods"),
    settings: v.optional(v.object({
      rankingPercentage: v.optional(v.number()),
      maxTimeInSeconds: v.optional(v.number()),
      groupSizes: v.optional(v.array(v.object({
        topicId: v.id("topics"),
        size: v.number()
      })))
    }))
  },
  handler: async (ctx, args) => {
    // Solve using CP-SAT - errors will propagate to UI
    const assignments = await ctx.runAction(internal.assignmentSolver.solveAssignment, {
      periodId: args.periodId,
      settings: args.settings
    })

    // Validate we got assignments
    if (!assignments || assignments.length === 0) {
      throw new Error("CP-SAT solver returned no assignments")
    }

    // Save assignments via mutation
    await ctx.runMutation(internal.assignments.saveCPSATAssignments, {
      periodId: args.periodId,
      assignments
    })
  }
})

/**
 * Internal version that can be called from mutations (for seed data).
 * Note: This still uses fallback for seed data to avoid breaking test setup.
 * 
 * @category Internal Actions
 * @since 0.3.0
 */
export const assignWithCPSATInternal = internalAction({
  args: { periodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    // First, try to solve using CP-SAT
    let assignments
    try {
      assignments = await ctx.runAction(internal.assignmentSolver.solveAssignment, { periodId: args.periodId })
    } catch (error) {
      // If CP-SAT fails, fall back to simple distribution (for seed data only)
      console.warn("CP-SAT solver unavailable in seed data, using simple distribution:", error)
      await ctx.runMutation(internal.assignments.assignPeriod, { periodId: args.periodId })
      return
    }

    // If we got assignments from CP-SAT, save them via mutation
    if (assignments && assignments.length > 0) {
      await ctx.runMutation(internal.assignments.saveCPSATAssignments, {
        periodId: args.periodId,
        assignments
      })
    } else {
      // Fallback to simple distribution (for seed data only)
      await ctx.runMutation(internal.assignments.assignPeriod, { periodId: args.periodId })
    }
  }
})
