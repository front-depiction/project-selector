import { QueryCtx } from "../_generated/server"

/**
 * Gets the active selection period (currently open).
 * Returns null if no open period exists.
 */
export const getActiveSelectionPeriod = async (ctx: QueryCtx) => {
  return await ctx.db
    .query("selectionPeriods")
    .withIndex("by_kind", (q) => q.eq("kind", "open"))
    .first()
}