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
}): Category => ({
  name: params.name,
  description: params.description,
  semesterId: params.semesterId,
  createdAt: params.createdAt ?? Date.now(),
} as const)
