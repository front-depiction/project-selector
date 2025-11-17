import { v } from "convex/values"
import type { Infer } from "convex/values"

/**
 * Convex validator for Prerequisite objects.
 * 
 * @category Validators
 * @since 0.1.0
 */
export const Prerequisite = v.object({
  title: v.string(),
  description: v.optional(v.string()),
  requiredValue: v.number()
})

/**
 * Prerequisite type representing a prerequisite requirement.
 * 
 * @category Types
 * @since 0.1.0
 */
export type Prerequisite = Readonly<Infer<typeof Prerequisite>>

/**
 * Creates a new Prerequisite.
 * 
 * @category Constructors
 * @since 0.1.0
 * @example
 * import * as Prerequisite from "./schemas/Prerequisite"
 * 
 * const prereq = Prerequisite.make({
 *   title: "Programming Fundamentals",
 *   description: "Basic programming knowledge required",
 *   requiredValue: 1
 * })
 */
export const make = (params: {
  readonly title: string
  readonly description?: string
  readonly requiredValue: number
}): Prerequisite => ({
  title: params.title,
  description: params.description,
  requiredValue: params.requiredValue
} as const)

/**
 * Checks if a prerequisite is met based on the provided value.
 * 
 * @category Predicates
 * @since 0.1.0
 */
export const isPrereqMet = (value: number) => (prerequisite: Prerequisite): boolean =>
  value === prerequisite.requiredValue