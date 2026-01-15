import { action } from "./_generated/server"
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
  args: { periodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    // First, try to solve using CP-SAT
    let assignments
    try {
      assignments = await ctx.runAction(internal.assignmentSolver.solveAssignment, { periodId: args.periodId })
    } catch (error) {
      // If CP-SAT fails, fall back to simple distribution
      console.warn("CP-SAT solver unavailable, using simple distribution:", error)
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
      // Fallback to simple distribution
      await ctx.runMutation(internal.assignments.assignPeriod, { periodId: args.periodId })
    }
  }
})
