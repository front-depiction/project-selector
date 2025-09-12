import { v } from "convex/values"
import type { Infer } from "convex/values"

/**
 * Convex validator for Assignment objects.
 * 
 * @category Validators
 * @since 0.1.0
 */
export const Assignment = v.object({
  periodId: v.id("selectionPeriods"),
  batchId: v.string(),
  studentId: v.string(),
  topicId: v.id("topics"),
  assignedAt: v.number(),
  originalRank: v.optional(v.number())
})

/**
 * Assignment type representing a student's topic assignment.
 * 
 * @category Types
 * @since 0.1.0
 */
export type Assignment = Readonly<Infer<typeof Assignment>>

/**
 * Creates a new Assignment.
 * 
 * @category Constructors
 * @since 0.1.0
 * @example
 * import * as Assignment from "./schemas/Assignment"
 * 
 * const assignment = Assignment.make({
 *   periodId: "period_123" as any,
 *   batchId: "batch_123_1234567890",
 *   studentId: "student123",
 *   topicId: "topic_456" as any,
 *   assignedAt: Date.now(),
 *   originalRank: 2
 * })
 */
export const make = (params: {
  readonly periodId: any
  readonly batchId: string
  readonly studentId: string
  readonly topicId: any
  readonly assignedAt: number
  readonly originalRank?: number
}): Assignment => ({
  periodId: params.periodId,
  batchId: params.batchId,
  studentId: params.studentId,
  topicId: params.topicId,
  assignedAt: params.assignedAt,
  originalRank: params.originalRank
} as const)

/**
 * Creates a batch ID for a period's assignments.
 * 
 * @category Utilities
 * @since 0.1.0
 */
export const createBatchId = (periodId: string): string =>
  `batch_${periodId}_${Date.now()}`

/**
 * Checks if assignment was student's top choice.
 * 
 * @category Predicates
 * @since 0.1.0
 */
export const isTopChoice = (assignment: Assignment): boolean =>
  assignment.originalRank === 1

/**
 * Checks if assignment matched any of student's preferences.
 * 
 * @category Predicates
 * @since 0.1.0
 */
export const matchedPreference = (assignment: Assignment): boolean =>
  assignment.originalRank !== undefined

/**
 * Groups assignments by topic.
 * 
 * @category Combinators
 * @since 0.1.0
 */
export const groupByTopic = (assignments: readonly Assignment[]): Record<string, readonly Assignment[]> => {
  return assignments.reduce((acc, assignment) => {
    const topicId = assignment.topicId as string
    if (!acc[topicId]) {
      acc[topicId] = []
    }
    return {
      ...acc,
      [topicId]: [...acc[topicId], assignment]
    }
  }, {} as Record<string, readonly Assignment[]>)
}

/**
 * Groups assignments by student.
 * 
 * @category Combinators
 * @since 0.1.0
 */
export const groupByStudent = (assignments: readonly Assignment[]): Record<string, Assignment> => {
  return assignments.reduce((acc, assignment) => ({
    ...acc,
    [assignment.studentId]: assignment
  }), {} as Record<string, Assignment>)
}