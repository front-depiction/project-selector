import { QueryCtx } from "../../_generated/server"

/**
 * Gets the active selection period.
 * Returns null if no active period exists.
 */
export const getActiveSelectionPeriod = async (ctx: QueryCtx) => {
  return await ctx.db
    .query("selectionPeriods")
    .withIndex("by_active", (q) => q.eq("isActive", true))
    .first()
}