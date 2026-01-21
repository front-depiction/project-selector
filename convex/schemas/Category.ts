import { v } from "convex/values"
import type { Infer } from "convex/values"

/**
 * Convex validator for Category objects.
 *
 * @category Validators
 * @since 0.2.0
 */
export const Category = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  semesterId: v.string(),
  createdAt: v.number(),
  // Criterion type for CP-SAT assignment algorithm
  criterionType: v.optional(v.union(
    v.literal("prerequisite"),
    v.literal("minimize"),
    v.literal("pull")
  )),
  // For prerequisite: minimum ratio (0.0 to 1.0) of students meeting requirement
  minRatio: v.optional(v.number()),
})

/**
 * Category type representing a question category.
 *
 * @category Types
 * @since 0.2.0
 */
export type Category = Readonly<Infer<typeof Category>>

/**
 * Creates a new Category.
 *
 * @category Constructors
 * @since 0.2.0
 * @example
 * import * as Category from "./schemas/Category"
 *
 * const category = Category.make({
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
  readonly criterionType?: "prerequisite" | "minimize" | "pull" | null
  readonly minRatio?: number
}): Category => ({
  name: params.name,
  description: params.description,
  semesterId: params.semesterId,
  createdAt: params.createdAt ?? Date.now(),
  criterionType: params.criterionType ?? undefined,
  minRatio: params.minRatio,
} as const)
