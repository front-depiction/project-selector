import { v } from "convex/values"
import type { Infer } from "convex/values"

/**
 * Convex validator for Subtopic objects.
 * 
 * @category Validators
 * @since 0.1.0
 */
export const Subtopic = v.object({
  title: v.string(),
  description: v.string()
})

/**
 * Subtopic type representing a subtopic of a main topic.
 * 
 * @category Types
 * @since 0.1.0
 */
export type Subtopic = Readonly<Infer<typeof Subtopic>>

/**
 * Creates a new Subtopic.
 * 
 * @category Constructors
 * @since 0.1.0
 * @example
 * import * as Subtopic from "./schemas/Subtopic"
 * 
 * const subtopic = Subtopic.make({
 *   title: "Neural Networks",
 *   description: "Deep learning architectures and training"
 * })
 */
export const make = (params: {
  readonly title: string
  readonly description: string
}): Subtopic => ({
  title: params.title,
  description: params.description
} as const)