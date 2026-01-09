import { v } from "convex/values"
import type { Infer } from "convex/values"

/**
 * Convex validator for Topic objects.
 * 
 * @category Validators
 * @since 0.1.0
 */
export const Topic = v.object({
  title: v.string(),
  description: v.string(),
  semesterId: v.string(),
  isActive: v.boolean(),
  subtopicIds: v.optional(v.array(v.id("subtopics"))),
  requiresAllowList: v.optional(v.boolean())
})

/**
 * Topic type representing a project topic.
 * 
 * @category Types
 * @since 0.1.0
 */
export type Topic = Readonly<Infer<typeof Topic>>

/**
 * Creates a new Topic.
 * 
 * @category Constructors
 * @since 0.1.0
 * @example
 * import * as Topic from "./schemas/Topic"
 * 
 * const topic = Topic.make({
 *   title: "Machine Learning Project",
 *   description: "Build a recommendation system",
 *   semesterId: "2024-spring",
 *   isActive: true
 * })
 */
export const make = (params: {
  readonly title: string
  readonly description: string
  readonly semesterId: string
  readonly isActive?: boolean
  readonly subtopicIds?: ReadonlyArray<string>
}): Topic => ({
  title: params.title,
  description: params.description,
  semesterId: params.semesterId,
  isActive: params.isActive ?? true,
  subtopicIds: params.subtopicIds?.map(id => id as any)
} as const)

/**
 * Activates a topic.
 * 
 * @category Combinators
 * @since 0.1.0
 */
export const activate = (topic: Topic): Topic => ({
  ...topic,
  isActive: true
} as const)

/**
 * Deactivates a topic.
 * 
 * @category Combinators
 * @since 0.1.0
 */
export const deactivate = (topic: Topic): Topic => ({
  ...topic,
  isActive: false
} as const)

/**
 * Checks if a topic belongs to a semester.
 * 
 * @category Predicates
 * @since 0.1.0
 */
export const belongsToSemester = (semesterId: string) => (topic: Topic): boolean =>
  topic.semesterId === semesterId

/**
 * Topic with congestion data.
 * 
 * @category Types
 * @since 0.1.0
 */
export type TopicWithCongestion = Readonly<Topic & {
  readonly studentCount: number
  readonly congestionRatio: number
  readonly likelihoodCategory: "low" | "moderate" | "high" | "very-high"
}>

/**
 * Adds congestion data to a topic.
 * 
 * @category Combinators
 * @since 0.1.0
 */
export const withCongestion = (
  topic: Topic,
  congestionData: {
    readonly studentCount: number
    readonly congestionRatio: number
    readonly likelihoodCategory: "low" | "moderate" | "high" | "very-high"
  }
): TopicWithCongestion => ({
  ...topic,
  ...congestionData
} as const)