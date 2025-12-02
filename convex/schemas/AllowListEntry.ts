import { v } from "convex/values"
import type { Infer } from "convex/values"

/**
 * Convex validator for AllowListEntry objects.
 * Stores emails that are allowed to access restricted projects.
 * 
 * @category Validators
 * @since 0.2.0
 */
export const AllowListEntry = v.object({
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
 * AllowListEntry type.
 * 
 * @category Types
 * @since 0.2.0
 */
export type AllowListEntry = Readonly<Infer<typeof AllowListEntry>>

/**
 * Creates a new AllowListEntry.
 * 
 * @category Constructors
 * @since 0.2.0
 */
export const make = (params: {
  readonly email: string
  readonly note?: string
  readonly addedBy: string
}): AllowListEntry => ({
  email: params.email.toLowerCase().trim(),
  note: params.note,
  addedAt: Date.now(),
  addedBy: params.addedBy,
})

