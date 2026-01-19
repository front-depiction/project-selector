import { v } from "convex/values"
import type { Infer } from "convex/values"

/**
 * Convex validator for deferred solver jobs.
 */
export const DeferredSolverJob = v.object({
  deferredId: v.string(),
  periodId: v.id("selectionPeriods"),
  solverType: v.union(v.literal("cp-sat"), v.literal("ga")),
  status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
  createdAt: v.number(),
  updatedAt: v.number(),
  completedAt: v.optional(v.number()),
  error: v.optional(v.string()),
  assignmentBatchId: v.optional(v.string()),
  studentIds: v.array(v.string()),
  topicIds: v.array(v.id("topics")),
})

export type DeferredSolverJob = Readonly<Infer<typeof DeferredSolverJob>>
