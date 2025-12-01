import { v } from "convex/values"
import type { Infer } from "convex/values"

/**
 * Convex validator for QuestionTemplate objects.
 *
 * @category Validators
 * @since 0.1.0
 */
export const QuestionTemplate = v.object({
  title: v.string(),
  description: v.optional(v.string()),
  semesterId: v.string(),
  createdAt: v.number(),
})

/**
 * QuestionTemplate type representing a questionnaire template.
 *
 * @category Types
 * @since 0.1.0
 */
export type QuestionTemplate = Readonly<Infer<typeof QuestionTemplate>>

/**
 * Creates a new QuestionTemplate.
 *
 * @category Constructors
 * @since 0.1.0
 * @example
 * import * as QuestionTemplate from "./schemas/QuestionTemplate"
 *
 * const template = QuestionTemplate.make({
 *   title: "Course Feedback Survey",
 *   description: "End of semester feedback",
 *   semesterId: "semester_123"
 * })
 */
export const make = (params: {
  readonly title: string
  readonly description?: string
  readonly semesterId: string
}): QuestionTemplate => ({
  title: params.title,
  description: params.description,
  semesterId: params.semesterId,
  createdAt: Date.now(),
} as const)
