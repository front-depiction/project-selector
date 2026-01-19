import { action } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"

/**
 * Assigns students to topics by requesting CP-SAT/GA solver, then returns an ack.
 * This is the recommended way to assign students when CP-SAT is available.
 * 
 * @category Actions
 * @since 0.3.0
 */
export const assignWithCPSAT = action({
  args: { periodId: v.id("selectionPeriods") },
  handler: async (
    ctx,
    args
  ): Promise<{ acknowledged: true; deferredId: string } | { acknowledged: false; fallback: true }> => {
    // Request solver job first; fallback to simple distribution if it fails.
    try {
      const ack = await ctx.runAction(internal.assignmentSolver.solveAssignment, {
        periodId: args.periodId,
      })
      return ack as unknown as { acknowledged: true; deferredId: string }
    } catch (error) {
      console.warn("Solver unavailable, using simple distribution:", error)
      await ctx.runMutation(internal.assignments.assignPeriod, { periodId: args.periodId })
      return { acknowledged: false, fallback: true }
    }
  }
})
