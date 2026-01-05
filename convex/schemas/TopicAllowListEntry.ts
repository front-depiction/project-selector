import { v } from "convex/values"
import type { Infer } from "convex/values"

/**
 * Convex validator for TopicAllowListEntry objects.
 * Stores emails that are allowed to access a specific restricted topic.
 * 
 * @category Validators
 * @since 0.3.0
 */
export const TopicAllowListEntry = v.object({
  // The topic this allow-list entry belongs to
  topicId: v.id("topics"),
  // Email address that is allowed
  email: v.string(),
  // Optional note/comment about this entry (e.g., "CS101 Student")
  note: v.optional(v.string()),
  // When this entry was added
  addedAt: v.number(),
  // Who added this entry (admin email or "system")
  addedBy: v.string(),
})

/**
 * TopicAllowListEntry type.
 * 
 * @category Types
 * @since 0.3.0
 */
export type TopicAllowListEntry = Readonly<Infer<typeof TopicAllowListEntry>>

/**
 * Creates a new TopicAllowListEntry.
 * 
 * @category Constructors
 * @since 0.3.0
 */
export const make = (params: {
  readonly topicId: string
  readonly email: string
  readonly note?: string
  readonly addedBy: string
}): TopicAllowListEntry => ({
  topicId: params.topicId as any,
  email: params.email.toLowerCase().trim(),
  note: params.note,
  addedAt: Date.now(),
  addedBy: params.addedBy,
})

