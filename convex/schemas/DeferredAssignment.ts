import { v } from "convex/values"
import type { Infer } from "convex/values"
import type { Id } from "../_generated/dataModel"

const CriterionConfig = v.object({
  type: v.string(),
  min_ratio: v.optional(v.number())
})

const GroupCriteria = v.record(v.string(), v.array(CriterionConfig))

const Group = v.object({
  id: v.number(),
  size: v.number(),
  criteria: GroupCriteria
})

const SolverRequest = v.object({
  num_students: v.number(),
  num_groups: v.number(),
  groups: v.array(Group),
  exclude: v.array(v.array(v.number())),
  ranking_percentage: v.optional(v.number()),
  max_time_in_seconds: v.optional(v.number())
})

const DeferredAssignmentBase = {
  status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
  createdAt: v.number(),
  updatedAt: v.number(),
  evaluationId: v.optional(v.string()),
  data: v.optional(v.any()),
  dataHash: v.optional(v.string()),
  error: v.optional(v.string())
}

/**
 * Convex validator for deferred assignment records.
 *
 * @category Validators
 * @since 0.3.0
 */
export const DeferredAssignment = v.union(
  v.object({
    kind: v.literal("cpsat"),
    periodId: v.id("selectionPeriods"),
    request: SolverRequest,
    ...DeferredAssignmentBase
  }),
  v.object({
    kind: v.literal("ga"),
    periodId: v.id("selectionPeriods"),
    request: SolverRequest,
    ...DeferredAssignmentBase
  })
)

/**
 * Deferred assignment type.
 *
 * @category Types
 * @since 0.3.0
 */
export type DeferredAssignment = Readonly<Infer<typeof DeferredAssignment>>

/**
 * Creates a pending deferred assignment.
 *
 * @category Constructors
 * @since 0.3.0
 */
export const makePending = (params: {
  readonly kind: "cpsat" | "ga"
  readonly periodId: Id<"selectionPeriods">
  readonly request: Infer<typeof SolverRequest>
  readonly createdAt: number
}): DeferredAssignment => ({
  kind: params.kind,
  periodId: params.periodId,
  request: params.request,
  status: "pending",
  createdAt: params.createdAt,
  updatedAt: params.createdAt
} as const)
