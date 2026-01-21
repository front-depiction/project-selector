import { v } from "convex/values"
import type { Infer } from "convex/values"

/**
 * Convex validator for ExperimentComparison objects.
 * 
 * @category Validators
 * @since 0.4.0
 */
export const ExperimentComparison = v.object({
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
  createdAt: v.number()
})

/**
 * ExperimentComparison type representing a comparison between two assignment batches.
 * 
 * @category Types
 * @since 0.4.0
 */
export type ExperimentComparison = Readonly<Infer<typeof ExperimentComparison>>

/**
 * Creates a new ExperimentComparison.
 * 
 * @category Constructors
 * @since 0.4.0
 */
export const make = (params: {
  readonly periodId: any
  readonly originalBatchId: string
  readonly newBatchId: string
  readonly totalStudents: number
  readonly sameGroupCount: number
  readonly differentGroupCount: number
  readonly rankedStudents: number
  readonly avgRankOriginal: number
  readonly avgRankNew: number
  readonly teamSizesMatch: boolean
  readonly betterMatches: number
  readonly worseMatches: number
  readonly sameRank: number
  readonly rowsSkipped: number
  readonly betterMatchesList: Array<{
    readonly name: string
    readonly studentId: string
    readonly originalRank: number
    readonly newRank: number
  }>
  readonly worseMatchesList: Array<{
    readonly name: string
    readonly studentId: string
    readonly originalRank: number
    readonly newRank: number
  }>
}): ExperimentComparison => ({
  periodId: params.periodId,
  originalBatchId: params.originalBatchId,
  newBatchId: params.newBatchId,
  totalStudents: params.totalStudents,
  sameGroupCount: params.sameGroupCount,
  differentGroupCount: params.differentGroupCount,
  rankedStudents: params.rankedStudents,
  avgRankOriginal: params.avgRankOriginal,
  avgRankNew: params.avgRankNew,
  teamSizesMatch: params.teamSizesMatch,
  betterMatches: params.betterMatches,
  worseMatches: params.worseMatches,
  sameRank: params.sameRank,
  rowsSkipped: params.rowsSkipped,
  betterMatchesList: params.betterMatchesList,
  worseMatchesList: params.worseMatchesList,
  createdAt: Date.now()
} as const)

/**
 * Calculates similarity percentage between two assignment batches.
 * 
 * @category Utilities
 * @since 0.4.0
 */
export const calculateSimilarity = (comparison: ExperimentComparison): number => {
  const sameGroupPercentage = (comparison.sameGroupCount / comparison.totalStudents) * 100
  const sameRankPercentage = (comparison.sameRank / comparison.rankedStudents) * 100
  const avgRankDiff = Math.abs(comparison.avgRankOriginal - comparison.avgRankNew)
  const rankSimilarity = Math.max(0, 100 - (avgRankDiff * 20)) // Penalize rank differences
  
  return (sameGroupPercentage * 0.5 + sameRankPercentage * 0.3 + rankSimilarity * 0.2)
}
