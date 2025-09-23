import { v } from "convex/values"
import type { Id } from "../_generated/dataModel"

// ============================================================================
// Core Types
// ============================================================================

export interface StudentPreference {
  studentId: string
  topicIds: Id<"topics">[] // Ordered list of topics by preference (first = most preferred)
}

export interface Assignment {
  studentIndex: number
  topicIndex: number
  regret: number
}

export interface AllocationAssignment {
  studentId: string
  topicId: Id<"topics">
  rank: number
  regret: number
}

export interface AllocationStatistics {
  totalRegret: number
  averageRegret: number
  maxRegret: number
  rankDistribution: RankCount[]
}

export interface RankCount {
  rank: number
  count: number
}

export interface ProbabilityMatrix {
  studentIds: string[]
  probabilities: number[][] // [studentIndex][topicIndex] = probability
}

export interface CachedProbability {
  matrix: ProbabilityMatrix
  timestamp: number
}

export type RegretStrategy = "linear" | "squared" | "exponential"

export type AllocationStatus = "pending" | "executing" | "completed" | "cancelled" | "failed"

// ============================================================================
// Convex Validators
// ============================================================================

export const AllocationScheduleValidator = v.object({
  selectionPeriodId: v.id("selectionPeriods"),
  scheduledAt: v.number(),
  executeAt: v.number(),
  status: v.union(
    v.literal("pending"),
    v.literal("executing"),
    v.literal("completed"),
    v.literal("cancelled"),
    v.literal("failed")
  ),
  version: v.number(),
  jobId: v.optional(v.string()),
  error: v.optional(v.string())
})

export const AllocationAssignmentValidator = v.object({
  studentId: v.string(),
  topicId: v.id("topics"),
  rank: v.number(),
  regret: v.number()
})

export const AllocationResultValidator = v.object({
  selectionPeriodId: v.id("selectionPeriods"),
  executedAt: v.number(),
  assignments: v.array(AllocationAssignmentValidator),
  totalRegret: v.number(),
  averageRegret: v.number(),
  maxRegret: v.number(),
  rankDistribution: v.array(v.object({
    rank: v.number(),
    count: v.number()
  })),
  strategy: v.union(v.literal("linear"), v.literal("squared"), v.literal("exponential")),
  computationTimeMs: v.number()
})

export const ProbabilityDistributionValidator = v.object({
  selectionPeriodId: v.id("selectionPeriods"),
  calculatedAt: v.number(),
  studentProbabilities: v.array(v.object({
    studentId: v.string(),
    topicProbabilities: v.array(v.number())
  })),
  simulationRuns: v.number(),
  perturbationLevel: v.number()
})

// ============================================================================
// Error Classes
// ============================================================================

export class AllocationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = "AllocationError"
  }
}

export class SchedulingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = "SchedulingError"
  }
}

// ============================================================================
// Constants
// ============================================================================

export const ALLOCATION_CONSTANTS = {
  DEFAULT_DELAY_MS: 60000, // 1 minute
  MAX_STUDENTS: 500,
  MAX_TOPICS: 50,
  DEFAULT_ITERATIONS: 100,
  DEFAULT_PERTURBATION: 0.1,
  CACHE_TTL_MS: 120000, // 2 minutes
  MAX_RETRIES: 3,
  INFINITY: Number.MAX_SAFE_INTEGER
} as const