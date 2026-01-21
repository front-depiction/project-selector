import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import * as ExperimentComparison from "./schemas/ExperimentComparison"
import type { Id } from "./_generated/dataModel"

/**
 * Import experiment comparison data from CSV analysis.
 * 
 * @category Mutations
 * @since 0.4.0
 */
export const importComparison = mutation({
  args: {
    periodId: v.id("selectionPeriods"),
    originalBatchId: v.string(),
    newBatchId: v.string(),
    totalStudents: v.number(),
    sameGroupCount: v.number(),
    differentGroupCount: v.number(),
    rankedStudents: v.number(),
    avgRankOriginal: v.number(),
    avgRankNew: v.number(),
    teamSizesMatch: v.boolean(),
    betterMatches: v.number(),
    worseMatches: v.number(),
    sameRank: v.number(),
    rowsSkipped: v.number(),
    betterMatchesList: v.array(v.object({
      name: v.string(),
      studentId: v.string(),
      originalRank: v.number(),
      newRank: v.number()
    })),
    worseMatchesList: v.array(v.object({
      name: v.string(),
      studentId: v.string(),
      originalRank: v.number(),
      newRank: v.number()
    })),
  },
  handler: async (ctx, args) => {
    const comparison = ExperimentComparison.make({
      periodId: args.periodId,
      originalBatchId: args.originalBatchId,
      newBatchId: args.newBatchId,
      totalStudents: args.totalStudents,
      sameGroupCount: args.sameGroupCount,
      differentGroupCount: args.differentGroupCount,
      rankedStudents: args.rankedStudents,
      avgRankOriginal: args.avgRankOriginal,
      avgRankNew: args.avgRankNew,
      teamSizesMatch: args.teamSizesMatch,
      betterMatches: args.betterMatches,
      worseMatches: args.worseMatches,
      sameRank: args.sameRank,
      rowsSkipped: args.rowsSkipped,
      betterMatchesList: args.betterMatchesList,
      worseMatchesList: args.worseMatchesList,
    })

    return await ctx.db.insert("experimentComparisons", comparison)
  },
})

/**
 * Get all experiment comparisons for a period.
 * 
 * @category Queries
 * @since 0.4.0
 */
export const getComparisonsByPeriod = query({
  args: { periodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    const comparisons = await ctx.db
      .query("experimentComparisons")
      .withIndex("by_period", (q) => q.eq("periodId", args.periodId))
      .collect()

    return comparisons.map(comp => ({
      ...comp,
      similarity: ExperimentComparison.calculateSimilarity(comp)
    }))
  },
})

/**
 * Get a specific experiment comparison by ID.
 * 
 * @category Queries
 * @since 0.4.0
 */
export const getComparison = query({
  args: { comparisonId: v.id("experimentComparisons") },
  handler: async (ctx, args) => {
    const comparison = await ctx.db.get(args.comparisonId)
    if (!comparison) return null

    return {
      ...comparison,
      similarity: ExperimentComparison.calculateSimilarity(comparison)
    }
  },
})

/**
 * Get all experiment comparisons.
 * 
 * @category Queries
 * @since 0.4.0
 */
export const getAllComparisons = query({
  args: {},
  handler: async (ctx) => {
    const comparisons = await ctx.db
      .query("experimentComparisons")
      .collect()

    return comparisons
      .map(comp => ({
        ...comp,
        similarity: ExperimentComparison.calculateSimilarity(comp)
      }))
      .sort((a, b) => b.createdAt - a.createdAt)
  },
})
