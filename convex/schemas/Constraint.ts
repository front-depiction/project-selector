import { v } from "convex/values"
import type { Infer } from "convex/values"

/**
 * Convex validator for Constraint objects.
 *
 * @category Validators
 * @since 0.2.0
 */
export const Constraint = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  semesterId: v.string(),
  createdAt: v.number(),
  // Criterion type for CP-SAT assignment algorithm
  criterionType: v.optional(v.union(
    v.literal("prerequisite"),
    v.literal("minimize"),
    v.literal("pull"),
    v.literal("maximize"),
    v.literal("push")
  )),
  // For prerequisite: minimum ratio (0.0 to 1.0) of students meeting requirement (legacy)
  minRatio: v.optional(v.number()),
  // For prerequisite: minimum number of students with this trait per group
  minStudents: v.optional(v.number()),
  // For maximize: maximum number of students with this trait per group
  maxStudents: v.optional(v.number()),
})

/**
 * Constraint type representing a question constraint.
 *
 * @category Types
 * @since 0.2.0
 */
export type Constraint = Readonly<Infer<typeof Constraint>>

/**
 * Creates a new Constraint.
 *
 * @category Constructors
 * @since 0.2.0
 * @example
 * import * as Constraint from "./schemas/Constraint"
 *
 * const constraint = Constraint.make({
 *   name: "Technical Skills",
 *   description: "Questions about technical abilities",
 *   semesterId: "2024-spring"
 * })
 */
export const make = (params: {
  readonly name: string
  readonly description?: string
  readonly semesterId: string
  readonly createdAt?: number
  readonly criterionType?: "prerequisite" | "minimize" | "pull" | "maximize" | "push" | null
  readonly minRatio?: number
  readonly minStudents?: number
  readonly maxStudents?: number
}): Constraint => ({
  name: params.name,
  description: params.description,
  semesterId: params.semesterId,
  createdAt: params.createdAt ?? Date.now(),
  criterionType: params.criterionType ?? undefined,
  minRatio: params.minRatio,
  minStudents: params.minStudents,
  maxStudents: params.maxStudents,
} as const)
