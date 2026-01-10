import { v } from "convex/values"
import type { Infer } from "convex/values"

/**
 * Convex validator for TopicStudentAllowList entries.
 * Controls which students (by student ID) can access specific topics.
 * 
 * @category Validators
 * @since 0.2.0
 */
export const TopicStudentAllowList = v.object({
  topicId: v.id("topics"),
  studentId: v.string(),        // Student ID (not email!)
  note: v.optional(v.string()),
  addedAt: v.number(),
  addedBy: v.string(),          // Teacher's email who added
})

/**
 * TopicStudentAllowList type for per-topic student access control.
 * 
 * @category Types
 * @since 0.2.0
 */
export type TopicStudentAllowList = Readonly<Infer<typeof TopicStudentAllowList>>

/**
 * Creates a new TopicStudentAllowList entry.
 * 
 * @category Constructors
 * @since 0.2.0
 */
export const make = (params: {
  readonly topicId: string
  readonly studentId: string
  readonly addedBy: string
  readonly note?: string
}): TopicStudentAllowList => ({
  topicId: params.topicId as any,
  studentId: params.studentId.trim(),
  note: params.note,
  addedAt: Date.now(),
  addedBy: params.addedBy,
})
