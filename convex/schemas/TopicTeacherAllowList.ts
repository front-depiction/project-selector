import { v } from "convex/values"
import type { Infer } from "convex/values"

/**
 * Convex validator for TopicTeacherAllowList entries.
 * Controls which teachers (by email) can manage specific topics.
 * 
 * @category Validators
 * @since 0.2.0
 */
export const TopicTeacherAllowList = v.object({
  topicId: v.id("topics"),
  email: v.string(),            // Teacher's email
  note: v.optional(v.string()),
  addedAt: v.number(),
  addedBy: v.string(),          // Teacher's email who added
})

/**
 * TopicTeacherAllowList type for per-topic teacher collaboration.
 * 
 * @category Types
 * @since 0.2.0
 */
export type TopicTeacherAllowList = Readonly<Infer<typeof TopicTeacherAllowList>>

/**
 * Creates a new TopicTeacherAllowList entry.
 * 
 * @category Constructors
 * @since 0.2.0
 */
export const make = (params: {
  readonly topicId: string
  readonly email: string
  readonly addedBy: string
  readonly note?: string
}): TopicTeacherAllowList => ({
  topicId: params.topicId as any,
  email: params.email.toLowerCase().trim(),
  note: params.note,
  addedAt: Date.now(),
  addedBy: params.addedBy,
})
