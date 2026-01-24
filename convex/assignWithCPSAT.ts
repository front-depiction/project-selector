import { action, internalAction } from "./_generated/server"
import type { FunctionReturnType } from "convex/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"

/**
 * Initiates CP-SAT solver evaluation and stores a deferred assignment request.
 * Assignment results are delivered asynchronously via the deferred callback.
 * 
 * @category Actions
 * @since 0.3.0
 */
export const assignWithCPSAT: ReturnType<typeof action> = action({
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
  handler: async (ctx, args): Promise<FunctionReturnType<typeof internal.assignmentSolver.requestDeferredAssignment>> => {
    const result: FunctionReturnType<typeof internal.assignmentSolver.requestDeferredAssignment> = await ctx.runAction(
      internal.assignmentSolver.requestDeferredAssignment,
      {
      periodId: args.periodId,
      settings: args.settings
      }
    )

    return result
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
